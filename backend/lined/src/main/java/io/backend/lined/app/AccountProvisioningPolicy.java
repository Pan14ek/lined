package io.backend.lined.app;

import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AccountProvisioningPolicy {

  private final AccountProvisioningProperties properties;

  public AccountProvisioningSpec defaultRegistration() {
    return new AccountProvisioningSpec(
        Set.of(properties.defaultRole()),
        properties.defaultPlan(),
        properties.defaultSubscriptionActive());
  }
}
