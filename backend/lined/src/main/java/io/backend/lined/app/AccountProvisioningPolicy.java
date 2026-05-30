package io.backend.lined.app;

import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AccountProvisioningPolicy {

  @Value("${lined.provisioning.default-role:ROLE_USER}")
  private String defaultRole;

  @Value("${lined.provisioning.default-plan:FREE}")
  private String defaultPlan;

  @Value("${lined.provisioning.default-subscription-active:true}")
  private boolean subscriptionActive;

  public Set<String> defaultRoles() {
    return Set.of(defaultRole);
  }

  public String defaultPlanName() {
    return defaultPlan;
  }

  public boolean defaultSubscriptionActive() {
    return subscriptionActive;
  }
}
