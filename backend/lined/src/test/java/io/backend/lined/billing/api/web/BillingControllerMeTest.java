package io.backend.lined.billing.api.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.entitlement.application.EntitlementService;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class BillingControllerMeTest {

  private static final long USER_ID = 17L;
  private static final long BILLING_ACCOUNT_ID = 31L;

  @Mock
  private BillingAccountService billingAccountService;
  @Mock
  private EffectivePlanResolver effectivePlanResolver;
  @Mock
  private EntitlementService entitlementService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new BillingController(
        billingAccountService, effectivePlanResolver, entitlementService))
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  void me_returnsImplicitFreePlanAndLimitsForAuthenticatedUser() throws Exception {
    stubFreeBillingState();

    mockMvc.perform(get("/api/billing/me").header("X-User-Id", USER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.billingAccountId").value(BILLING_ACCOUNT_ID))
        .andExpect(jsonPath("$.effectivePlan").value("FREE"))
        .andExpect(jsonPath("$.subscription").value(nullValue()))
        .andExpect(jsonPath("$.limits.lobbiesMax").value(1))
        .andExpect(jsonPath("$.limits.lobbyMembersMax").value(4));

    verify(billingAccountService).getByOwnerUserId(USER_ID);
    verify(effectivePlanResolver).resolve(eq(BILLING_ACCOUNT_ID), any());
    verify(entitlementService).getEntitlements(PlanCode.FREE);
  }

  @Test
  void me_rejectsMissingUserHeaderWithBadRequest() throws Exception {
    mockMvc.perform(get("/api/billing/me"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(billingAccountService, effectivePlanResolver, entitlementService);
  }

  @Test
  void me_ignoresSuppliedUserIdQueryParameter() throws Exception {
    stubFreeBillingState();

    mockMvc.perform(get("/api/billing/me").param("userId", "99").header("X-User-Id", USER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.billingAccountId").value(BILLING_ACCOUNT_ID));

    verify(billingAccountService).getByOwnerUserId(USER_ID);
  }

  private void stubFreeBillingState() {
    BillingAccountEntity account = BillingAccountEntity.builder().id(BILLING_ACCOUNT_ID).build();
    when(billingAccountService.getByOwnerUserId(USER_ID)).thenReturn(account);
    when(effectivePlanResolver.resolve(eq(BILLING_ACCOUNT_ID), any())).thenReturn(PlanCode.FREE);
    when(entitlementService.getEntitlements(PlanCode.FREE))
        .thenReturn(new PlanEntitlements(1, 4, false, true, true));
  }
}
