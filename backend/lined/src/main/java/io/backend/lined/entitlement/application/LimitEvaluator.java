package io.backend.lined.entitlement.application;

import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Guards lobby writes against the limits of the owning billing account's effective plan.
 *
 * <p>For example, before a Free user creates a second lobby, the evaluator compares an owned
 * lobby count of {@code 1} with the Free maximum of {@code 1} and raises
 * {@code LOBBY_LIMIT_EXCEEDED}. It similarly prevents accepting a fifth member into a Free-owned
 * lobby. This class evaluates limits only; lifecycle and downgrade handling remain later tasks.</p>
 */
@Service
@RequiredArgsConstructor
public class LimitEvaluator {

  private static final String LOBBY_LIMIT_EXCEEDED = "LOBBY_LIMIT_EXCEEDED";
  private static final String LOBBY_MEMBER_LIMIT_EXCEEDED = "LOBBY_MEMBER_LIMIT_EXCEEDED";

  private final LobbyRepository lobbyRepository;
  private final BillingAccountService billingAccountService;
  private final EntitlementService entitlementService;

  /**
   * Ensures that an owner may create one additional lobby.
   *
   * <p>For example, a Free owner with zero lobbies passes this check; once the count is one, the
   * next create request fails with a {@code ConflictException} whose code is
   * {@code LOBBY_LIMIT_EXCEEDED}.</p>
   *
   * @param ownerUserId identifier of the user who will own the new lobby
   * @throws ConflictException when the owner already reached the effective-plan lobby limit
   */
  public void assertCanCreateLobby(Long ownerUserId) {
    var entitlements = entitlementsForOwner(ownerUserId);
    if (lobbyRepository.countByOwner_Id(ownerUserId) >= entitlements.lobbiesMax()) {
      throw new ConflictException(LOBBY_LIMIT_EXCEEDED, "Lobby limit exceeded for current plan");
    }
  }

  /**
   * Ensures that the specified lobby may accept one additional member.
   *
   * <p>For example, a Free-owned lobby with four members fails this check with
   * {@code LOBBY_MEMBER_LIMIT_EXCEEDED}; a lobby with three members passes and may accept its
   * fourth member.</p>
   *
   * @param lobbyId identifier of the lobby receiving the invited member
   * @throws NotFoundException when {@code lobbyId} does not identify a lobby
   * @throws ConflictException when the lobby already reached its owner's member limit
   */
  public void assertCanAcceptInvite(Long lobbyId) {
    LobbyEntity lobby = EntityFinder.findOrThrow(lobbyRepository.findById(lobbyId),
        () -> new NotFoundException("Lobby %d not found".formatted(lobbyId)));
    var entitlements = entitlementsForOwner(lobby.getOwner().getId());
    if (lobbyRepository.countMembersByLobbyId(lobbyId) >= entitlements.lobbyMembersMax()) {
      throw new ConflictException(
          LOBBY_MEMBER_LIMIT_EXCEEDED, "Lobby member limit exceeded for current plan");
    }
  }

  private PlanEntitlements entitlementsForOwner(Long ownerUserId) {
    Long accountId = billingAccountService.getByOwnerUserId(ownerUserId).getId();
    return entitlementService.getEntitlements(accountId);
  }
}
