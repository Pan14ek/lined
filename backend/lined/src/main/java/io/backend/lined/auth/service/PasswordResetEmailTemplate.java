package io.backend.lined.auth.service;

import org.springframework.stereotype.Component;

/** Composes the provider-neutral plain-text and HTML password-reset message bodies. */
@Component
public class PasswordResetEmailTemplate {

  public String text(PasswordResetDeliveryRequest request) {
    return "Lined password reset\n\n"
        + "A password reset was requested for your Lined account.\n\n"
        + "Reset your password: " + request.resetUrl() + "\n\n"
        + "This link expires in " + expiryText(request) + ". If you did not request this, "
        + "you can safely ignore this email.\n";
  }

  public String html(PasswordResetDeliveryRequest request) {
    String url = escape(request.resetUrl());
    return "<html><body><h1>Lined</h1>"
        + "<p>A password reset was requested for your Lined account.</p>"
        + "<p><a href=\"" + url + "\">Reset your password</a></p>"
        + "<p>Fallback URL: " + url + "</p>"
        + "<p>This link expires in " + expiryText(request) + ". If you did not request this, "
        + "you can safely ignore this email.</p></body></html>";
  }

  private String expiryText(PasswordResetDeliveryRequest request) {
    return request.tokenTtl().toMinutes() + " minutes";
  }

  private String escape(String value) {
    return value.replace("&", "&amp;").replace("\"", "&quot;")
        .replace("<", "&lt;").replace(">", "&gt;");
  }
}
