package io.backend.lined.app;

import io.backend.lined.role.domain.BuiltInRole;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("lined.provisioning")
public record AccountProvisioningProperties(
    String defaultRole
) {

  public AccountProvisioningProperties {
    if (defaultRole == null || defaultRole.isBlank()) {
      defaultRole = BuiltInRole.USER.value();
    } else {
      defaultRole = defaultRole.trim();
    }
  }
}
