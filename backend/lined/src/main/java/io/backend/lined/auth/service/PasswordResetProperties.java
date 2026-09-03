package io.backend.lined.auth.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** External secret configuration used to hash password-reset credentials. */
@Validated
@ConfigurationProperties("lined.auth")
public class PasswordResetProperties {

  @NotBlank
  @Size(min = 32)
  private String resetTokenSecret;

  public String getResetTokenSecret() {
    return resetTokenSecret;
  }

  public void setResetTokenSecret(String resetTokenSecret) {
    this.resetTokenSecret = resetTokenSecret;
  }
}
