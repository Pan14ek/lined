package io.backend.lined.app;

import java.util.Set;

/**
 * Immutable registration defaults that are independent of billing catalog persistence.
 *
 * <p>For example, {@code new AccountProvisioningSpec(Set.of("ROLE_USER"))} assigns the standard
 * user role while the billing account independently resolves implicit Free access.</p>
 */
public record AccountProvisioningSpec(Set<String> roleNames) {

  public AccountProvisioningSpec {
    roleNames = roleNames == null ? Set.of() : Set.copyOf(roleNames);
  }
}
