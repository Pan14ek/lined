package io.backend.lined.auth.service;

import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Authenticated Lined account data required by password authentication and token issuance.
 */
public final class LinedUserPrincipal implements UserDetails {

  private final long userId;
  private final String username;
  private final String password;

  public LinedUserPrincipal(long userId, String username, String password) {
    this.userId = userId;
    this.username = username;
    this.password = password;
  }

  public long getUserId() {
    return userId;
  }

  @Override
  public List<GrantedAuthority> getAuthorities() {
    return List.of();
  }

  @Override
  public String getPassword() {
    return password;
  }

  @Override
  public String getUsername() {
    return username;
  }
}
