package io.backend.lined.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordResetTokenCodecTest {

  @Test
  void generate_returnsHighEntropyUrlSafeTokenAndHashIsNotRawValue() {
    PasswordResetProperties properties = new PasswordResetProperties();
    properties.setResetTokenSecret("01234567890123456789012345678901");
    PasswordResetTokenCodec codec = new PasswordResetTokenCodec(properties);

    String rawToken = codec.generate();

    assertThat(rawToken).hasSize(43).matches("[A-Za-z0-9_-]+");
    assertThat(codec.hash(rawToken)).isNotEqualTo(rawToken).hasSize(43);
  }
}
