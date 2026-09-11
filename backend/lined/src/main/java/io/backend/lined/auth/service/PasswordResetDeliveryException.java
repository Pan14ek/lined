package io.backend.lined.auth.service;

/** Safe internal failure used to keep SMTP diagnostics out of public reset responses. */
public class PasswordResetDeliveryException extends RuntimeException {

  public PasswordResetDeliveryException(Throwable cause) {
    super("Password reset delivery failed", cause);
  }
}
