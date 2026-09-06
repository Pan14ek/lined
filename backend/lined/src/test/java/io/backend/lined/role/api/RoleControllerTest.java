package io.backend.lined.role.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.service.RoleService;
import io.backend.lined.security.CurrentUserProvider;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoleControllerTest {

  @Mock
  private RoleService roleService;

  @Mock
  private CurrentUserProvider currentUserProvider;

  private RoleController controller;

  @BeforeEach
  void setUp() {
    controller = new RoleController(roleService, currentUserProvider);
    org.mockito.Mockito.lenient().when(currentUserProvider.requireUserId()).thenReturn(1L);
  }

  @Test
  void listAll_delegatesToService() {
    var roles = List.of(new RoleDto(1L, "USER"), new RoleDto(2L, "ADMIN"));
    when(roleService.listAll()).thenReturn(roles);

    List<RoleDto> result = controller.listAll();

    assertThat(result).isEqualTo(roles);
    verify(roleService).listAll();
  }

  @Test
  void listRoleNames_returnsNamesFromAllRoles() {
    var roles = List.of(new RoleDto(1L, "USER"), new RoleDto(2L, "ADMIN"));
    when(roleService.listAll()).thenReturn(roles);

    Set<RoleNameDto> result = controller.listRoleNames();

    assertThat(result).extracting(RoleNameDto::name)
        .containsExactlyInAnyOrder("USER", "ADMIN");
  }

  @Test
  void listRoleNames_returnsEmptySet_whenNoRoles() {
    when(roleService.listAll()).thenReturn(List.of());

    Set<RoleNameDto> result = controller.listRoleNames();

    assertThat(result).isEmpty();
  }

  @Test
  void ensureExists_delegatesToService() {
    controller.ensureExists("MODERATOR");

    verify(roleService).ensureExistsAsAdmin("MODERATOR", 1L);
  }

  @Test
  void setUserRoles_delegatesToService() {
    var req = new AssignRolesRequestDto(Set.of("ADMIN", "USER"));
    when(roleService.setUserRolesAsAdmin(1L, 1L, req.roles()))
        .thenReturn(Set.of("ADMIN", "USER"));

    Set<String> result = controller.setUserRoles(1L, req);

    assertThat(result).containsExactlyInAnyOrder("ADMIN", "USER");
    verify(roleService).setUserRolesAsAdmin(1L, 1L, req.roles());
  }

  @Test
  void setUserRoles_propagatesNotFoundException_whenUserNotFound() {
    var req = new AssignRolesRequestDto(Set.of("USER"));
    when(roleService.setUserRolesAsAdmin(1L, 99L, req.roles()))
        .thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.setUserRoles(99L, req))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void addUserRoles_delegatesToService() {
    var req = new AssignRolesRequestDto(Set.of("ADMIN"));
    when(roleService.addUserRolesAsAdmin(1L, 1L, req.roles()))
        .thenReturn(Set.of("USER", "ADMIN"));

    Set<String> result = controller.addUserRoles(1L, req);

    assertThat(result).contains("ADMIN", "USER");
    verify(roleService).addUserRolesAsAdmin(1L, 1L, req.roles());
  }

  @Test
  void addUserRoles_propagatesNotFoundException_whenUserNotFound() {
    var req = new AssignRolesRequestDto(Set.of("ADMIN"));
    when(roleService.addUserRolesAsAdmin(1L, 99L, req.roles()))
        .thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.addUserRoles(99L, req))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void removeUserRoles_delegatesToService() {
    var req = new AssignRolesRequestDto(Set.of("ADMIN"));
    when(roleService.removeUserRolesAsAdmin(1L, 1L, req.roles())).thenReturn(Set.of("USER"));

    Set<String> result = controller.removeUserRoles(1L, req);

    assertThat(result).containsExactly("USER");
    verify(roleService).removeUserRolesAsAdmin(1L, 1L, req.roles());
  }

  @Test
  void removeUserRoles_propagatesNotFoundException_whenUserNotFound() {
    var req = new AssignRolesRequestDto(Set.of("ADMIN"));
    when(roleService.removeUserRolesAsAdmin(1L, 99L, req.roles()))
        .thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.removeUserRoles(99L, req))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }
}
