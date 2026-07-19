package io.backend.lined.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.app.AccountApplicationService;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.user.service.UserService;
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
class UserControllerTest {

  @Mock
  private UserService userService;
  @Mock
  private AccountApplicationService accountService;

  private UserController controller;
  private MockMvc mockMvc;
  private UserDto sampleUser;

  @BeforeEach
  void setUp() {
    controller = new UserController(userService, accountService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
    sampleUser = new UserDto(1L, "alice", "alice@example.com",
        OffsetDateTime.now(), Set.of("USER"), null, null);
  }

  @Test
  void create_delegatesToAccountService() {
    var dto = new UserCreateDto("alice", "alice@example.com", "P@ss1!", null);
    when(accountService.registerUser(dto)).thenReturn(sampleUser);

    UserDto result = controller.create(dto).getBody();

    assertThat(result).isEqualTo(sampleUser);
    verify(accountService).registerUser(dto);
  }

  @Test
  void update_delegatesToUserService() {
    var dto = new UserUpdateDto("alice2", null, null, null);
    when(userService.update(1L, dto)).thenReturn(sampleUser);

    UserDto result = controller.update(1L, dto);

    assertThat(result).isEqualTo(sampleUser);
    verify(userService).update(1L, dto);
  }

  @Test
  void get_delegatesToUserService() {
    when(userService.getById(1L)).thenReturn(sampleUser);

    UserDto result = controller.get(1L).getBody();

    assertThat(result).isEqualTo(sampleUser);
    verify(userService).getById(1L);
  }

  @Test
  void get_propagatesNotFoundException_whenUserNotFound() {
    when(userService.getById(99L)).thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.get(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void delete_delegatesSelfServiceRequestAndReturnsNoContent() {
    var response = controller.delete(1L, 1L);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(userService).delete(1L, 1L);
  }

  @Test
  void delete_acceptsCurrentUserHeader() throws Exception {
    mockMvc.perform(delete("/api/users/1").header("X-User-Id", "1").header("If-Match", "\"0\""))
        .andExpect(status().isNoContent());

    verify(userService).delete(1L, 1L, 0L);
  }

  @Test
  void delete_rejectsMissingCurrentUserHeader() throws Exception {
    mockMvc.perform(delete("/api/users/1"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(userService);
  }

  @Test
  void delete_mapsForbiddenServiceResult() throws Exception {
    org.mockito.Mockito.doThrow(new ForbiddenException("Users can only delete their own account"))
        .when(userService).delete(1L, 2L, 0L);

    mockMvc.perform(delete("/api/users/1").header("X-User-Id", "2").header("If-Match", "\"0\""))
        .andExpect(status().isForbidden());
  }

  @Test
  void findUsers_delegatesToUserService() {
    var searchResult = new UserSearchResultDto(1L, "alice", "alice@example.com",
        OffsetDateTime.now(), Set.of());
    var pageDto = new UserPageDto(List.of(searchResult), 0, 20, 1L, 1);
    when(userService.findUsers("alice", 0, 20)).thenReturn(pageDto);

    var response = controller.findUsers("alice", 0, 20);

    assertThat(response.getBody()).isEqualTo(pageDto);
    verify(userService).findUsers("alice", 0, 20);
  }

  @Test
  void findUsers_returnsEmptyPage_whenNoResults() {
    var emptyPage = new UserPageDto(List.of(), 0, 20, 0L, 0);
    when(userService.findUsers("xyz", 0, 20)).thenReturn(emptyPage);

    var response = controller.findUsers("xyz", 0, 20);

    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().content()).isEmpty();
  }

  @Test
  void findUsersByRole_delegatesToUserService() {
    var searchResult = new UserSearchResultDto(1L, "alice", "alice@example.com",
        OffsetDateTime.now(), Set.of("ADMIN"));
    var pageDto = new UserPageDto(List.of(searchResult), 0, 20, 1L, 1);
    when(userService.findUsersByRole("ADMIN", 0, 20)).thenReturn(pageDto);

    var response = controller.findUsersByRole("ADMIN", 0, 20);

    assertThat(response.getBody()).isEqualTo(pageDto);
    verify(userService).findUsersByRole("ADMIN", 0, 20);
  }

  @Test
  void findUsersByRole_propagatesNotFoundException_whenRoleUnknown() {
    when(userService.findUsersByRole("GHOST", 0, 20))
        .thenThrow(new NotFoundException("Role GHOST not found"));

    assertThatThrownBy(() -> controller.findUsersByRole("GHOST", 0, 20))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("GHOST");
  }
}
