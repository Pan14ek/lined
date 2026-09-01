package io.backend.lined.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.service.LinedUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SecurityConfigAuthenticationTest {

  private static final String IDENTIFIER = "alice@example.com";
  private static final String PASSWORD = "correct-password";

  @Mock
  private UserDetailsService userDetailsService;

  private AuthenticationManager authenticationManager;
  private PasswordEncoder passwordEncoder;

  @BeforeEach
  void setUp() {
    SecurityConfig securityConfig = new SecurityConfig();
    passwordEncoder = new BCryptPasswordEncoder(4);
    authenticationManager = securityConfig.authenticationManager(
        securityConfig.daoAuthenticationProvider(userDetailsService, passwordEncoder));
  }

  @Test
  void authenticationManager_authenticatesLinedPrincipalWithCorrectPassword() {
    LinedUserPrincipal principal = new LinedUserPrincipal(42L, "alice",
        passwordEncoder.encode(PASSWORD));
    when(userDetailsService.loadUserByUsername(IDENTIFIER)).thenReturn(principal);

    Authentication result = authenticationManager.authenticate(
        UsernamePasswordAuthenticationToken.unauthenticated(IDENTIFIER, PASSWORD));

    assertThat(result.isAuthenticated()).isTrue();
    assertThat(result.getPrincipal()).isSameAs(principal);
  }

  @Test
  void authenticationManager_hidesUnknownIdentifierAsBadCredentials() {
    when(userDetailsService.loadUserByUsername(IDENTIFIER))
        .thenThrow(new UsernameNotFoundException("User not found"));

    assertThatThrownBy(() -> authenticationManager.authenticate(
        UsernamePasswordAuthenticationToken.unauthenticated(IDENTIFIER, PASSWORD)))
        .isInstanceOf(BadCredentialsException.class);
  }

  @Test
  void authenticationManager_rejectsWrongPasswordAsBadCredentials() {
    LinedUserPrincipal principal = new LinedUserPrincipal(42L, "alice",
        passwordEncoder.encode(PASSWORD));
    when(userDetailsService.loadUserByUsername(IDENTIFIER)).thenReturn(principal);

    assertThatThrownBy(() -> authenticationManager.authenticate(
        UsernamePasswordAuthenticationToken.unauthenticated(IDENTIFIER, "wrong-password")))
        .isInstanceOf(BadCredentialsException.class);
  }
}
