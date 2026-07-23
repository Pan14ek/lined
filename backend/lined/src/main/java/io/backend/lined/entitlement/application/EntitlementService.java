package io.backend.lined.entitlement.application;

import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolves the product capabilities that apply to a billing account at the current instant.
 *
 * <p>The version-controlled matrices are the sole source for plan limits. For example, when
 * {@link EffectivePlanResolver} reports {@link PlanCode#FREE},
 * {@code getEntitlements(17L)} returns {@link #FREE}; when it reports {@link PlanCode#PRO}, the
 * same call returns {@link #PRO}. Future plans require one explicit matrix entry.</p>
 */
@Service
@RequiredArgsConstructor
public class EntitlementService {

  /** Free-plan limits and capabilities: one lobby with up to four members. */
  public static final PlanEntitlements FREE = new PlanEntitlements(1, 4, false, true, true);
  /** Pro-plan limits and capabilities: ten lobbies with up to twenty members each. */
  public static final PlanEntitlements PRO = new PlanEntitlements(10, 20, true, true, true);

  private static final Map<PlanCode, PlanEntitlements> ENTITLEMENTS_BY_PLAN = Map.of(
      PlanCode.FREE, FREE,
      PlanCode.PRO, PRO);

  private final EffectivePlanResolver effectivePlanResolver;

  /**
   * Returns the matrix for the billing account's currently effective plan.
   *
   * <p>For example, an account without a current paid subscription resolves to the implicit Free
   * plan and receives {@code lobbiesMax() == 1}. The instant is obtained here so product callers
   * cannot accidentally evaluate one request against inconsistent plan state.</p>
   *
   * @param billingAccountId identifier of the commercial account being evaluated
   * @return immutable entitlement matrix for the effective Free or Pro plan
   */
  public PlanEntitlements getEntitlements(Long billingAccountId) {
    PlanCode planCode = effectivePlanResolver.resolve(billingAccountId, Instant.now());
    return ENTITLEMENTS_BY_PLAN.get(planCode);
  }
}
