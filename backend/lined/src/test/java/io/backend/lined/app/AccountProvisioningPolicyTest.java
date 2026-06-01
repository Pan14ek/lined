package io.backend.lined.app;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.plan.domain.BuiltInPlan;
import io.backend.lined.role.domain.BuiltInRole;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AccountProvisioningPolicyTest {

  private static final String USER_ROLE = BuiltInRole.USER.value();
  private static final String ADMIN_ROLE = BuiltInRole.ADMIN.value();
  private static final String FREE_PLAN_NAME = BuiltInPlan.FREE.value();
  private static final String STARTER_PLAN_NAME = "STARTER";
  private static final String PADDED_ADMIN_ROLE = " " + ADMIN_ROLE + " ";
  private static final String PADDED_STARTER_PLAN_NAME = " " + STARTER_PLAN_NAME + " ";

  @Test
  void defaultRegistration_returnsBuiltInDefaults() {
    AccountProvisioningPolicy policy =
        new AccountProvisioningPolicy(new AccountProvisioningProperties(null, null, null));

    AccountProvisioningSpec result = policy.defaultRegistration();

    assertThat(result.roleNames()).isEqualTo(Set.of(USER_ROLE));
    assertThat(result.planName()).isEqualTo(FREE_PLAN_NAME);
    assertThat(result.activeSubscription()).isTrue();
  }

  @Test
  void defaultRegistration_returnsConfiguredValues() {
    AccountProvisioningPolicy policy = new AccountProvisioningPolicy(
        new AccountProvisioningProperties(PADDED_ADMIN_ROLE, PADDED_STARTER_PLAN_NAME, false));

    AccountProvisioningSpec result = policy.defaultRegistration();

    assertThat(result.roleNames()).isEqualTo(Set.of(ADMIN_ROLE));
    assertThat(result.planName()).isEqualTo(STARTER_PLAN_NAME);
    assertThat(result.activeSubscription()).isFalse();
  }
}
