package io.backend.lined.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.api.UserUpdateDto;
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
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

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
  private UserDto userDto;

  @BeforeEach
  void setUp() {
    userEntity = new UserEntity();
    userEntity.setId(1L);
    userEntity.setUsername("testuser");
    userEntity.setEmail("test@example.com");
    userEntity.setPassword("encoded_password");

    userDto = new UserDto(1L, "testuser", "test@example.com", null, Set.of(), null, null);
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    UserCreateDto dto = new UserCreateDto("testuser", "test@example.com", "password", Set.of());

    when(userRepository.existsByUsernameIgnoreCase("testuser")).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase("test@example.com")).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(userEntity);
    when(passwordEncoder.encode("password")).thenReturn("encoded_password");
    when(userRepository.save(userEntity)).thenReturn(userEntity);
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.create(dto);

    assertThat(result).isEqualTo(userDto);
    verify(userRepository).save(userEntity);
  }

  @Test
  void create_throwsConflict_whenUsernameExists() {
    UserCreateDto dto = new UserCreateDto("testuser", "test@example.com", "password", Set.of());

    when(userRepository.existsByUsernameIgnoreCase("testuser")).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Username already exists");

    verify(userRepository, never()).save(any());
  }

  @Test
  void create_throwsConflict_whenEmailExists() {
    UserCreateDto dto = new UserCreateDto("testuser", "test@example.com", "password", Set.of());

    when(userRepository.existsByUsernameIgnoreCase("testuser")).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase("test@example.com")).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Email already exists");

    verify(userRepository, never()).save(any());
  }

  @Test
  void create_withRoles_resolvesRolesCorrectly() {
    UserCreateDto dto =
        new UserCreateDto("testuser", "test@example.com", "password", Set.of("ADMIN"));
    RoleEntity role = new RoleEntity();
    role.setName("ADMIN");

    when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(userEntity);
    when(passwordEncoder.encode(anyString())).thenReturn("encoded");
    when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(role));
    when(userRepository.save(userEntity)).thenReturn(userEntity);
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.create(dto);

    assertThat(result).isNotNull();
    verify(roleRepository).findByNameIgnoreCase("ADMIN");
  }

  @Test
  void create_throwsNotFound_whenRoleDoesNotExist() {
    UserCreateDto dto =
        new UserCreateDto("testuser", "test@example.com", "password", Set.of("UNKNOWN_ROLE"));

    when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(userEntity);
    when(passwordEncoder.encode(anyString())).thenReturn("encoded");
    when(roleRepository.findByNameIgnoreCase("UNKNOWN_ROLE")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("Role not found");
  }

  /* =======================
     GET BY ID
  ======================= */

  @Test
  void getById_success() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.getById(1L);

    assertThat(result).isEqualTo(userDto);
  }

//  @Test
//  void getById_throwsNotFound_whenUserDoesNotExist() {
//    when(userRepository.findById(99L)).thenReturn(Optional.empty());
//
//    assertThatThrownBy(() -> userService.getById(99L))
//        .isInstanceOf(NotFoundException.class)
//        .hasMessageContaining("User not found");
//  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_success() {
    UserUpdateDto dto = new UserUpdateDto("newuser", null, null, null);

    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
    when(userRepository.save(userEntity)).thenReturn(userEntity);
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.update(1L, dto);

    assertThat(result).isNotNull();
    verify(userMapper).updateEntity(userEntity, dto);
  }

  @Test
  void update_throwsNotFound_whenUserDoesNotExist() {
    UserUpdateDto dto = new UserUpdateDto("newuser", null, null, null);

    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.update(99L, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");
  }

  @Test
  void update_throwsConflict_whenNewUsernameAlreadyTaken() {
    UserUpdateDto dto = new UserUpdateDto("takenuser", null, null, null);

    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userRepository.existsByUsernameIgnoreCase("takenuser")).thenReturn(true);

    assertThatThrownBy(() -> userService.update(1L, dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Username already exists");
  }

  @Test
  void update_throwsConflict_whenNewEmailAlreadyTaken() {
    UserUpdateDto dto = new UserUpdateDto(null, "taken@example.com", null, null);

    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

    assertThatThrownBy(() -> userService.update(1L, dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Email already exists");
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(userRepository.existsById(1L)).thenReturn(true);

    userService.delete(1L);

    verify(userRepository).deleteById(1L);
  }

  @Test
  void delete_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> userService.delete(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");

    verify(userRepository, never()).deleteById(any());
  }

  /* =======================
     CHANGE PASSWORD
  ======================= */

  @Test
  void changePassword_success() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(passwordEncoder.encode("newpassword")).thenReturn("encoded_new");

    userService.changePassword(1L, "newpassword");

    assertThat(userEntity.getPassword()).isEqualTo("encoded_new");
    verify(userRepository).save(userEntity);
  }

  @Test
  void changePassword_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changePassword(99L, "newpassword"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");

    verify(userRepository, never()).save(any());
  }

  /* =======================
     CHANGE EMAIL
  ======================= */

  @Test
  void changeEmail_success() {
    when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userRepository.save(userEntity)).thenReturn(userEntity);
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.changeEmail(1L, "new@example.com");

    assertThat(result).isNotNull();
    assertThat(userEntity.getEmail()).isEqualTo("new@example.com");
  }

  @Test
  void changeEmail_throwsConflict_whenEmailAlreadyExists() {
    when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

    assertThatThrownBy(() -> userService.changeEmail(1L, "taken@example.com"))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Email already exists");

    verify(userRepository, never()).save(any());
  }

  @Test
  void changeEmail_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changeEmail(99L, "new@example.com"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");
  }

  /* =======================
     CHANGE USERNAME
  ======================= */

  @Test
  void changeUsername_success() {
    when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
    when(userRepository.findById(1L)).thenReturn(Optional.of(userEntity));
    when(userRepository.save(userEntity)).thenReturn(userEntity);
    when(userMapper.toDto(userEntity)).thenReturn(userDto);

    UserDto result = userService.changeUsername(1L, "newuser");

    assertThat(result).isNotNull();
    assertThat(userEntity.getUsername()).isEqualTo("newuser");
  }

  @Test
  void changeUsername_throwsConflict_whenUsernameAlreadyExists() {
    when(userRepository.existsByUsernameIgnoreCase("takenuser")).thenReturn(true);

    assertThatThrownBy(() -> userService.changeUsername(1L, "takenuser"))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Username already exists");

    verify(userRepository, never()).save(any());
  }

  @Test
  void changeUsername_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changeUsername(99L, "newuser"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("User not found");
  }
}