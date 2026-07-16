package io.backend.lined.event.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class EventLocationValidationTest {

  private static Validator validator;

  @BeforeAll
  static void setUpValidator() {
    validator = Validation.buildDefaultValidatorFactory().getValidator();
  }

  @Test
  void create_rejectsLocationLongerThan255Characters() {
    var dto = new EventCreateDto("Dinner together", "a".repeat(256), true,
        OffsetDateTime.parse("2026-01-01T10:00:00Z"),
        OffsetDateTime.parse("2026-01-01T12:00:00Z"), "Europe/Kyiv", 101L);

    assertThat(validator.validate(dto))
        .extracting(violation -> violation.getPropertyPath().toString())
        .contains("location");
  }

  @Test
  void update_rejectsLocationLongerThan255Characters() {
    var dto = new EventUpdateDto(null, "a".repeat(256), null, null, null, null);

    assertThat(validator.validate(dto))
        .extracting(violation -> violation.getPropertyPath().toString())
        .contains("location");
  }

}
