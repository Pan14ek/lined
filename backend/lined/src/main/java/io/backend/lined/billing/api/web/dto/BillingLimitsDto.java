package io.backend.lined.billing.api.web.dto;

import io.backend.lined.entitlement.domain.PlanEntitlements;

/**
 * Lobby limits exposed with the authenticated caller's billing state.
 *
 * <p>For example, a Free response contains {@code {"lobbiesMax":1,
 * "lobbyMembersMax":4}}. Capability flags remain internal until a client needs them as a stable
 * public contract.</p>
 *
 * @param lobbiesMax maximum lobbies the caller may own
 * @param lobbyMembersMax maximum members permitted in one owned lobby
 */
public record BillingLimitsDto(int lobbiesMax, int lobbyMembersMax) {

  /**
   * Converts an internal entitlement matrix into the limits exposed by this endpoint.
   *
   * <p>For example, {@code from(EntitlementService.FREE)} returns a DTO with values {@code 1}
   * and {@code 4}; it never exposes provider or pricing details.</p>
   *
   * @param entitlements immutable plan limits selected for the authenticated account
   * @return public lobby-limit view
   */
  public static BillingLimitsDto from(PlanEntitlements entitlements) {
    return new BillingLimitsDto(entitlements.lobbiesMax(), entitlements.lobbyMembersMax());
  }
}
