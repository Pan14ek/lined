package io.backend.lined.app;

import java.util.Set;

public record AccountProvisioningSpec(
    Set<String> roleNames,
    String planName,
    boolean activeSubscription
) {

  public AccountProvisioningSpec {
    roleNames = roleNames == null ? Set.of() : Set.copyOf(roleNames);
  }
}
