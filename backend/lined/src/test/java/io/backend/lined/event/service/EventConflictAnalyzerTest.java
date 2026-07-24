package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.domain.EventEntity;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EventConflictAnalyzerTest {

  @Mock
  private EventMapper mapper;

  private EventConflictAnalyzer analyzer;
  private OffsetDateTime base;

  @BeforeEach
  void setUp() {
    analyzer = new EventConflictAnalyzer(mapper);
    base = OffsetDateTime.parse("2026-01-01T10:00:00Z");
  }

  @Test
  void findConflicts_returnsEmpty_whenNoEvents() {
    assertThat(analyzer.findConflicts(List.of())).isEmpty();
  }

  @Test
  void findConflicts_returnsEmpty_whenSingleEvent() {
    var event = event(1L, base, base.plusHours(1));

    assertThat(analyzer.findConflicts(List.of(event))).isEmpty();
    verify(mapper, never()).toDto(event);
  }

  @Test
  void findConflicts_returnsEmpty_whenEventsAreAdjacent() {
    var first = event(1L, base, base.plusHours(1));
    var second = event(2L, base.plusHours(1), base.plusHours(2));

    assertThat(analyzer.findConflicts(List.of(first, second))).isEmpty();
    verify(mapper, never()).toDto(first);
    verify(mapper, never()).toDto(second);
  }

  @Test
  void findConflicts_returnsChainPairsInInputOrder() {
    var first = event(1L, base, base.plusHours(2));
    var second = event(2L, base.plusHours(1), base.plusHours(3));
    var third = event(3L, base.plusHours(2), base.plusHours(4));
    var dto1 = dto(1L);
    var dto2 = dto(2L);
    var dto3 = dto(3L);
    when(mapper.toDto(first)).thenReturn(dto1);
    when(mapper.toDto(second)).thenReturn(dto2);
    when(mapper.toDto(third)).thenReturn(dto3);

    List<EventConflictDto> result = analyzer.findConflicts(List.of(first, second, third));

    assertThat(result).hasSize(2);
    assertThat(result.get(0).first()).isEqualTo(dto1);
    assertThat(result.get(0).second()).isEqualTo(dto2);
    assertThat(result.get(1).first()).isEqualTo(dto2);
    assertThat(result.get(1).second()).isEqualTo(dto3);
  }

  @Test
  void findConflicts_calculatesContainedOverlapBounds() {
    var outer = event(1L, base, base.plusHours(4));
    var inner = event(2L, base.plusHours(1), base.plusHours(2));
    when(mapper.toDto(outer)).thenReturn(dto(1L));
    when(mapper.toDto(inner)).thenReturn(dto(2L));

    List<EventConflictDto> result = analyzer.findConflicts(List.of(outer, inner));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).overlapStart()).isEqualTo(inner.getStartAt());
    assertThat(result.get(0).overlapEnd()).isEqualTo(inner.getEndAt());
  }

  @Test
  void findConflicts_calculatesSameWindowOverlapBounds() {
    var first = event(1L, base, base.plusHours(1));
    var second = event(2L, base, base.plusHours(1));
    when(mapper.toDto(first)).thenReturn(dto(1L));
    when(mapper.toDto(second)).thenReturn(dto(2L));

    List<EventConflictDto> result = analyzer.findConflicts(List.of(first, second));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).overlapStart()).isEqualTo(base);
    assertThat(result.get(0).overlapEnd()).isEqualTo(base.plusHours(1));
  }

  @Test
  void findConflicts_throwsIllegalState_whenEntityHasInvalidWindow() {
    var invalid = event(1L, base.plusHours(1), base);
    var valid = event(2L, base, base.plusHours(2));

    assertThatThrownBy(() -> analyzer.findConflicts(List.of(invalid, valid)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Stored event 1 has invalid time window");
  }

  @Test
  void findConflicts_throwsIllegalState_whenSingleEntityHasInvalidWindow() {
    var invalid = event(1L, base.plusHours(1), base);

    assertThatThrownBy(() -> analyzer.findConflicts(List.of(invalid)))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Stored event 1 has invalid time window");
  }

  private EventEntity event(Long id, OffsetDateTime start, OffsetDateTime end) {
    return EventEntity.builder()
        .id(id)
        .title("Event " + id)
        .shared(true)
        .startAt(start)
        .endAt(end)
        .timezone("Europe/Kyiv")
        .build();
  }

  private EventDto dto(Long id) {
    return new EventDto(id, 0L, "Event " + id, null, true, base, base.plusHours(1),
        "Europe/Kyiv", null, 101L, 1L, base);
  }
}
