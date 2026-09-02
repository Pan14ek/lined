package io.backend.lined.event.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.event.service.EventService;
import io.backend.lined.security.CurrentUserProvider;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class EventControllerTest {

  @Mock
  private EventService service;
  @Mock
  private CurrentUserProvider currentUserProvider;

  private EventController controller;
  private MockMvc mockMvc;
  private OffsetDateTime start;
  private OffsetDateTime end;

  private EventDto sampleEvent;
  private EventCreateDto createDto;
  private EventUpdateDto updateDto;

  @BeforeEach
  void setUp() {
    controller = new EventController(service, currentUserProvider);
    when(currentUserProvider.requireUserId()).thenReturn(42L);
    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
    start = OffsetDateTime.parse("2026-01-01T10:00:00Z");
    end = start.plusHours(1);
    sampleEvent = new EventDto(9001L, 0L, "Dinner together", "Whole Foods Market", true, start,
        end,
        "Europe/Kyiv", null, 101L, 42L, OffsetDateTime.now());
    createDto = new EventCreateDto("Dinner together", "Whole Foods Market", true, start, end,
        "Europe/Kyiv", 101L);
    updateDto = new EventUpdateDto("Late dinner", null, null, null, null, null);
  }

  /* =======================
     create
  ======================= */

  @Test
  void create_delegatesToService() {
    when(service.create(createDto, 42L, null)).thenReturn(sampleEvent);

    EventDto result = controller.create(null, createDto).getBody();

    assertThat(result).isEqualTo(sampleEvent);
    verify(service).create(createDto, 42L, null);
  }

  @Test
  void create_delegatesOptionalIdempotencyKeyToService() {
    when(service.create(createDto, 42L, "retry-1")).thenReturn(sampleEvent);

    EventDto result = controller.create("retry-1", createDto).getBody();

    assertThat(result).isEqualTo(sampleEvent);
    verify(service).create(createDto, 42L, "retry-1");
  }

  @Test
  void create_propagatesForbidden_whenNotMember() {
    when(currentUserProvider.requireUserId()).thenReturn(99L);
    when(service.create(createDto, 99L, null))
        .thenThrow(new ForbiddenException("Not a lobby member"));

    assertThatThrownBy(() -> controller.create(null, createDto))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("member");
  }

  @Test
  void create_propagatesNotFoundException_whenLobbyNotFound() {
    when(service.create(createDto, 42L, null))
        .thenThrow(new NotFoundException("Lobby 101 not found"));

    assertThatThrownBy(() -> controller.create(null, createDto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("101");
  }

  /* =======================
     update
  ======================= */

  @Test
  void update_delegatesToService() {
    when(service.update(9001L, updateDto, 42L, 0L)).thenReturn(sampleEvent);

    EventDto result = controller.update(9001L, "\"0\"", updateDto).getBody();

    assertThat(result).isEqualTo(sampleEvent);
    verify(service).update(9001L, updateDto, 42L, 0L);
  }

  @Test
  void update_propagatesNotFoundException_whenEventNotFound() {
    when(service.update(999L, updateDto, 42L, 0L))
        .thenThrow(new NotFoundException("Event 999 not found"));

    assertThatThrownBy(() -> controller.update(999L, "\"0\"", updateDto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_propagatesBadRequest_whenDatesInvalid() {
    var badUpdate = new EventUpdateDto(null, null, null, end, start, null);
    when(service.update(9001L, badUpdate, 42L, 0L))
        .thenThrow(new BadRequestException("Start must be before end"));

    assertThatThrownBy(() -> controller.update(9001L, "\"0\"", badUpdate))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Start");
  }

  @Test
  void update_returnsRfc7807ConflictForStaleIfMatch() throws Exception {
    when(service.update(eq(9001L), any(EventUpdateDto.class), eq(42L), eq(0L)))
        .thenThrow(new ObjectOptimisticLockingFailureException("events", 9001L));

    mockMvc.perform(patch("/api/calendar/events/9001")
            .header("If-Match", "\"0\"")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Late dinner\"}"))
        .andExpect(status().isConflict())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Conflict"))
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void delete_returnsRfc7807ConflictForOptimisticLockFailure() throws Exception {
    doThrow(new ObjectOptimisticLockingFailureException("events", 9001L))
        .when(service).delete(9001L, 42L, 0L);

    mockMvc.perform(delete("/api/calendar/events/9001")
            .header("If-Match", "\"0\""))
        .andExpect(status().isConflict())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Conflict"))
        .andExpect(jsonPath("$.status").value(409));
  }

  /* =======================
     list
  ======================= */

  @Test
  void get_delegatesToService() {
    when(service.get(9001L, 42L)).thenReturn(sampleEvent);

    EventDto result = controller.get(9001L).getBody();

    assertThat(result).isEqualTo(sampleEvent);
    verify(service).get(9001L, 42L);
  }

  @Test
  void get_returnsNotFoundForPrivateEventOutsideOwnerScope() throws Exception {
    when(service.get(9001L, 77L)).thenThrow(new NotFoundException("Event 9001 not found"));

    when(currentUserProvider.requireUserId()).thenReturn(77L);
    mockMvc.perform(get("/api/calendar/events/9001"))
        .andExpect(status().isNotFound())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
  }

  @Test
  void list_delegatesToService() {
    when(service.list(101L, start, end, 42L)).thenReturn(List.of(sampleEvent));

    List<EventDto> result = controller.list(101L, start, end);

    assertThat(result).containsExactly(sampleEvent);
    verify(service).list(101L, start, end, 42L);
  }

  @Test
  void list_propagatesBadRequest_whenWindowInvalid() {
    when(service.list(101L, end, start, 42L))
        .thenThrow(new BadRequestException("Start must be before end"));

    assertThatThrownBy(() -> controller.list(101L, end, start))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Start");
  }

  /* =======================
     delete
  ======================= */

  @Test
  void delete_delegatesToService() {
    controller.delete(9001L, "\"0\"");

    verify(service).delete(9001L, 42L, 0L);
  }

  @Test
  void delete_propagatesNotFoundException_whenEventNotFound() {
    doThrow(new NotFoundException("Event 999 not found"))
        .when(service).delete(999L, 42L, 0L);

    assertThatThrownBy(() -> controller.delete(999L, "\"0\""))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  /* =======================
     findConflicts (existing tests below)
  ======================= */

  @Test
  void findConflicts_usesAuthenticatedUserAsRequester() {
    when(currentUserProvider.requireUserId()).thenReturn(1L);
    when(service.findConflicts(101L, start, end, 1L)).thenReturn(List.of());

    var response = controller.findConflicts(101L, start, end);

    assertThat(response.getBody()).isEmpty();
    verify(service).findConflicts(101L, start, end, 1L);
  }

  @Test
  void findConflictsRouteDerivesRequesterAndIgnoresLegacyQueryIdentity() throws Exception {
    when(service.findConflicts(101L, start, end, 42L)).thenReturn(List.of());

    mockMvc.perform(get("/api/calendar/conflicts")
            .param("lobbyId", "101")
            .param("start", start.toString())
            .param("end", end.toString())
            .param("requesterId", "99"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray());

    verify(service).findConflicts(101L, start, end, 42L);
  }

  @Test
  void hasConflict_usesAuthenticatedUserAsRequester() {
    when(currentUserProvider.requireUserId()).thenReturn(1L);
    var result = new UserConflictDto(1L, false, null);
    when(service.hasConflict(1L, start, end, 1L)).thenReturn(result);

    var response = controller.hasConflict(1L, start, end);

    assertThat(response.getBody()).isEqualTo(result);
    verify(service).hasConflict(1L, start, end, 1L);
  }

  @Test
  void userConflictRouteDerivesRequesterWithoutRequesterQueryParameter() throws Exception {
    var result = new UserConflictDto(1L, false, null);
    when(service.hasConflict(1L, start, end, 42L)).thenReturn(result);

    mockMvc.perform(get("/api/calendar/user-conflict")
            .param("userId", "1")
            .param("start", start.toString())
            .param("end", end.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value(1));

    verify(service).hasConflict(1L, start, end, 42L);
  }

}
