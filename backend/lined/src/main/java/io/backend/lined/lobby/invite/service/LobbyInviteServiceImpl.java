package io.backend.lined.lobby.invite.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import io.backend.lined.lobby.invite.api.LobbyInviteMapper;
import io.backend.lined.lobby.invite.domain.LobbyInviteEntity;
import io.backend.lined.lobby.invite.domain.LobbyInviteRepository;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Transactional implementation of the lobby-invitation lifecycle.
 * The class-level transaction keeps lazy lobby relationships available while
 * mapping responses and makes invite acceptance plus membership insertion atomic.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class LobbyInviteServiceImpl implements LobbyInviteService {

  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final LobbyInviteRepository inviteRepo;
  private final LobbyInviteMapper mapper;
  private final LobbyAccessPolicy accessPolicy;
  private final EntityManager entityManager;

  @Override
  public LobbyInviteDto create(
      Long lobbyId, Long inviteeId, String inviteeEmail, Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    var invitee = resolveInvitee(inviteeId, inviteeEmail);
    ensureNotMember(lobby, invitee.getId());
    ensureNoPendingInvite(lobbyId, invitee.getId());

    var invite = LobbyInviteEntity.builder()
        .lobby(lobby)
        .inviter(lobby.getOwner())
        .invitee(invitee)
        .status(LobbyInviteStatus.PENDING)
        .build();
    return mapper.toDto(inviteRepo.save(invite));
  }

  @Override
  public List<LobbyInviteDto> pendingForLobby(Long lobbyId, Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    return inviteRepo.findAllByLobby_IdAndStatusOrderBySentAtDesc(lobbyId, LobbyInviteStatus.PENDING)
        .stream().map(mapper::toDto).toList();
  }

  @Override
  public List<LobbyInviteDto> pendingForInvitee(Long inviteeId) {
    return inviteRepo.findAllByInvitee_IdAndStatusOrderBySentAtDesc(
        inviteeId, LobbyInviteStatus.PENDING).stream().map(mapper::toDto).toList();
  }

  @Override
  public LobbyInviteDto resend(Long lobbyId, Long inviteId, Long requesterId) {
    var invite = ownerInvite(lobbyId, inviteId, requesterId);
    requirePending(invite);
    var now = OffsetDateTime.now();
    invite.setSentAt(now);
    invite.setUpdatedAt(now);
    return mapper.toDto(invite);
  }

  @Override
  public LobbyInviteDto cancel(Long lobbyId, Long inviteId, Long requesterId) {
    var invite = ownerInvite(lobbyId, inviteId, requesterId);
    transition(invite, LobbyInviteStatus.CANCELLED);
    return mapper.toDto(invite);
  }

  @Override
  public LobbyInviteDto accept(Long inviteId, Long requesterId) {
    var invite = inviteForInvitee(inviteId, requesterId);
    if (invite.getStatus() == LobbyInviteStatus.ACCEPTED) {
      return mapper.toDto(invite);
    }
    requirePending(invite);
    ensureNotMember(invite.getLobby(), requesterId);

    var now = OffsetDateTime.now();
    int claimed = inviteRepo.acceptPending(inviteId, requesterId, now);
    if (claimed == 0) {
      return resolveConcurrentAcceptance(inviteId);
    }

    invite.getLobby().getMembers().add(invite.getInvitee());
    invite.setStatus(LobbyInviteStatus.ACCEPTED);
    invite.setUpdatedAt(now);
    return mapper.toDto(invite);
  }

  @Override
  public LobbyInviteDto decline(Long inviteId, Long requesterId) {
    var invite = inviteForInvitee(inviteId, requesterId);
    transition(invite, LobbyInviteStatus.DECLINED);
    return mapper.toDto(invite);
  }

  private LobbyInviteEntity ownerInvite(Long lobbyId, Long inviteId, Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureOwner(lobby, requesterId);
    var invite = mustInvite(inviteId);
    if (!invite.getLobby().getId().equals(lobbyId)) {
      throw new NotFoundException("Lobby invite %d not found".formatted(inviteId));
    }
    return invite;
  }

  private LobbyInviteEntity inviteForInvitee(Long inviteId, Long requesterId) {
    var invite = mustInvite(inviteId);
    if (!invite.getInvitee().getId().equals(requesterId)) {
      throw new ForbiddenException("Only the invited user can respond to this invite");
    }
    return invite;
  }

  private void ensureNoPendingInvite(Long lobbyId, Long inviteeId) {
    if (inviteRepo.findByLobby_IdAndInvitee_IdAndStatus(
        lobbyId, inviteeId, LobbyInviteStatus.PENDING).isPresent()) {
      throw new ConflictException("User already has a pending lobby invite");
    }
  }

  private void ensureNotMember(LobbyEntity lobby, Long userId) {
    boolean isMember = lobby.getMembers().stream().anyMatch(member -> member.getId().equals(userId));
    if (isMember) {
      throw new ConflictException("User is already a lobby member");
    }
  }

  private void requirePending(LobbyInviteEntity invite) {
    if (invite.getStatus() != LobbyInviteStatus.PENDING) {
      throw new ConflictException("Lobby invite is no longer pending");
    }
  }

  private void transition(LobbyInviteEntity invite, LobbyInviteStatus status) {
    requirePending(invite);
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    if (inviteRepo.transitionPending(invite.getId(), status, now) == 0) {
      throw new ConflictException("Lobby invite is no longer pending");
    }
    invite.setStatus(status);
    invite.setUpdatedAt(now);
  }

  private LobbyInviteDto resolveConcurrentAcceptance(Long inviteId) {
    entityManager.clear();
    var latestInvite = mustInvite(inviteId);
    if (latestInvite.getStatus() == LobbyInviteStatus.ACCEPTED) {
      return mapper.toDto(latestInvite);
    }
    throw new ConflictException("Lobby invite is no longer pending");
  }

  private UserEntity resolveInvitee(Long inviteeId, String inviteeEmail) {
    boolean hasUserId = inviteeId != null;
    boolean hasEmail = inviteeEmail != null && !inviteeEmail.isBlank();
    if (hasUserId == hasEmail) {
      throw new BadRequestException("Provide exactly one of userId or userEmail");
    }
    if (hasUserId) {
      return mustUser(inviteeId);
    }
    return EntityFinder.findOrThrow(userRepo.findByEmailIgnoreCase(inviteeEmail),
        () -> new NotFoundException("User with email %s not found".formatted(inviteeEmail)));
  }

  private LobbyEntity mustLobby(Long lobbyId) {
    return EntityFinder.findOrThrow(lobbyRepo.findById(lobbyId),
        () -> new NotFoundException("Lobby %d not found".formatted(lobbyId)));
  }

  private UserEntity mustUser(Long userId) {
    return EntityFinder.findOrThrow(userRepo.findById(userId),
        () -> new NotFoundException("User %d not found".formatted(userId)));
  }

  private LobbyInviteEntity mustInvite(Long inviteId) {
    return EntityFinder.findOrThrow(inviteRepo.findById(inviteId),
        () -> new NotFoundException("Lobby invite %d not found".formatted(inviteId)));
  }
}
