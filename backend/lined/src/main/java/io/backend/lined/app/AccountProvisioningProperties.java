package io.backend.lined.app;

import io.backend.lined.plan.domain.BuiltInPlan;
import io.backend.lined.role.domain.BuiltInRole;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("lined.provisioning")
public record AccountProvisioningProperties(
    String defaultRole,
    String defaultPlan,
    Boolean defaultSubscriptionActive
) {

  public AccountProvisioningProperties {
    if (defaultRole == null || defaultRole.isBlank()) {
      defaultRole = BuiltInRole.USER.value();
    } else {
      defaultRole = defaultRole.trim();
    }
    if (defaultPlan == null || defaultPlan.isBlank()) {
      defaultPlan = BuiltInPlan.FREE.value();
    } else {
      defaultPlan = defaultPlan.trim();
    }
    if (defaultSubscriptionActive == null) {
      defaultSubscriptionActive = true;
    }
  }
}
