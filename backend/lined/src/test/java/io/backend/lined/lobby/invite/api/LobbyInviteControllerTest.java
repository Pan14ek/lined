package io.backend.lined.lobby.invite.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.backend.lined.lobby.invite.service.LobbyInviteService;
import io.backend.lined.security.CurrentUserProvider;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class LobbyInviteControllerTest {

  @Mock
  private LobbyInviteService inviteService;
  @Mock
  private CurrentUserProvider currentUserProvider;

  private LobbyInviteController controller;
  private MockMvc mockMvc;
  private LobbyInviteDto invite;

  @BeforeEach
  void setUp() {
    controller = new LobbyInviteController(inviteService, currentUserProvider);
    when(currentUserProvider.requireUserId()).thenReturn(1L);
    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
    var now = OffsetDateTime.parse("2026-07-16T10:00:00Z");
    invite = new LobbyInviteDto(501L, 101L, 1L, 2L, LobbyInviteStatus.PENDING,
        now, now, now);
  }

  @Test
  void create_delegatesToService() {
    when(inviteService.create(101L, 2L, null, 1L)).thenReturn(invite);

    assertThat(controller.create(101L, 2L, null)).isEqualTo(invite);
    verify(inviteService).create(101L, 2L, null, 1L);
  }

  @Test
  void pendingForLobby_delegatesToService() {
    when(inviteService.pendingForLobby(101L, 1L)).thenReturn(List.of(invite));

    assertThat(controller.pendingForLobby(101L)).containsExactly(invite);
  }

  @Test
  void resend_delegatesToService() {
    when(inviteService.resend(101L, 501L, 1L)).thenReturn(invite);

    assertThat(controller.resend(101L, 501L)).isEqualTo(invite);
  }

  @Test
  void cancel_delegatesToService() {
    when(inviteService.cancel(101L, 501L, 1L)).thenReturn(invite);

    assertThat(controller.cancel(101L, 501L)).isEqualTo(invite);
  }

  @Test
  void mine_delegatesToService() {
    when(inviteService.pendingForInvitee(2L)).thenReturn(List.of(invite));

    when(currentUserProvider.requireUserId()).thenReturn(2L);
    assertThat(controller.mine()).containsExactly(invite);
  }

  @Test
  void accept_delegatesToService() {
    when(inviteService.accept(501L, 2L)).thenReturn(invite);

    when(currentUserProvider.requireUserId()).thenReturn(2L);
    assertThat(controller.accept(501L)).isEqualTo(invite);
  }

  @Test
  void accept_returnsAcceptedInviteForSequentialRetryContract() throws Exception {
    var accepted = new LobbyInviteDto(501L, 101L, 1L, 2L, LobbyInviteStatus.ACCEPTED,
        invite.sentAt(), invite.createdAt(), invite.updatedAt());
    when(inviteService.accept(501L, 2L)).thenReturn(accepted);

    when(currentUserProvider.requireUserId()).thenReturn(2L);
    mockMvc.perform(post("/api/lobby-invites/501/accept"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(501))
        .andExpect(jsonPath("$.status").value("ACCEPTED"));
  }

  @Test
  void decline_propagatesForbiddenException() {
    when(currentUserProvider.requireUserId()).thenReturn(99L);
    when(inviteService.decline(501L, 99L)).thenThrow(new ForbiddenException("Not invitee"));

    assertThatThrownBy(() -> controller.decline(501L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("invitee");
  }
}
