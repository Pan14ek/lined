package io.backend.lined.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class EntityFinderTest {

  @Test
  void findOrThrow_shouldReturnValue_whenOptionalIsPresent() {
    String expected = "test-value";
    Optional<String> optional = Optional.of(expected);

    String result = EntityFinder.findOrThrow(optional, () -> new RuntimeException("not found"));

    assertThat(result).isEqualTo(expected);
  }

  @Test
  void findOrThrow_shouldThrowException_whenOptionalIsEmpty() {
    Optional<String> optional = Optional.empty();

    assertThatThrownBy(() ->
        EntityFinder.findOrThrow(optional, () -> new RuntimeException("not found")))
        .isInstanceOf(RuntimeException.class)
        .hasMessage("not found");
  }

  @Test
  void findOrThrow_shouldThrowExactExceptionType_whenOptionalIsEmpty() {
    Optional<String> optional = Optional.empty();

    assertThatThrownBy(() ->
        EntityFinder.findOrThrow(optional, () -> new IllegalArgumentException("bad id")))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("bad id");
  }

  @Test
  void findOrThrow_shouldReturnCorrectEntity_whenOptionalContainsObject() {
    Long expected = 42L;
    Optional<Long> optional = Optional.of(expected);

    Long result = EntityFinder.findOrThrow(optional, () -> new RuntimeException("not found"));

    assertThat(result).isEqualTo(expected);
  }

  @Test
  void findOrThrow_shouldUseSupplierMessage_whenOptionalIsEmpty() {
    String errorMessage = "Entity with id 99 not found";
    Optional<String> optional = Optional.empty();

    assertThatThrownBy(() ->
        EntityFinder.findOrThrow(optional, () -> new RuntimeException(errorMessage)))
        .hasMessage(errorMessage);
  }
}
