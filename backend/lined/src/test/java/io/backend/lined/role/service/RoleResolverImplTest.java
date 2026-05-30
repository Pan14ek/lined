package io.backend.lined.role.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoleResolverImplTest {

  @Mock
  private RoleRepository roleRepository;

  @InjectMocks
  private RoleResolverImpl roleResolver;

  @Test
  void resolve_returnsEmptySet_whenRoleNamesAreNull() {
    Set<RoleEntity> result = roleResolver.resolve(null);

    assertThat(result).isEmpty();
    verify(roleRepository, never()).findByNameIgnoreCase(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void resolve_skipsBlankRoleNames() {
    Set<RoleEntity> result = roleResolver.resolve(Set.of("   "));

    assertThat(result).isEmpty();
    verify(roleRepository, never()).findByNameIgnoreCase(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void resolve_returnsRolesInInputOrder() {
    RoleEntity userRole = RoleEntity.builder().id(1L).name("USER").build();
    RoleEntity adminRole = RoleEntity.builder().id(2L).name("ADMIN").build();

    when(roleRepository.findByNameIgnoreCase("USER")).thenReturn(Optional.of(userRole));
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(adminRole));

    Set<String> roleNames = new LinkedHashSet<>(List.of("USER", "ADMIN"));

    Set<RoleEntity> result = roleResolver.resolve(roleNames);

    assertThat(result).containsExactly(userRole, adminRole);
  }

  @Test
  void resolve_throwsNotFound_whenRoleDoesNotExist() {
    when(roleRepository.findByNameIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> roleResolver.resolve(Set.of("UNKNOWN")))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("Role not found: UNKNOWN");
  }
}
