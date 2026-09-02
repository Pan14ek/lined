package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class RefreshTokenGeneratorTest {

  private final RefreshTokenGenerator generator = new RefreshTokenGenerator();

  @Test
  void generate_returnsDistinctBase64UrlCredentialsWith256BitsOfEntropy() {
    String first = generator.generate();
    String second = generator.generate();

    assertThat(first).doesNotContain("=", "+", "/");
    assertThat(Base64.getUrlDecoder().decode(first)).hasSize(32);
    assertThat(second).isNotEqualTo(first);
    assertThat(Base64.getUrlDecoder().decode(second)).hasSize(32);
  }
}
