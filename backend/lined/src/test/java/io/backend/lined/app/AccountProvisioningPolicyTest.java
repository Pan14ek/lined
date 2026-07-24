package io.backend.lined.app;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.role.domain.BuiltInRole;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AccountProvisioningPolicyTest {

  private static final String USER_ROLE = BuiltInRole.USER.value();
  private static final String ADMIN_ROLE = BuiltInRole.ADMIN.value();
  private static final String PADDED_ADMIN_ROLE = " " + ADMIN_ROLE + " ";

  @Test
  void defaultRegistration_returnsBuiltInDefaults() {
    AccountProvisioningPolicy policy =
        new AccountProvisioningPolicy(new AccountProvisioningProperties(null));

    AccountProvisioningSpec result = policy.defaultRegistration();

    assertThat(result.roleNames()).isEqualTo(Set.of(USER_ROLE));
  }

  @Test
  void defaultRegistration_returnsConfiguredValues() {
    AccountProvisioningPolicy policy = new AccountProvisioningPolicy(
        new AccountProvisioningProperties(PADDED_ADMIN_ROLE));

    AccountProvisioningSpec result = policy.defaultRegistration();

    assertThat(result.roleNames()).isEqualTo(Set.of(ADMIN_ROLE));
  }
}
