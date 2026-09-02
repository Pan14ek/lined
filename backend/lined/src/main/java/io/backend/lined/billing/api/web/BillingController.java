package io.backend.lined.billing.api.web;

import io.backend.lined.billing.api.web.dto.BillingLimitsDto;
import io.backend.lined.billing.api.web.dto.BillingMeDto;
import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.entitlement.application.EntitlementService;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import io.backend.lined.featureflag.api.FeatureRequired;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Web API for the billing state of the authenticated principal.
 *
 * <p>The controller never accepts a user ID in a path, query, or request body. Caller identity
 * comes from the authenticated Spring Security context.</p>
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Tag(name = "Billing", description = "Authenticated billing state")
public class BillingController {

  private final BillingAccountService billingAccountService;
  private final EffectivePlanResolver effectivePlanResolver;
  private final EntitlementService entitlementService;
  private final CurrentUserProvider currentUserProvider;

  /**
   * Returns the current caller's effective plan and lobby limits.
   *
   * <p>For example, an authenticated {@code GET /api/billing/me} returns the personal billing
   * account owned by the JWT subject, the implicit {@code FREE} plan when no paid subscription
   * exists, {@code subscription: null}, and Free limits.</p>
   *
   * @return stable billing-state response for that principal only
   */
  @GetMapping("/me")
  @FeatureRequired(FeatureFlagKey.SUBSCRIPTIONS)
  @Operation(summary = "Get my billing state",
      description = "Derives billing state from the authenticated principal and never accepts a user ID parameter.",
      responses = {
          @ApiResponse(responseCode = "200", description = "Billing state returned"),
          @ApiResponse(responseCode = "401", description = "Authentication is required")
      })
  public BillingMeDto me() {
    BillingAccountEntity account = billingAccountService.getByOwnerUserId(
        currentUserProvider.requireUserId());
    PlanCode effectivePlan = effectivePlanResolver.resolve(account.getId(), Instant.now());
    PlanEntitlements entitlements = entitlementService.getEntitlements(effectivePlan);
    return new BillingMeDto(account.getId(), effectivePlan, null, BillingLimitsDto.from(entitlements));
  }
}
