package io.backend.lined.security;

import io.backend.lined.common.exception.UnauthorizedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Resolves the current Lined user from Spring Security's authenticated request context.
 */
@Component
public class SpringSecurityCurrentUserProvider implements CurrentUserProvider {

  private static final String INVALID_IDENTITY_MESSAGE =
      "Authenticated user identity is missing or invalid";

  @Override
  public long requireUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()
        || authentication instanceof AnonymousAuthenticationToken) {
      throw unauthorized();
    }

    return parseUserId(subject(authentication));
  }

  private String subject(Authentication authentication) {
    if (authentication.getPrincipal() instanceof Jwt jwt) {
      return jwt.getSubject();
    }
    return authentication.getName();
  }

  private long parseUserId(String subject) {
    if (subject == null || subject.isBlank()) {
      throw unauthorized();
    }

    try {
      long userId = Long.parseLong(subject);
      if (userId <= 0) {
        throw unauthorized();
      }
      return userId;
    } catch (NumberFormatException ex) {
      throw unauthorized();
    }
  }

  private UnauthorizedException unauthorized() {
    return new UnauthorizedException(INVALID_IDENTITY_MESSAGE);
  }
}
