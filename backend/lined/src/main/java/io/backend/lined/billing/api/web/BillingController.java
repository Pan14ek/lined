package io.backend.lined.billing.api.web;

import io.backend.lined.billing.api.web.dto.BillingLimitsDto;
import io.backend.lined.billing.api.web.dto.BillingMeDto;
import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.entitlement.application.EntitlementService;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Web API for the billing state of the authenticated principal.
 *
 * <p>The controller never accepts a user ID in a path, query, or request body. For example,
 * {@code GET /api/billing/me} with {@code X-User-Id: 17} returns account 17's state even when a
 * caller appends {@code ?userId=18}.</p>
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Tag(name = "Billing", description = "Authenticated billing state")
public class BillingController {

  private final BillingAccountService billingAccountService;
  private final EffectivePlanResolver effectivePlanResolver;
  private final EntitlementService entitlementService;

  /**
   * Returns the current caller's effective plan and lobby limits.
   *
   * <p>For example, {@code GET /api/billing/me} with {@code X-User-Id: 17} returns the personal
   * billing account owned by user 17, the implicit {@code FREE} plan when no paid subscription
   * exists, {@code subscription: null}, and Free limits. A missing identity header is rejected
   * as {@code 400 Bad Request} by the shared exception handler.</p>
   *
   * @param currentUserId authenticated MVP principal from {@code X-User-Id}
   * @return stable billing-state response for that principal only
   */
  @GetMapping("/me")
  @Operation(summary = "Get my billing state",
      description = "Derives billing state from X-User-Id and never accepts a user ID parameter.",
      responses = {
          @ApiResponse(responseCode = "200", description = "Billing state returned"),
          @ApiResponse(responseCode = "400", description = "X-User-Id header is missing or invalid")
      })
  public BillingMeDto me(
      @Parameter(description = "Authenticated MVP user identifier", example = "17")
      @RequestHeader("X-User-Id") Long currentUserId) {
    BillingAccountEntity account = billingAccountService.getByOwnerUserId(currentUserId);
    PlanCode effectivePlan = effectivePlanResolver.resolve(account.getId(), Instant.now());
    PlanEntitlements entitlements = entitlementService.getEntitlements(effectivePlan);
    return new BillingMeDto(account.getId(), effectivePlan, null, BillingLimitsDto.from(entitlements));
  }
}
