package io.backend.lined.auth.service;

/** Outbound delivery port for one password-reset message. */
public interface PasswordResetDelivery {

  /** Sends a reset message without exposing provider details to the caller. */
  void deliver(PasswordResetDeliveryRequest request);
}
