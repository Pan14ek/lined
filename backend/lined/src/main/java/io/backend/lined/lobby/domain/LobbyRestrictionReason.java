package io.backend.lined.lobby.domain;

/**
 * Records why a lobby has restricted access rather than inferring the reason from plan state.
 *
 * <p>For example, a downgrade that leaves an owner with too many lobbies uses
 * {@link #OWNER_PLAN_LIMIT_EXCEEDED}; an over-capacity lobby uses
 * {@link #MEMBER_LIMIT_EXCEEDED}. {@link #NONE} accompanies an unrestricted lobby.</p>
 */
public enum LobbyRestrictionReason {
  /** No billing or membership restriction applies. */
  NONE,
  /** The owner exceeds the number of lobbies allowed by the effective plan. */
  OWNER_PLAN_LIMIT_EXCEEDED,
  /** The lobby has more members than its effective plan permits. */
  MEMBER_LIMIT_EXCEEDED,
  /** The billing grace period ended before the resource was brought within limits. */
  BILLING_GRACE_EXPIRED
}
