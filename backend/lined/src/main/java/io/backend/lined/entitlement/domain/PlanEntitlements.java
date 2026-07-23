package io.backend.lined.entitlement.domain;

/**
 * Immutable capability and usage-limit matrix for one effective product plan.
 *
 * <p>For example, the Free matrix is {@code new PlanEntitlements(1, 4, false, true, true)}:
 * its owner may create one lobby containing at most four members, cannot integrate a calendar,
 * and can use reminders and free-slot detection. The record centralizes product limits so callers
 * do not duplicate plan-specific conditionals.</p>
 *
 * @param lobbiesMax maximum number of lobbies an account owner may own
 * @param lobbyMembersMax maximum number of members allowed in one owned lobby
 * @param calendarIntegrationEnabled whether external calendar integration is available
 * @param remindersEnabled whether reminders are available
 * @param freeSlotDetectionEnabled whether free-slot detection is available
 */
public record PlanEntitlements(
    int lobbiesMax,
    int lobbyMembersMax,
    boolean calendarIntegrationEnabled,
    boolean remindersEnabled,
    boolean freeSlotDetectionEnabled) {
}
