package io.backend.lined.role.service;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.api.dto.RoleDto;
import io.backend.lined.role.api.dto.RoleMapper;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleServiceImplTest {

  @Mock private UserRepository userRepository;
  @Mock private RoleRepository roleRepository;
  @Mock private RoleMapper roleMapper;

  @InjectMocks
  private RoleServiceImpl roleService;

  private UserEntity userEntity;
  private RoleEntity adminRole;
  private RoleEntity userRole;

  @BeforeEach
  void setUp() {
    adminRole = RoleEntity.builder().id(1L).name("ADMIN").build();
    userRole = RoleEntity.builder().id(2L).name("USER").build();

    userEntity = new UserEntity();
    userEntity.setId(1L);
    userEntity.setUsername("testuser");
    userEntity.setRoles(new HashSet<>(Set.of(userRole)));
  }

  /* =======================
     LIST ALL
  ======================= */

  @Test
  void listAll_returnsAllRoles() {
    RoleDto adminDto = new RoleDto(1L, "ADMIN");
    RoleDto userDto = new RoleDto(2L, "USER");

    when(roleRepository.findAll()).thenReturn(List.of(adminRole, userRole));
    when(roleMapper.toDto(adminRole)).thenReturn(adminDto);
    when(roleMapper.toDto(userRole)).thenReturn(userDto);

    List<RoleDto> result = roleService.listAll();

    assertThat(result).hasSize(2).containsExactlyInAnyOrder(adminDto, userDto);
  }

  @Test
  void listAll_returnsEmptyList_whenNoRoles() {
    when(roleRepository.findAll()).thenReturn(List.of());

    List<RoleDto> result = roleService.listAll();

    assertThat(result).isEmpty();
  }

  /* =======================
     ENSURE EXISTS
  ======================= */

  @Test
  void ensureExists_createsRole_whenNotFound() {
    when(roleRepository.findByNameIgnoreCase("MODERATOR")).thenReturn(Optional.empty());
    when(roleRepository.save(any(RoleEntity.class))).thenReturn(
        RoleEntity.builder().id(3L).name("MODERATOR").build()
    );

    roleService.ensureExists("MODERATOR");

    verify(roleRepository).save(any(RoleEntity.class));
  }

  @Test
  void ensureExists_doesNotCreate_whenAlreadyExists() {
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(adminRole));

    roleService.ensureExists("ADMIN");

    verify(roleRepository, never()).save(any());
  }

  @Test
  void ensureExists_doesNothing_whenNameIsNull() {
    roleService.ensureExists(null);

    verifyNoInteractions(roleRepository);
  }

  @Test
  void ensureExists_doesNothing_whenNameIsBlank() {
    roleService.ensureExists("   ");

    verifyNoInteractions(roleRepository);
  }

  /* =======================
     SET USER ROLES
  ======================= */

  @Test
  void setUserRoles_success() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(adminRole));

    Set<String> result = roleService.setUserRoles(1L, Set.of("ADMIN"));

    assertThat(result).containsExactly("ADMIN");
    verify(userRepository).save(userEntity);
  }

  @Test
  void setUserRoles_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findWithRolesById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> roleService.setUserRoles(99L, Set.of("ADMIN")))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");

    verify(userRepository, never()).save(any());
  }

  @Test
  void setUserRoles_throwsNotFound_whenRoleDoesNotExist() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> roleService.setUserRoles(1L, Set.of("UNKNOWN")))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("Role not found");
  }

  @Test
  void setUserRoles_replacesExistingRoles() {
    userEntity.setRoles(new HashSet<>(Set.of(adminRole)));

    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("USER")).thenReturn(Optional.of(userRole));

    Set<String> result = roleService.setUserRoles(1L, Set.of("USER"));

    assertThat(result).containsExactly("USER");
    assertThat(userEntity.getRoles()).containsExactly(userRole);
  }

  /* =======================
     ADD USER ROLES
  ======================= */

  @Test
  void addUserRoles_success() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(adminRole));

    Set<String> result = roleService.addUserRoles(1L, Set.of("ADMIN"));

    assertThat(result).contains("USER", "ADMIN");
    verify(userRepository).save(userEntity);
  }

  @Test
  void addUserRoles_returnsCurrentRoles_whenRolesSetIsEmpty() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.addUserRoles(1L, Set.of());

    assertThat(result).containsExactly("USER");
    verify(userRepository, never()).save(any());
  }

  @Test
  void addUserRoles_returnsCurrentRoles_whenRolesSetIsNull() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.addUserRoles(1L, null);

    assertThat(result).containsExactly("USER");
    verify(userRepository, never()).save(any());
  }

  @Test
  void addUserRoles_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findWithRolesById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> roleService.addUserRoles(99L, Set.of("ADMIN")))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");
  }

  /* =======================
     REMOVE USER ROLES
  ======================= */

  @Test
  void removeUserRoles_success() {
    userEntity.setRoles(new HashSet<>(Set.of(adminRole, userRole)));

    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.removeUserRoles(1L, Set.of("ADMIN"));

    assertThat(result).containsExactly("USER");
    verify(userRepository).save(userEntity);
  }

  @Test
  void removeUserRoles_returnsCurrentRoles_whenRolesSetIsEmpty() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.removeUserRoles(1L, Set.of());

    assertThat(result).containsExactly("USER");
    verify(userRepository, never()).save(any());
  }

  @Test
  void removeUserRoles_returnsCurrentRoles_whenRolesSetIsNull() {
    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.removeUserRoles(1L, null);

    assertThat(result).containsExactly("USER");
    verify(userRepository, never()).save(any());
  }

  @Test
  void removeUserRoles_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findWithRolesById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> roleService.removeUserRoles(99L, Set.of("ADMIN")))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");
  }

  @Test
  void removeUserRoles_doesNotFail_whenRoleNotAssignedToUser() {
    userEntity.setRoles(new HashSet<>(Set.of(userRole)));

    when(userRepository.findWithRolesById(1L)).thenReturn(Optional.of(userEntity));

    Set<String> result = roleService.removeUserRoles(1L, Set.of("ADMIN"));

    assertThat(result).containsExactly("USER");
    verify(userRepository).save(userEntity);
  }
}