package io.backend.lined.entitlement.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.plan.PlanCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EntitlementServiceTest {

  private static final long BILLING_ACCOUNT_ID = 17L;

  @Mock
  private EffectivePlanResolver effectivePlanResolver;

  @InjectMocks
  private EntitlementService entitlementService;

  @Test
  void getEntitlements_returnsFreeMatrix_whenEffectivePlanIsFree() {
    when(effectivePlanResolver.resolve(eq(BILLING_ACCOUNT_ID), any()))
        .thenReturn(PlanCode.FREE);

    assertThat(entitlementService.getEntitlements(BILLING_ACCOUNT_ID))
        .isEqualTo(EntitlementService.FREE);
  }

  @Test
  void getEntitlements_returnsProMatrix_whenEffectivePlanIsPro() {
    when(effectivePlanResolver.resolve(eq(BILLING_ACCOUNT_ID), any()))
        .thenReturn(PlanCode.PRO);

    assertThat(entitlementService.getEntitlements(BILLING_ACCOUNT_ID))
        .isEqualTo(EntitlementService.PRO);
  }

  @Test
  void getEntitlements_returnsMatrixForAlreadyResolvedPlan() {
    assertThat(entitlementService.getEntitlements(PlanCode.FREE))
        .isEqualTo(EntitlementService.FREE);
  }
}
