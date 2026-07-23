package io.backend.lined.billing.domain.plan;

/**
 * Product plan codes used by billing and entitlement decisions.
 *
 * <p>{@link #FREE} is the implicit fallback when no valid paid subscription exists. For example,
 * a current paid period resolves to {@link #PRO}; an expired or absent paid period resolves to
 * {@code FREE}.</p>
 */
public enum PlanCode {
  FREE,
  PRO
}
