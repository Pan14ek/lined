package io.backend.lined.event.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.event.service.EventService;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EventControllerTest {

  @Mock
  private EventService service;

  private EventController controller;
  private OffsetDateTime start;
  private OffsetDateTime end;

  @BeforeEach
  void setUp() {
    controller = new EventController(service);
    start = OffsetDateTime.parse("2026-01-01T10:00:00Z");
    end = start.plusHours(1);
  }

  @Test
  void findConflicts_usesCurrentUserHeaderAsRequester() {
    when(service.findConflicts(101L, start, end, 1L)).thenReturn(List.of());

    var response = controller.findConflicts(101L, start, end, 1L, 1L);

    assertThat(response.getBody()).isEmpty();
    verify(service).findConflicts(101L, start, end, 1L);
  }

  @Test
  void findConflicts_throwsForbidden_whenRequesterParamDoesNotMatchHeader() {
    assertThatThrownBy(() -> controller.findConflicts(101L, start, end, 2L, 1L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Requester id must match current user");

    verify(service, never()).findConflicts(101L, start, end, 1L);
  }

  @Test
  void hasConflict_usesCurrentUserHeaderAsRequester() {
    var result = new UserConflictDto(1L, false, null);
    when(service.hasConflict(1L, start, end, 1L)).thenReturn(result);

    var response = controller.hasConflict(1L, start, end, 1L, 1L);

    assertThat(response.getBody()).isEqualTo(result);
    verify(service).hasConflict(1L, start, end, 1L);
  }

  @Test
  void hasConflict_throwsForbidden_whenRequesterParamDoesNotMatchHeader() {
    assertThatThrownBy(() -> controller.hasConflict(2L, start, end, 2L, 1L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Requester id must match current user");

    verify(service, never()).hasConflict(2L, start, end, 1L);
  }
}
