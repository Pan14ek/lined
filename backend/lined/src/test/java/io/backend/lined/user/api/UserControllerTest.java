package io.backend.lined.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.app.AccountApplicationService;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.security.CurrentUserProvider;
import io.backend.lined.user.service.UserService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

  @Mock
  private UserService userService;
  @Mock
  private AccountApplicationService accountService;
  @Mock
  private CurrentUserProvider currentUserProvider;

  private UserController controller;
  private MockMvc mockMvc;
  private UserDto sampleUser;

  @BeforeEach
  void setUp() {
    controller = new UserController(userService, accountService, currentUserProvider);
    lenient().when(currentUserProvider.requireUserId()).thenReturn(1L);
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
    when(userService.update(1L, dto, 1L, 0L)).thenReturn(sampleUser);

    UserDto result = controller.update(1L, "\"0\"", dto).getBody();

    assertThat(result).isEqualTo(sampleUser);
    verify(userService).update(1L, dto, 1L, 0L);
  }

  @Test
  void get_delegatesToUserService() {
    when(userService.getById(1L)).thenReturn(sampleUser);

    UserDto result = (UserDto) controller.get(1L).getBody();

    assertThat(result).isEqualTo(sampleUser);
    verify(userService).getById(1L);
  }

  @Test
  void get_propagatesNotFoundException_whenUserNotFound() {
    when(userService.getPublicById(99L))
        .thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.get(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void me_returnsCurrentUserFromAuthenticatedContext() throws Exception {
    when(userService.getById(1L)).thenReturn(sampleUser);

    mockMvc.perform(get("/api/users/me"))
        .andExpect(status().isOk())
        .andExpect(header().string("ETag", "\"0\""))
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.username").value("alice"));

    verify(userService).getById(1L);
  }

  @Test
  void me_rejectsMissingAuthentication() throws Exception {
    doThrow(new io.backend.lined.common.exception.UnauthorizedException(
        "Authenticated user identity is missing or invalid"))
        .when(currentUserProvider).requireUserId();

    mockMvc.perform(get("/api/users/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.status").value(401));

    verifyNoInteractions(userService);
  }

  @Test
  void me_mapsUnknownCurrentUserToNotFound() throws Exception {
    when(userService.getById(99L)).thenThrow(new NotFoundException("User 99 not found"));

    when(currentUserProvider.requireUserId()).thenReturn(99L);
    mockMvc.perform(get("/api/users/me"))
        .andExpect(status().isNotFound())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Resource not found"))
        .andExpect(jsonPath("$.status").value(404));

    verify(userService).getById(99L);
  }

  @Test
  void delete_delegatesSelfServiceRequestAndReturnsNoContent() {
    var response = controller.delete(1L, "\"0\"");

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(userService).delete(1L, 1L, 0L);
  }

  @Test
  void delete_usesAuthenticatedUser() throws Exception {
    mockMvc.perform(delete("/api/users/1").header("If-Match", "\"0\""))
        .andExpect(status().isNoContent());

    verify(userService).delete(1L, 1L, 0L);
  }

  @Test
  void delete_rejectsMissingAuthentication() throws Exception {
    doThrow(new io.backend.lined.common.exception.UnauthorizedException(
        "Authenticated user identity is missing or invalid"))
        .when(currentUserProvider).requireUserId();

    mockMvc.perform(delete("/api/users/1"))
        .andExpect(status().isUnauthorized());

    verifyNoInteractions(userService);
  }

  @Test
  void delete_mapsForbiddenServiceResult() throws Exception {
    doThrow(new ForbiddenException("Users can only delete their own account"))
        .when(userService).delete(1L, 2L, 0L);

    when(currentUserProvider.requireUserId()).thenReturn(2L);
    mockMvc.perform(delete("/api/users/1").header("If-Match", "\"0\""))
        .andExpect(status().isForbidden());
  }

  @Test
  void findUsers_delegatesToUserService() {
    var searchResult = new UserSearchResultDto(1L, "alice");
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
    var searchResult = new UserSearchResultDto(1L, "alice");
    var pageDto = new UserPageDto(List.of(searchResult), 0, 20, 1L, 1);
    when(userService.findUsersByRole("ADMIN", 0, 20, 1L)).thenReturn(pageDto);

    var response = controller.findUsersByRole("ADMIN", 0, 20);

    assertThat(response.getBody()).isEqualTo(pageDto);
    verify(userService).findUsersByRole("ADMIN", 0, 20, 1L);
  }

  @Test
  void findUsersByRole_propagatesNotFoundException_whenRoleUnknown() {
    when(userService.findUsersByRole("GHOST", 0, 20, 1L))
        .thenThrow(new NotFoundException("Role GHOST not found"));

    assertThatThrownBy(() -> controller.findUsersByRole("GHOST", 0, 20))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("GHOST");
  }
}
