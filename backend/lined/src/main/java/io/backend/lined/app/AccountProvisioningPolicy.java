package io.backend.lined.app;

import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AccountProvisioningPolicy {

  private static final String DEFAULT_ROLE_NAME = "ROLE_USER";
  private static final String DEFAULT_PLAN_NAME = "FREE";

  public Set<String> defaultRoles() {
    return Set.of(DEFAULT_ROLE_NAME);
  }

  public String defaultPlanName() {
    return DEFAULT_PLAN_NAME;
  }

  public boolean defaultSubscriptionActive() {
    return true;
  }
}
