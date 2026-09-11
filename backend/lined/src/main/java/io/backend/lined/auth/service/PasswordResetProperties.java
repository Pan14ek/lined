package io.backend.lined.auth.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** External secret configuration used to hash password-reset credentials. */
@Validated
@ConfigurationProperties("lined.auth")
public class PasswordResetProperties {

  @NotBlank
  @Size(min = 32)
  private String resetTokenSecret;

  private Duration tokenTtl = Duration.ofMinutes(30);

  public String getResetTokenSecret() {
    return resetTokenSecret;
  }

  public void setResetTokenSecret(String resetTokenSecret) {
    this.resetTokenSecret = resetTokenSecret;
  }

  public Duration getTokenTtl() {
    return tokenTtl;
  }

  public void setTokenTtl(Duration tokenTtl) {
    this.tokenTtl = tokenTtl;
  }

  @AssertTrue(message = "tokenTtl must be positive")
  boolean hasPositiveTokenTtl() {
    return tokenTtl != null && !tokenTtl.isZero() && !tokenTtl.isNegative();
  }
}
