package io.backend.lined.lobby.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.entitlement.application.LimitEvaluator;
import io.backend.lined.entitlement.application.EntitlementService;
import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyMapper;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyAccessMode;
import io.backend.lined.lobby.domain.LobbyLifecycleStatus;
import io.backend.lined.lobby.domain.LobbyRestrictionReason;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class LobbyServiceImpl implements LobbyService {

  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final LobbyMapper mapper;
  private final LobbyAccessPolicy accessPolicy;
  private final LobbyWritePolicy writePolicy;
  private final LimitEvaluator limitEvaluator;
  private final BillingAccountService billingAccountService;
  private final EntitlementService entitlementService;

  @Override
  /**
   * Creates a lobby after enforcing the authenticated owner's plan limit.
   *
   * <p>For example, a Free user who owns no lobbies can create {@code "Our Family"}; a Free
   * user who already owns one receives {@code LOBBY_LIMIT_EXCEEDED} before any new lobby is
   * persisted. Owner lookup remains first so an unknown user still receives the existing 404.</p>
   *
   * @param dto requested lobby name and type
   * @param ownerId authenticated identifier of the prospective owner
   * @return the persisted lobby with the owner added as its first member
   */
  public LobbyDto create(LobbyCreateDto dto, Long ownerId) {
    var owner = EntityFinder.findOrThrow(userRepo.findById(ownerId),
        () -> new NotFoundException("Owner %d not found".formatted(ownerId)));
    limitEvaluator.assertCanCreateLobby(ownerId);

    var entity = LobbyEntity.builder()
        .name(dto.name())
        .lobbyType(dto.lobbyType())
        .owner(owner)
        .build();

    entity.getMembers().add(owner);

    var saved = lobbyRepo.save(entity);
    return mapper.toDto(saved);
  }

  @Override
  public LobbyDto getById(Long id) {
    var lobby = mustLobby(id);
    return mapper.toDto(lobby);
  }

  @Override
  public LobbyDto getById(Long id, Long requesterId) {
    var lobby = mustLobby(id);
    accessPolicy.ensureMember(lobby, requesterId);
    return mapper.toDto(lobby);
  }

  @Override
  public List<LobbyDto> myLobbies(Long userId) {
    var list = lobbyRepo.findAllByMemberId(userId);
    return list.stream().map(mapper::toDto).toList();
  }

  /**
   * Lists archived lobbies visible to the authenticated owner or member.
   *
   * <p>For example, a former member can still view an archived lobby they belong to, while an
   * unrelated user cannot discover it through this endpoint.</p>
   *
   * @param userId authenticated caller identifier
   * @return archived lobbies accessible to the caller
   */
  @Override
  public List<LobbyDto> archivedLobbies(Long userId) {
    return lobbyRepo.findAccessibleByLifecycleStatus(LobbyLifecycleStatus.ARCHIVED, userId)
        .stream().map(mapper::toDto).toList();
  }

  /**
   * Selects an owner's compliant Free-plan lobby and clears any old selection.
   *
   * <p>For example, a Free owner may select a four-member lobby after downgrading. The method
   * restores write access on that lobby and clears a previous selection, ensuring one owner has
   * one selected Free lobby even if old data contains a stale selection.</p>
   *
   * @param lobbyId target lobby identifier
   * @param requesterId authenticated owner identifier
   * @return target lobby with write access and a current Free-selection timestamp
   * @throws ConflictException when the effective plan is not Free or the member limit is exceeded
   */
  @Override
  public LobbyDto selectAsFree(Long lobbyId, Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    assertFreePlan(requesterId);
    if (lobby.getMembers().size() > 4) {
      throw new ConflictException("LOBBY_MEMBER_LIMIT_EXCEEDED",
          "Remove members before selecting this lobby as the Free lobby");
    }
    clearPreviousFreeSelection(requesterId);
    applyFreeSelection(lobby);
    return mapper.toDto(lobby);
  }

  /**
   * Restores an archived lobby after enforcing the owner's current active-lobby capacity.
   *
   * <p>For example, an archived lobby becomes active and writable when the owner has spare
   * capacity. A restore request for an already active lobby is rejected rather than silently
   * changing the lifecycle state.</p>
   *
   * @param lobbyId archived lobby identifier
   * @param requesterId authenticated owner identifier
   * @return lobby in the active, read-write state
   * @throws ConflictException when the lobby is not archived or capacity is unavailable
   */
  @Override
  public LobbyDto restore(Long lobbyId, Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    if (lobby.getLifecycleStatus() != LobbyLifecycleStatus.ARCHIVED) {
      throw new ConflictException("Only archived lobbies can be restored");
    }
    limitEvaluator.assertCanRestoreLobby(requesterId);
    lobby.setLifecycleStatus(LobbyLifecycleStatus.ACTIVE);
    lobby.setAccessMode(LobbyAccessMode.READ_WRITE);
    lobby.setRestrictionReason(LobbyRestrictionReason.NONE);
    lobby.setArchiveAt(null);
    return mapper.toDto(lobby);
  }

  @Override
  public LobbyDto update(Long lobbyId, LobbyUpdateDto dto, Long requesterId, long expectedVersion) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.UPDATE_LOBBY);
    verifyVersion(lobby.getVersion(), expectedVersion);

    if (dto.name() != null) {
      lobby.setName(dto.name());
    }
    if (dto.lobbyType() != null) {
      lobby.setLobbyType(dto.lobbyType());
    }
    if (dto.ownerId() != null) {
      transferOwnership(lobby, dto.ownerId());
    }
    if (expectedVersion >= 0) {
      lobbyRepo.saveAndFlush(lobby);
    }
    return mapper.toDto(lobby);
  }

  @Override
  public LobbyDto removeMember(Long lobbyId, Long userIdToRemove, Long requesterId,
                               long expectedVersion) {
    var lobby = mustLobby(lobbyId);

    accessPolicy.ensureOwner(lobby, requesterId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.REMOVE_MEMBER);
    verifyVersion(lobby.getVersion(), expectedVersion);

    if (lobby.getOwner().getId().equals(userIdToRemove)) {
      throw new BadRequestException("Owner cannot be removed from lobby");
    }

    lobby.getMembers().removeIf(u -> u.getId().equals(userIdToRemove));
    if (expectedVersion >= 0) {
      lobbyRepo.saveAndFlush(lobby);
    }
    return mapper.toDto(lobby);
  }

  @Override
  public void delete(Long lobbyId, Long requesterId, long expectedVersion) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.DELETE_LOBBY);
    verifyVersion(lobby.getVersion(), expectedVersion);
    lobbyRepo.delete(lobby);
    if (expectedVersion >= 0) {
      lobbyRepo.flush();
    }
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(
        lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  private void verifyVersion(long actualVersion, long expectedVersion) {
    if (expectedVersion >= 0) {
      VersionPrecondition.verify(actualVersion, expectedVersion);
    }
  }

  private void transferOwnership(LobbyEntity lobby, Long newOwnerId) {
    var newOwner = lobby.getMembers().stream()
        .filter(member -> member.getId().equals(newOwnerId))
        .findFirst()
        .orElseThrow(() -> new ConflictException("New owner must be a lobby member"));
    lobby.setOwner(newOwner);
  }

  /**
   * Ensures the owner's current entitlement matrix represents the Free plan.
   *
   * <p>For example, an account whose matrix allows ten lobbies is Pro and cannot choose a
   * Free-plan survivor; it receives {@code LOBBY_LIMIT_EXCEEDED} before lobby state changes.</p>
   *
   * @param ownerUserId owner whose billing account is resolved
   * @throws ConflictException when the owner has a non-Free entitlement matrix
   */
  private void assertFreePlan(Long ownerUserId) {
    Long accountId = billingAccountService.getByOwnerUserId(ownerUserId).getId();
    if (entitlementService.getEntitlements(accountId).lobbiesMax() != 1) {
      throw new ConflictException("LOBBY_LIMIT_EXCEEDED",
          "Only a Free-plan owner can select a Free lobby");
    }
  }

  /**
   * Clears all prior Free selections for the owner before assigning a new one.
   *
   * <p>For example, corrupted legacy data containing two timestamps is repaired in the same
   * transaction: both timestamps are cleared, then the target receives the sole selection.</p>
   *
   * @param ownerUserId identifier of the owner changing their selection
   */
  private void clearPreviousFreeSelection(Long ownerUserId) {
    lobbyRepo.findAllByOwner_IdAndSelectedAsFreeAtIsNotNull(ownerUserId)
        .forEach(previous -> previous.setSelectedAsFreeAt(null));
  }

  /**
   * Makes the chosen lobby writable and records it as the owner's current Free selection.
   *
   * <p>For example, a previously read-only lobby loses its plan-limit reason and archive deadline
   * when it becomes the one selected resource retained under the Free entitlement.</p>
   *
   * @param lobby lobby selected as Free after ownership and capacity validation
   */
  private void applyFreeSelection(LobbyEntity lobby) {
    lobby.setAccessMode(LobbyAccessMode.READ_WRITE);
    lobby.setRestrictionReason(LobbyRestrictionReason.NONE);
    lobby.setSelectedAsFreeAt(OffsetDateTime.now(ZoneOffset.UTC));
    lobby.setArchiveAt(null);
  }

}
