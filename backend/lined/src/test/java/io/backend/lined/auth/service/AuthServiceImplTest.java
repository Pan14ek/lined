package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.api.AuthLoginDto;
import java.time.OffsetDateTime;
import java.util.UUID;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.InvalidCredentialsException;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

  private static final long USER_ID = 1L;
  private static final String EMAIL = "alice@example.com";
  private static final String PASSWORD = "password";
  private static final String TOKEN = "token";

  @Mock
  private AuthenticationManager authenticationManager;
  @Mock
  private JwtTokenService tokenService;
  @Mock
  private RefreshSessionService refreshSessionService;

  private AuthServiceImpl authService;

  @BeforeEach
  void setUp() {
    authService = new AuthServiceImpl(authenticationManager, tokenService, refreshSessionService);
  }

  @Test
  void login_returnsTokenForAuthenticatedLinedPrincipal() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    var principal = new LinedUserPrincipal(USER_ID, "alice", "encoded");
    var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null,
        principal.getAuthorities());
    when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any())).thenReturn(authentication);
    when(tokenService.issueFor(USER_ID)).thenReturn(TOKEN);
    when(tokenService.tokenType()).thenReturn("Bearer");
    when(tokenService.ttlSeconds()).thenReturn(900L);
    when(refreshSessionService.createSession(USER_ID)).thenReturn(new IssuedRefreshSession(
        UUID.randomUUID(), "refresh-token", OffsetDateTime.now()));

    AuthLoginResult result = authService.login(request);
    var response = result.response();

    assertThat(response.accessToken()).isEqualTo(TOKEN);
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.expiresIn()).isEqualTo(900L);
    assertThat(result.refreshToken()).isEqualTo("refresh-token");
    assertThat(result.toString()).doesNotContain(TOKEN, "refresh-token");

    ArgumentCaptor<UsernamePasswordAuthenticationToken> authenticationCaptor =
        ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
    verify(authenticationManager).authenticate(authenticationCaptor.capture());
    assertThat(authenticationCaptor.getValue().getName()).isEqualTo(EMAIL);
    assertThat(authenticationCaptor.getValue().getCredentials()).isEqualTo(PASSWORD);
  }

  @Test
  void refresh_issuesAccessTokenForRotatedSessionUser() {
    OffsetDateTime expiresAt = OffsetDateTime.parse("2026-09-09T10:15:30Z");
    when(refreshSessionService.refresh("refresh-token")).thenReturn(
        new RotatedRefreshSession(USER_ID, "successor-token", expiresAt));
    when(tokenService.issueFor(USER_ID)).thenReturn(TOKEN);
    when(tokenService.tokenType()).thenReturn("Bearer");
    when(tokenService.ttlSeconds()).thenReturn(900L);

    AuthLoginResult result = authService.refresh("refresh-token");

    assertThat(result.response().accessToken()).isEqualTo(TOKEN);
    assertThat(result.refreshToken()).isEqualTo("successor-token");
    assertThat(result.refreshTokenExpiresAt()).isEqualTo(expiresAt);
  }

  @Test
  void logout_delegatesRefreshCredentialRevocation() {
    authService.logout("refresh-token");

    verify(refreshSessionService).logout("refresh-token");
  }

  @Test
  void login_throwsGenericCredentialError_whenAuthenticationFails() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
        .thenThrow(new BadCredentialsException("Bad credentials"));

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(InvalidCredentialsException.class)
        .hasMessage("Invalid email, username, or password.");

    verifyNoInteractions(tokenService, refreshSessionService);
  }

  @Test
  void login_propagatesAuthenticationServiceFailure() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
        .thenThrow(new AuthenticationServiceException("User repository unavailable"));

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(AuthenticationServiceException.class)
        .hasMessage("User repository unavailable");

    verifyNoInteractions(tokenService, refreshSessionService);
  }

  @Test
  void login_rejectsUnexpectedAuthenticatedPrincipalAsServiceFailure() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any()))
        .thenReturn(UsernamePasswordAuthenticationToken.authenticated("alice", null,
            java.util.List.of()));

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(AuthenticationServiceException.class);

    verifyNoInteractions(tokenService, refreshSessionService);
  }

  @Test
  void login_throwsBadRequest_whenIdentifierMissing() {
    var request = new AuthLoginDto(" ", null, null, PASSWORD);

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("identifier is required");

    verifyNoInteractions(authenticationManager, tokenService, refreshSessionService);
  }
}
