package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.api.AuthLoginDto;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.UnauthorizedException;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

  private static final long USER_ID = 1L;
  private static final String USERNAME = "alice";
  private static final String EMAIL = "alice@example.com";
  private static final String PASSWORD = "password";
  private static final String ENCODED_PASSWORD = "encoded";
  private static final String TOKEN = "token";

  @Mock
  private UserRepository userRepository;
  @Mock
  private UserMapper userMapper;
  @Mock
  private PasswordEncoder passwordEncoder;
  @Mock
  private JwtTokenService tokenService;

  private AuthServiceImpl authService;
  private UserEntity user;
  private UserDto userDto;

  @BeforeEach
  void setUp() {
    authService = new AuthServiceImpl(userRepository, userMapper, passwordEncoder, tokenService);
    user = new UserEntity();
    user.setId(USER_ID);
    user.setUsername(USERNAME);
    user.setEmail(EMAIL);
    user.setPassword(ENCODED_PASSWORD);
    userDto = new UserDto(USER_ID, USERNAME, EMAIL, null, Set.of("ROLE_USER"), null, null);
  }

  @Test
  void login_successWithEmail_returnsVerifiedIdentity() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
    when(userMapper.toDto(user)).thenReturn(userDto);
    when(tokenService.issueFor(USER_ID)).thenReturn(TOKEN);
    when(tokenService.tokenType()).thenReturn("Bearer");
    when(tokenService.ttlSeconds()).thenReturn(900L);

    var response = authService.login(request);

    assertThat(response.accessToken()).isEqualTo(TOKEN);
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.expiresIn()).isEqualTo(900L);
    assertThat(response.userId()).isEqualTo(USER_ID);
    assertThat(response.username()).isEqualTo(USERNAME);
    assertThat(response.email()).isEqualTo(EMAIL);
    assertThat(response.roles()).containsExactly("ROLE_USER");
  }

  @Test
  void login_successWithUsername_whenEmailLookupMisses() {
    var request = new AuthLoginDto(USERNAME, null, null, PASSWORD);
    when(userRepository.findByEmailIgnoreCase(USERNAME)).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
    when(userMapper.toDto(user)).thenReturn(userDto);
    when(tokenService.issueFor(USER_ID)).thenReturn(TOKEN);
    when(tokenService.tokenType()).thenReturn("Bearer");
    when(tokenService.ttlSeconds()).thenReturn(900L);

    var response = authService.login(request);

    assertThat(response.userId()).isEqualTo(USER_ID);
    verify(userRepository).findByUsernameIgnoreCase(USERNAME);
  }

  @Test
  void login_throwsUnauthorized_whenUserMissing() {
    var request = new AuthLoginDto("missing@example.com", null, null, PASSWORD);
    when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
    when(userRepository.findByUsernameIgnoreCase("missing@example.com"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(UnauthorizedException.class)
        .hasMessageContaining("Invalid email, username, or password");

    verify(passwordEncoder, never()).matches(PASSWORD, ENCODED_PASSWORD);
  }

  @Test
  void login_throwsUnauthorized_whenPasswordDoesNotMatch() {
    var request = new AuthLoginDto(EMAIL, null, null, PASSWORD);
    when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(UnauthorizedException.class)
        .hasMessageContaining("Invalid email, username, or password");

    verify(tokenService, never()).issueFor(USER_ID);
  }

  @Test
  void login_throwsBadRequest_whenIdentifierMissing() {
    var request = new AuthLoginDto(" ", null, null, PASSWORD);

    assertThatThrownBy(() -> authService.login(request))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("identifier is required");

    verify(userRepository, never()).findByEmailIgnoreCase(" ");
  }
}
