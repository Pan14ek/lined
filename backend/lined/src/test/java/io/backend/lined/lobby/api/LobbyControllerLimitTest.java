package io.backend.lined.lobby.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.event.service.EventService;
import io.backend.lined.lobby.service.LobbyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class LobbyControllerLimitTest {

  @Mock
  private LobbyService lobbyService;
  @Mock
  private EventService eventService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new LobbyController(lobbyService, eventService))
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  void create_returnsConflictWithStableLimitCode_whenFreeLobbyLimitIsReached() throws Exception {
    when(lobbyService.create(any(LobbyCreateDto.class), eq(1L))).thenThrow(
        new ConflictException("LOBBY_LIMIT_EXCEEDED", "Lobby limit exceeded for current plan"));

    mockMvc.perform(post("/api/lobbies")
            .header("X-User-Id", "1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Our Family\",\"lobbyType\":\"FAMILY\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LOBBY_LIMIT_EXCEEDED"))
        .andExpect(jsonPath("$.status").value(409));
  }
}
