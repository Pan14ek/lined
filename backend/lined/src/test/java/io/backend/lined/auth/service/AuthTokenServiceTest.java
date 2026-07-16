package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.user.domain.UserEntity;
import org.junit.jupiter.api.Test;

class AuthTokenServiceTest {

  @Test
  void issueFor_returnsSignedBearerCompatibleToken() {
    var service = new AuthTokenService("test-secret", 3600L);
    var user = new UserEntity();
    user.setId(42L);

    String token = service.issueFor(user);

    assertThat(token).contains(".");
    assertThat(token.split("\\.")).hasSize(2);
    assertThat(service.tokenType()).isEqualTo("Bearer");
    assertThat(service.ttlSeconds()).isEqualTo(3600L);
  }
}
