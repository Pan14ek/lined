package io.backend.lined.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.auth.service.AuthService;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  @Mock
  private AuthService authService;

  private AuthController controller;

  @BeforeEach
  void setUp() {
    controller = new AuthController(authService);
  }

  @Test
  void login_delegatesToAuthService() {
    var request = new AuthLoginDto("alice@example.com", null, null, "password");
    var response = new AuthLoginResponseDto(
        "token", "Bearer", 3600L, 1L, "alice", "alice@example.com", Set.of("ROLE_USER"));
    when(authService.login(request)).thenReturn(response);

    AuthLoginResponseDto result = controller.login(request);

    assertThat(result).isEqualTo(response);
    verify(authService).login(request);
  }
}
