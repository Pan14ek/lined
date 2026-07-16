package io.backend.lined.lobby.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.service.EventService;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class LobbyControllerTest {

  @Mock
  private LobbyService lobbyService;
  @Mock
  private EventService eventService;

  private LobbyController controller;
  private MockMvc mockMvc;
  private LobbyDto sampleLobby;

  @BeforeEach
  void setUp() {
    controller = new LobbyController(lobbyService, eventService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
    sampleLobby = new LobbyDto(101L, "Our Family", LobbyTypes.FAMILY, 1L, Set.of(1L));
  }

  @Test
  void create_delegatesToService() {
    var dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);
    when(lobbyService.create(dto, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.create(1L, dto);

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).create(dto, 1L);
  }

  @Test
  void create_propagatesNotFoundException_whenOwnerNotFound() {
    var dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);
    when(lobbyService.create(dto, 99L)).thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.create(99L, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void mine_delegatesToService() {
    when(lobbyService.myLobbies(1L)).thenReturn(List.of(sampleLobby));

    List<LobbyDto> result = controller.mine(1L);

    assertThat(result).containsExactly(sampleLobby);
    verify(lobbyService).myLobbies(1L);
  }

  @Test
  void mine_returnsEmptyList_whenNoLobbies() {
    when(lobbyService.myLobbies(99L)).thenReturn(List.of());

    List<LobbyDto> result = controller.mine(99L);

    assertThat(result).isEmpty();
  }

  @Test
  void get_delegatesToService() {
    when(lobbyService.getById(101L)).thenReturn(sampleLobby);

    LobbyDto result = controller.get(101L);

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).getById(101L);
  }

  @Test
  void get_propagatesNotFoundException_whenLobbyNotFound() {
    when(lobbyService.getById(999L)).thenThrow(new NotFoundException("Lobby 999 not found"));

    assertThatThrownBy(() -> controller.get(999L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void freeSlots_delegatesToEventService() {
    var from = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    var to = OffsetDateTime.parse("2026-01-01T22:00:00Z");
    var freeSlots = List.of(new FreeSlotDto(from, to));
    when(eventService.findFreeSlots(101L, from, to, 1L)).thenReturn(freeSlots);

    List<FreeSlotDto> result = controller.freeSlots(101L, from, to, 1L);

    assertThat(result).containsExactlyElementsOf(freeSlots);
    verify(eventService).findFreeSlots(101L, from, to, 1L);
  }

  @Test
  void freeSlots_acceptsUtcTimestampFormat() throws Exception {
    var from = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    var to = OffsetDateTime.parse("2026-01-01T22:00:00Z");
    when(eventService.findFreeSlots(101L, from, to, 1L)).thenReturn(List.of());

    mockMvc.perform(get("/api/lobbies/101/free-slots")
            .header("X-User-Id", "1")
            .param("from", "2026-01-01T09:00:00Z")
            .param("to", "2026-01-01T22:00:00Z"))
        .andExpect(status().isOk());

    verify(eventService).findFreeSlots(101L, from, to, 1L);
  }

  @Test
  void freeSlots_acceptsNumericOffsetTimestampFormat() throws Exception {
    var from = OffsetDateTime.parse("2026-01-01T11:00:00+02:00");
    var to = OffsetDateTime.parse("2026-01-02T00:00:00+02:00");
    when(eventService.findFreeSlots(101L, from, to, 1L)).thenReturn(List.of());

    mockMvc.perform(get("/api/lobbies/101/free-slots")
            .header("X-User-Id", "1")
            .param("from", "2026-01-01T11:00:00+02:00")
            .param("to", "2026-01-02T00:00:00+02:00"))
        .andExpect(status().isOk());

    verify(eventService).findFreeSlots(101L, from, to, 1L);
  }

  @Test
  void freeSlots_rejectsTimestampWithoutOffset() throws Exception {
    mockMvc.perform(get("/api/lobbies/101/free-slots")
            .header("X-User-Id", "1")
            .param("from", "2026-01-01T09:00:00")
            .param("to", "2026-01-01T22:00:00"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(eventService);
  }

  @Test
  void update_delegatesToService() {
    var dto = new LobbyUpdateDto("Weekend Crew", LobbyTypes.FRIENDS, 2L);
    when(lobbyService.update(101L, dto, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.update(101L, 1L, dto);

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).update(101L, dto, 1L);
  }

  @Test
  void update_propagatesForbidden_whenRequesterIsNotOwner() {
    var dto = new LobbyUpdateDto(null, null, null);
    when(lobbyService.update(101L, dto, 99L))
        .thenThrow(new ForbiddenException("Only owner can update lobby"));

    assertThatThrownBy(() -> controller.update(101L, 99L, dto))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void update_propagatesConflict_whenNewOwnerIsNotMember() {
    var dto = new LobbyUpdateDto(null, null, 2L);
    when(lobbyService.update(101L, dto, 1L))
        .thenThrow(new io.backend.lined.common.exception.ConflictException(
            "New owner must be a lobby member"));

    assertThatThrownBy(() -> controller.update(101L, 1L, dto))
        .isInstanceOf(io.backend.lined.common.exception.ConflictException.class)
        .hasMessageContaining("member");
  }

  @Test
  void removeMember_delegatesToService() {
    when(lobbyService.removeMember(101L, 2L, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.removeMember(101L, 2L, 1L);

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).removeMember(101L, 2L, 1L);
  }

  @Test
  void removeMember_propagatesForbidden_whenNotOwner() {
    when(lobbyService.removeMember(101L, 2L, 99L))
        .thenThrow(new ForbiddenException("Only owner can remove members"));

    assertThatThrownBy(() -> controller.removeMember(101L, 2L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void removeMember_propagatesBadRequest_whenRemovingOwner() {
    when(lobbyService.removeMember(101L, 1L, 1L))
        .thenThrow(new BadRequestException("Owner cannot be removed"));

    assertThatThrownBy(() -> controller.removeMember(101L, 1L, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Owner cannot be removed");
  }

  @Test
  void delete_delegatesToService() {
    controller.delete(101L, 1L);

    verify(lobbyService).delete(101L, 1L);
  }

  @Test
  void delete_propagatesForbidden_whenNotOwner() {
    org.mockito.Mockito.doThrow(new ForbiddenException("Only owner can delete"))
        .when(lobbyService).delete(101L, 99L);

    assertThatThrownBy(() -> controller.delete(101L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }
}
