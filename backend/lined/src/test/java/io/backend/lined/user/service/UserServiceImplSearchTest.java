package io.backend.lined.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.api.UserPageDto;
import io.backend.lined.user.api.UserSearchResultDto;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceImplSearchTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private RoleRepository roleRepository;

  @Mock
  private UserMapper userMapper;

  @Mock
  private PasswordEncoder passwordEncoder;

  @InjectMocks
  private UserServiceImpl userService;

  private UserEntity userEntity;
  private UserSearchResultDto searchResultDto;

  @BeforeEach
  void setUp() {
    userEntity = new UserEntity();
    userEntity.setId(1L);
    userEntity.setUsername("testuser");
    userEntity.setEmail("test@example.com");
    userEntity.setPassword("encoded_password");
    userEntity.setCreatedAt(OffsetDateTime.now());

    searchResultDto = new UserSearchResultDto(
        1L, "testuser", "test@example.com", userEntity.getCreatedAt(), Set.of()
    );
  }

  /* ======================= SEARCH ======================= */

  @Test
  void findUsers_returnsPagedResults_whenQueryMatches() {
    Page<UserEntity> page = new PageImpl<>(List.of(userEntity));
    when(userRepository.searchWithRoles(eq("test"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);

    UserPageDto result = userService.findUsers("test", 0, 20);

    assertThat(result).isNotNull();
    assertThat(result.content()).hasSize(1);
    assertThat(result.content().get(0).username()).isEqualTo("testuser");
    assertThat(result.page()).isZero();
    assertThat(result.size()).isEqualTo(20);
    assertThat(result.totalElements()).isEqualTo(1);
    assertThat(result.totalPages()).isEqualTo(1);
    verify(userRepository).searchWithRoles(eq("test"), any(Pageable.class));
  }

  @Test
  void findUsers_returnsEmpty_whenNoMatch() {
    Page<UserEntity> emptyPage = new PageImpl<>(List.of());
    when(userRepository.searchWithRoles(eq("unknown"), any(Pageable.class))).thenReturn(emptyPage);

    UserPageDto result = userService.findUsers("unknown", 0, 20);

    assertThat(result).isNotNull();
    assertThat(result.content()).isEmpty();
    assertThat(result.totalElements()).isZero();
    verify(userMapper, never()).toSearchResultDto(any());
  }

  @Test
  void findUsers_appliesPagination() {
    UserEntity user2 = new UserEntity();
    user2.setId(2L);
    user2.setUsername("testuser2");
    user2.setEmail("test2@example.com");

    UserSearchResultDto searchResult2 = new UserSearchResultDto(
        2L, "testuser2", "test2@example.com", OffsetDateTime.now(), Set.of()
    );

    Page<UserEntity> page = new PageImpl<>(List.of(userEntity, user2));
    when(userRepository.searchWithRoles(eq("test"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);
    when(userMapper.toSearchResultDto(user2)).thenReturn(searchResult2);

    UserPageDto result = userService.findUsers("test", 0, 2);

    assertThat(result.content()).hasSize(2);
    assertThat(result.size()).isEqualTo(2);
    assertThat(result.page()).isZero();
  }

  @Test
  void findUsers_returnsCorrectTotalPages_whenMultiplePagesExist() {
    Page<UserEntity> page = new PageImpl<>(List.of(userEntity), Pageable.ofSize(1), 3);
    when(userRepository.searchWithRoles(eq("test"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);

    UserPageDto result = userService.findUsers("test", 0, 1);

    assertThat(result.totalElements()).isEqualTo(3);
    assertThat(result.totalPages()).isEqualTo(3);
  }

  @Test
  void search_mapsAllUsersToFindUsersResultDto() {
    UserEntity user2 = new UserEntity();
    user2.setId(2L);
    user2.setUsername("another");
    user2.setEmail("another@example.com");

    UserSearchResultDto anotherDto = new UserSearchResultDto(
        2L, "another", "another@example.com", OffsetDateTime.now(), Set.of()
    );

    Page<UserEntity> page = new PageImpl<>(List.of(userEntity, user2));
    when(userRepository.searchWithRoles(eq("a"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);
    when(userMapper.toSearchResultDto(user2)).thenReturn(anotherDto);

    UserPageDto result = userService.findUsers("a", 0, 20);

    assertThat(result.content()).hasSize(2);
    verify(userMapper).toSearchResultDto(userEntity);
    verify(userMapper).toSearchResultDto(user2);
  }

  /* ======================= GET BY ROLE ======================= */

  @Test
  void findUsersByRole_returnsUsers_whenRoleExists() {
    RoleEntity role = new RoleEntity();
    role.setName("ADMIN");

    Page<UserEntity> page = new PageImpl<>(List.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(role));
    when(userRepository.findAllByRoleName(eq("ADMIN"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);

    UserPageDto result = userService.findUsersByRole("ADMIN", 0, 20);

    assertThat(result).isNotNull();
    assertThat(result.content()).hasSize(1);
    assertThat(result.content().get(0).username()).isEqualTo("testuser");
    verify(roleRepository).findByNameIgnoreCase("ADMIN");
    verify(userRepository).findAllByRoleName(eq("ADMIN"), any(Pageable.class));
  }

  @Test
  void findUsersByRole_throwsNotFound_whenRoleDoesNotExist() {
    when(roleRepository.findByNameIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.findUsersByRole("UNKNOWN", 0, 20))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("Role not found");

    verify(userRepository, never()).findAllByRoleName(any(), any());
  }

  @Test
  void findUsersByRole_returnsEmpty_whenNoUsersHaveRole() {
    RoleEntity role = new RoleEntity();
    role.setName("SUPERADMIN");

    Page<UserEntity> emptyPage = new PageImpl<>(List.of());
    when(roleRepository.findByNameIgnoreCase("SUPERADMIN")).thenReturn(Optional.of(role));
    when(userRepository.findAllByRoleName(eq("SUPERADMIN"), any(Pageable.class))).thenReturn(
        emptyPage);

    UserPageDto result = userService.findUsersByRole("SUPERADMIN", 0, 20);

    assertThat(result.content()).isEmpty();
    assertThat(result.totalElements()).isZero();
    verify(userMapper, never()).toSearchResultDto(any());
  }

  @Test
  void findUsersByRole_isCaseInsensitive() {
    RoleEntity role = new RoleEntity();
    role.setName("admin");

    Page<UserEntity> page = new PageImpl<>(List.of(userEntity));
    when(roleRepository.findByNameIgnoreCase("admin")).thenReturn(Optional.of(role));
    when(userRepository.findAllByRoleName(eq("admin"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);

    UserPageDto result = userService.findUsersByRole("admin", 0, 20);

    assertThat(result.content()).hasSize(1);
    verify(roleRepository).findByNameIgnoreCase("admin");
  }

  @Test
  void findUsersByRole_appliesPagination() {
    RoleEntity role = new RoleEntity();
    role.setName("USER");

    Page<UserEntity> page = new PageImpl<>(List.of(userEntity), Pageable.ofSize(1), 5);
    when(roleRepository.findByNameIgnoreCase("USER")).thenReturn(Optional.of(role));
    when(userRepository.findAllByRoleName(eq("USER"), any(Pageable.class))).thenReturn(page);
    when(userMapper.toSearchResultDto(userEntity)).thenReturn(searchResultDto);

    UserPageDto result = userService.findUsersByRole("USER", 0, 1);

    assertThat(result.size()).isEqualTo(1);
    assertThat(result.totalElements()).isEqualTo(5);
    assertThat(result.totalPages()).isEqualTo(5);
  }
}