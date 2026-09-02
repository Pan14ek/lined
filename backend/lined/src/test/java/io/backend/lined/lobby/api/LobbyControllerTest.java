package io.backend.lined.lobby.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.service.EventService;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyService;
import io.backend.lined.security.CurrentUserProvider;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
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
class LobbyControllerTest {

  @Mock
  private LobbyService lobbyService;
  @Mock
  private EventService eventService;
  @Mock
  private CurrentUserProvider currentUserProvider;

  private LobbyController controller;
  private MockMvc mockMvc;
  private LobbyDto sampleLobby;

  @BeforeEach
  void setUp() {
    controller = new LobbyController(lobbyService, eventService, currentUserProvider);
    lenient().when(currentUserProvider.requireUserId()).thenReturn(1L);
    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
    sampleLobby = new LobbyDto(101L, "Our Family", LobbyTypes.FAMILY, 1L, Set.of(1L));
  }

  @Test
  void create_delegatesToService() {
    var dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);
    when(lobbyService.create(dto, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.create(dto).getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).create(dto, 1L);
  }

  @Test
  void create_propagatesNotFoundException_whenOwnerNotFound() {
    var dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);
    when(lobbyService.create(dto, 99L)).thenThrow(new NotFoundException("User 99 not found"));

    when(currentUserProvider.requireUserId()).thenReturn(99L);
    assertThatThrownBy(() -> controller.create(dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void mine_delegatesToService() {
    when(lobbyService.myLobbies(1L)).thenReturn(List.of(sampleLobby));

    List<LobbyDto> result = controller.mine();

    assertThat(result).containsExactly(sampleLobby);
    verify(lobbyService).myLobbies(1L);
  }

  @Test
  void mine_returnsEmptyList_whenNoLobbies() {
    when(lobbyService.myLobbies(99L)).thenReturn(List.of());

    when(currentUserProvider.requireUserId()).thenReturn(99L);
    List<LobbyDto> result = controller.mine();

    assertThat(result).isEmpty();
  }

  @Test
  void get_delegatesToService() {
    when(lobbyService.getById(101L, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.get(101L).getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).getById(101L, 1L);
  }

  @Test
  void get_propagatesNotFoundException_whenLobbyNotFound() {
    when(lobbyService.getById(999L, 1L)).thenThrow(new NotFoundException("Lobby 999 not found"));

    assertThatThrownBy(() -> controller.get(999L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void selectAsFree_delegatesToService() {
    when(lobbyService.selectAsFree(101L, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.selectAsFree(101L).getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).selectAsFree(101L, 1L);
  }

  @Test
  void selectAsFree_returnsStableConflict_whenMemberLimitIsExceeded() throws Exception {
    when(lobbyService.selectAsFree(101L, 1L)).thenThrow(new ConflictException(
        "LOBBY_MEMBER_LIMIT_EXCEEDED", "Remove members before selecting this lobby"));

    mockMvc.perform(post("/api/lobbies/101/select-as-free"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LOBBY_MEMBER_LIMIT_EXCEEDED"));
  }

  @Test
  void selectAsFree_returnsForbidden_whenCallerIsNotOwner() throws Exception {
    when(lobbyService.selectAsFree(101L, 2L))
        .thenThrow(new ForbiddenException("Only lobby owner can perform this action"));

    when(currentUserProvider.requireUserId()).thenReturn(2L);
    mockMvc.perform(post("/api/lobbies/101/select-as-free"))
        .andExpect(status().isForbidden());
  }

  @Test
  void selectAsFree_returnsNotFound_whenLobbyDoesNotExist() throws Exception {
    when(lobbyService.selectAsFree(999L, 1L))
        .thenThrow(new NotFoundException("Lobby 999 not found"));

    mockMvc.perform(post("/api/lobbies/999/select-as-free"))
        .andExpect(status().isNotFound());
  }

  @Test
  void restore_delegatesToService() {
    when(lobbyService.restore(101L, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.restore(101L).getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).restore(101L, 1L);
  }

  @Test
  void restore_returnsStableConflict_whenCapacityIsUnavailable() throws Exception {
    when(lobbyService.restore(101L, 1L)).thenThrow(new ConflictException(
        "LOBBY_LIMIT_EXCEEDED", "Lobby limit exceeded for current plan"));

    mockMvc.perform(post("/api/lobbies/101/restore"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LOBBY_LIMIT_EXCEEDED"));
  }

  @Test
  void archived_delegatesToService() {
    when(lobbyService.archivedLobbies(1L)).thenReturn(List.of(sampleLobby));

    List<LobbyDto> result = controller.archived(
        io.backend.lined.lobby.domain.LobbyLifecycleStatus.ARCHIVED);

    assertThat(result).containsExactly(sampleLobby);
    verify(lobbyService).archivedLobbies(1L);
  }

  @Test
  void freeSlots_delegatesToEventService() {
    var from = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    var to = OffsetDateTime.parse("2026-01-01T22:00:00Z");
    var freeSlots = List.of(new FreeSlotDto(from, to));
    when(eventService.findFreeSlots(101L, from, to, 1L)).thenReturn(freeSlots);

    List<FreeSlotDto> result = controller.freeSlots(101L, from, to);

    assertThat(result).containsExactlyElementsOf(freeSlots);
    verify(eventService).findFreeSlots(101L, from, to, 1L);
  }

  @Test
  void freeSlots_acceptsUtcTimestampFormat() throws Exception {
    var from = OffsetDateTime.parse("2026-01-01T09:00:00Z");
    var to = OffsetDateTime.parse("2026-01-01T22:00:00Z");
    when(eventService.findFreeSlots(101L, from, to, 1L)).thenReturn(List.of());

    mockMvc.perform(get("/api/lobbies/101/free-slots")
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
            .param("from", "2026-01-01T11:00:00+02:00")
            .param("to", "2026-01-02T00:00:00+02:00"))
        .andExpect(status().isOk());

    verify(eventService).findFreeSlots(101L, from, to, 1L);
  }

  @Test
  void freeSlots_rejectsTimestampWithoutOffset() throws Exception {
    mockMvc.perform(get("/api/lobbies/101/free-slots")
            .param("from", "2026-01-01T09:00:00")
            .param("to", "2026-01-01T22:00:00"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(eventService);
  }

  @Test
  void update_delegatesToService() {
    var dto = new LobbyUpdateDto("Weekend Crew", LobbyTypes.FRIENDS, 2L);
    when(lobbyService.update(101L, dto, 1L, 0L)).thenReturn(sampleLobby);

    LobbyDto result = controller.update(101L, "\"0\"", dto).getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).update(101L, dto, 1L, 0L);
  }

  @Test
  void update_propagatesForbidden_whenRequesterIsNotOwner() {
    var dto = new LobbyUpdateDto(null, null, null);
    when(currentUserProvider.requireUserId()).thenReturn(99L);
    when(lobbyService.update(101L, dto, 99L, 0L))
        .thenThrow(new ForbiddenException("Only owner can update lobby"));

    assertThatThrownBy(() -> controller.update(101L, "\"0\"", dto))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void update_propagatesConflict_whenNewOwnerIsNotMember() {
    var dto = new LobbyUpdateDto(null, null, 2L);
    when(lobbyService.update(101L, dto, 1L, 0L))
        .thenThrow(new io.backend.lined.common.exception.ConflictException(
            "New owner must be a lobby member"));

    assertThatThrownBy(() -> controller.update(101L, "\"0\"", dto))
        .isInstanceOf(io.backend.lined.common.exception.ConflictException.class)
        .hasMessageContaining("member");
  }

  @Test
  void update_returnsRfc7807ConflictForOptimisticLockFailure() throws Exception {
    when(lobbyService.update(eq(101L), any(LobbyUpdateDto.class), eq(1L), eq(0L)))
        .thenThrow(new ObjectOptimisticLockingFailureException("lobbies", 101L));

    mockMvc.perform(patch("/api/lobbies/101")
            .header("If-Match", "\"0\"")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"ownerId\":2}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void removeMember_delegatesToService() {
    when(lobbyService.removeMember(101L, 2L, 1L, 0L)).thenReturn(sampleLobby);

    LobbyDto result = controller.removeMember(101L, 2L, "\"0\"").getBody();

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).removeMember(101L, 2L, 1L, 0L);
  }

  @Test
  void removeMember_propagatesForbidden_whenNotOwner() {
    when(currentUserProvider.requireUserId()).thenReturn(99L);
    when(lobbyService.removeMember(101L, 2L, 99L, 0L))
        .thenThrow(new ForbiddenException("Only owner can remove members"));

    assertThatThrownBy(() -> controller.removeMember(101L, 2L, "\"0\""))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void removeMember_propagatesBadRequest_whenRemovingOwner() {
    when(lobbyService.removeMember(101L, 1L, 1L, 0L))
        .thenThrow(new BadRequestException("Owner cannot be removed"));

    assertThatThrownBy(() -> controller.removeMember(101L, 1L, "\"0\""))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Owner cannot be removed");
  }

  @Test
  void removeMember_returnsRfc7807ConflictForOptimisticLockFailure() throws Exception {
    doThrow(new ObjectOptimisticLockingFailureException("lobbies", 101L))
        .when(lobbyService).removeMember(101L, 2L, 1L, 0L);

    mockMvc.perform(delete("/api/lobbies/101/members/2")
            .header("If-Match", "\"0\""))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  void delete_delegatesToService() {
    controller.delete(101L, "\"0\"");

    verify(lobbyService).delete(101L, 1L, 0L);
  }

  @Test
  void delete_propagatesForbidden_whenNotOwner() {
    org.mockito.Mockito.doThrow(new ForbiddenException("Only owner can delete"))
        .when(lobbyService).delete(101L, 99L, 0L);

    when(currentUserProvider.requireUserId()).thenReturn(99L);
    assertThatThrownBy(() -> controller.delete(101L, "\"0\""))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }
}
