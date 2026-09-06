package io.backend.lined.role.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoleAuthorizationPolicyTest {

  private static final long REQUESTER_ID = 7L;

  @Mock
  private UserRepository userRepository;

  @InjectMocks
  private RoleAuthorizationPolicy authorizationPolicy;

  private UserEntity requester;

  @BeforeEach
  void setUp() {
    requester = new UserEntity();
    requester.setId(REQUESTER_ID);
  }

  @Test
  void ensureAdmin_allowsAdministrator() {
    requester.setRoles(Set.of(RoleEntity.builder().name("ROLE_ADMIN").build()));
    when(userRepository.findWithRolesById(REQUESTER_ID)).thenReturn(Optional.of(requester));

    authorizationPolicy.ensureAdmin(REQUESTER_ID);

    verify(userRepository).findWithRolesById(REQUESTER_ID);
  }

  @Test
  void ensureAdmin_rejectsNonAdministrator() {
    requester.setRoles(Set.of(RoleEntity.builder().name("ROLE_USER").build()));
    when(userRepository.findWithRolesById(REQUESTER_ID)).thenReturn(Optional.of(requester));

    assertThatThrownBy(() -> authorizationPolicy.ensureAdmin(REQUESTER_ID))
        .isInstanceOf(ForbiddenException.class)
        .hasMessage("Only administrators can manage roles");
  }

  @Test
  void ensureAdmin_rejectsMissingUser() {
    when(userRepository.findWithRolesById(REQUESTER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authorizationPolicy.ensureAdmin(REQUESTER_ID))
        .isInstanceOf(ForbiddenException.class)
        .hasMessage("Only administrators can manage roles");
  }
}
