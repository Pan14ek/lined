package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateLimitKeyFactoryTest {

  private RateLimitKeyFactory factory;

  @BeforeEach
  void setUp() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setKeySecret("test-rate-limit-key-secret-with-at-least-32-bytes");
    factory = new RateLimitKeyFactory(properties);
  }

  @Test
  void identifierKey_isStableAcrossCaseAndWhitespaceWithoutPlaintext() {
    String first = factory.identifierKey(" Alice@Example.com ");
    String second = factory.identifierKey("alice@example.com");

    assertThat(first).isEqualTo(second);
    assertThat(first).doesNotContain("alice", "example.com");
  }

  @Test
  void normalizeIdentifier_rejectsUnboundedInput() {
    assertThat(factory.normalizeIdentifier(" ")).isNull();
    assertThat(factory.normalizeIdentifier("x".repeat(256))).isNull();
  }
}
