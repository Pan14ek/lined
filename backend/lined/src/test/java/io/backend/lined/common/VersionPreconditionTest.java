package io.backend.lined.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.PreconditionRequiredException;
import org.junit.jupiter.api.Test;

class VersionPreconditionTest {

  @Test
  void parse_returnsQuotedVersion() {
    assertThat(VersionPrecondition.parse("\"12\"")).isEqualTo(12L);
  }

  @Test
  void parse_rejectsMissingAndMalformedValues() {
    assertThatThrownBy(() -> VersionPrecondition.parse(null))
        .isInstanceOf(PreconditionRequiredException.class);
    assertThatThrownBy(() -> VersionPrecondition.parse("12"))
        .isInstanceOf(BadRequestException.class);
  }

  @Test
  void verify_rejectsStaleVersion() {
    assertThatThrownBy(() -> VersionPrecondition.verify(2L, 1L))
        .isInstanceOf(ConflictException.class);
  }
}
