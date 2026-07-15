package io.backend.lined.lobby.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LobbyControllerTest {

  @Mock
  private LobbyService lobbyService;

  private LobbyController controller;
  private LobbyDto sampleLobby;

  @BeforeEach
  void setUp() {
    controller = new LobbyController(lobbyService);
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
  void addMember_delegatesToService() {
    when(lobbyService.addMember(101L, 2L, 1L)).thenReturn(sampleLobby);

    LobbyDto result = controller.addMember(101L, 1L, 2L);

    assertThat(result).isEqualTo(sampleLobby);
    verify(lobbyService).addMember(101L, 2L, 1L);
  }

  @Test
  void addMember_propagatesForbidden_whenNotOwner() {
    when(lobbyService.addMember(101L, 2L, 99L))
        .thenThrow(new ForbiddenException("Only owner can add members"));

    assertThatThrownBy(() -> controller.addMember(101L, 99L, 2L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void addMember_propagatesNotFoundException_whenUserNotFound() {
    when(lobbyService.addMember(101L, 999L, 1L))
        .thenThrow(new NotFoundException("User 999 not found"));

    assertThatThrownBy(() -> controller.addMember(101L, 1L, 999L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
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
