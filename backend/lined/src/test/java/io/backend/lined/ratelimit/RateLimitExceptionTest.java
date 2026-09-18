package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class RateLimitExceptionTest {

  @Test
  void exceededExceptionClampsRetryDelayAndExposesContract() {
    RateLimitExceededException exception = new RateLimitExceededException(0);

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    assertThat(exception.getCode()).isEqualTo("rate_limit.exceeded");
    assertThat(exception.getRetryAfterSeconds()).isEqualTo(1);
  }

  @Test
  void unavailableExceptionExposesContract() {
    RateLimitUnavailableException exception = new RateLimitUnavailableException();

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    assertThat(exception.getCode()).isEqualTo("rate_limit.unavailable");
  }

  @Test
  void storageExceptionPreservesCause() {
    IllegalStateException cause = new IllegalStateException("capacity");

    RateLimitStorageException exception = new RateLimitStorageException("storage", cause);

    assertThat(exception).hasMessage("storage").hasCause(cause);
  }
}
