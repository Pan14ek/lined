package io.backend.lined.entitlement.domain;

/**
 * Names the plan capabilities represented by {@link PlanEntitlements}.
 *
 * <p>For example, a UI can use {@link #LOBBIES_MAX} to describe the limit that produced a
 * {@code LOBBY_LIMIT_EXCEEDED} response, while {@link #CALENDAR_INTEGRATION_ENABLED} identifies
 * the independent calendar-integration capability.</p>
 */
public enum EntitlementCode {
  /** Maximum number of lobbies an account owner may own. */
  LOBBIES_MAX,
  /** Maximum number of members permitted in one owned lobby. */
  LOBBY_MEMBERS_MAX,
  /** Availability of external calendar integration. */
  CALENDAR_INTEGRATION_ENABLED,
  /** Availability of reminder notifications. */
  REMINDERS_ENABLED,
  /** Availability of free-slot detection. */
  FREE_SLOT_DETECTION_ENABLED
}
