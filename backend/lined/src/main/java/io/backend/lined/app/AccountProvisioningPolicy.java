package io.backend.lined.app;

import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
/**
 * Supplies the role-only defaults used while registering an account.
 *
 * <p>For example, a registration with no configuration receives {@code ROLE_USER}; billing
 * account creation now represents implicit Free access instead of provisioning a legacy plan row.</p>
 */
public class AccountProvisioningPolicy {

  private final AccountProvisioningProperties properties;

  /**
   * Returns the roles that every newly registered user receives.
   *
   * <p>For example, the default configuration produces {@code [ROLE_USER]}, regardless of roles
   * supplied in a registration payload.</p>
   *
   * @return immutable registration role defaults
   */
  public AccountProvisioningSpec defaultRegistration() {
    return new AccountProvisioningSpec(Set.of(properties.defaultRole()));
  }
}
