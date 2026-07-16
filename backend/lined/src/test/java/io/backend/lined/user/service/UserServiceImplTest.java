package io.backend.lined.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.role.domain.BuiltInRole;
import io.backend.lined.role.service.RoleResolver;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.api.UserUpdateDto;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.List;
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

  private static final long USER_ID = 1L;
  private static final long MISSING_USER_ID = 99L;
  private static final String USERNAME = "testuser";
  private static final String USER_EMAIL = "test@example.com";
  private static final String PASSWORD = "password";
  private static final String ENCODED_PASSWORD = "encoded_password";
  private static final String ENCODED_VALUE = "encoded";
  private static final String NEW_USERNAME = "newuser";
  private static final String TAKEN_USERNAME = "takenuser";
  private static final String TAKEN_EMAIL = "taken@example.com";
  private static final String NEW_EMAIL = "new@example.com";
  private static final String NEW_PASSWORD = "newpassword";
  private static final String ENCODED_NEW_PASSWORD = "encoded_new";
  private static final String ADMIN_ROLE = BuiltInRole.ADMIN.value();
  private static final String UNKNOWN_ROLE = "UNKNOWN_ROLE";
  private static final String USER_NOT_FOUND_MESSAGE = "User not found";
  private static final String USERNAME_EXISTS_MESSAGE = "Username already exists";
  private static final String EMAIL_EXISTS_MESSAGE = "Email already exists";

  @Mock
  private UserRepository userRepository;
  @Mock
  private UserMapper userMapper;
  @Mock
  private PasswordEncoder passwordEncoder;
  @Mock
  private RoleResolver roleResolver;
  @Mock
  private LobbyRepository lobbyRepository;

  @InjectMocks
  private UserServiceImpl userService;

  private UserEntity testUser;
  private UserDto expectedDto;

  @BeforeEach
  void setUp() {
    testUser = new UserEntity();
    testUser.setId(USER_ID);
    testUser.setUsername(USERNAME);
    testUser.setEmail(USER_EMAIL);
    testUser.setPassword(ENCODED_PASSWORD);

    expectedDto = new UserDto(USER_ID, USERNAME, USER_EMAIL, null, Set.of(), null, null);
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    UserCreateDto dto = new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of());

    when(userRepository.existsByUsernameIgnoreCase(USERNAME)).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(USER_EMAIL)).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(testUser);
    when(passwordEncoder.encode(PASSWORD)).thenReturn(ENCODED_PASSWORD);
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.create(dto);

    assertThat(result).isEqualTo(expectedDto);
    verify(userRepository).save(testUser);
  }

  @Test
  void create_throwsConflict_whenUsernameExists() {
    UserCreateDto dto = new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of());

    when(userRepository.existsByUsernameIgnoreCase(USERNAME)).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(USERNAME_EXISTS_MESSAGE);

    verify(userRepository, never()).save(any());
  }

  @Test
  void create_throwsConflict_whenEmailExists() {
    UserCreateDto dto = new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of());

    when(userRepository.existsByUsernameIgnoreCase(USERNAME)).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(USER_EMAIL)).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(EMAIL_EXISTS_MESSAGE);

    verify(userRepository, never()).save(any());
  }

  @Test
  void create_ignoresSuppliedRoles() {
    UserCreateDto dto =
        new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of(ADMIN_ROLE));

    when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(testUser);
    when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_VALUE);
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.create(dto);

    assertThat(result).isNotNull();
    assertThat(testUser.getRoles()).isNullOrEmpty();
    verify(roleResolver, never()).resolve(any());
  }

  @Test
  void create_doesNotResolveUnknownSuppliedRoles() {
    UserCreateDto dto =
        new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of(UNKNOWN_ROLE));

    when(userRepository.existsByUsernameIgnoreCase(anyString())).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
    when(userMapper.toEntity(dto)).thenReturn(testUser);
    when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_VALUE);
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.create(dto);

    assertThat(result).isEqualTo(expectedDto);
    verify(roleResolver, never()).resolve(any());
  }

  /* =======================
     GET BY ID
  ======================= */

  @Test
  void getById_success() {
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.getById(USER_ID);

    assertThat(result).isEqualTo(expectedDto);
  }

  @Test
  void getById_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.getById(MISSING_USER_ID))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);
  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_success() {
    UserUpdateDto dto = new UserUpdateDto(NEW_USERNAME, null, null, null);

    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.existsByUsernameIgnoreCase(NEW_USERNAME)).thenReturn(false);
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.update(USER_ID, dto);

    assertThat(result).isNotNull();
    verify(userMapper).updateEntity(testUser, dto);
  }

  @Test
  void update_ignoresSuppliedRoles() {
    UserUpdateDto dto = new UserUpdateDto(null, null, null, Set.of(ADMIN_ROLE));

    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.update(USER_ID, dto);

    assertThat(result).isEqualTo(expectedDto);
    assertThat(testUser.getRoles()).isNullOrEmpty();
    verify(userMapper).updateEntity(testUser, dto);
    verify(roleResolver, never()).resolve(any());
  }

  @Test
  void update_throwsNotFound_whenUserDoesNotExist() {
    UserUpdateDto dto = new UserUpdateDto(NEW_USERNAME, null, null, null);

    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.update(MISSING_USER_ID, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);
  }

  @Test
  void update_throwsConflict_whenNewUsernameAlreadyTaken() {
    UserUpdateDto dto = new UserUpdateDto(TAKEN_USERNAME, null, null, null);

    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.existsByUsernameIgnoreCase(TAKEN_USERNAME)).thenReturn(true);

    assertThatThrownBy(() -> userService.update(USER_ID, dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(USERNAME_EXISTS_MESSAGE);
  }

  @Test
  void update_throwsConflict_whenNewEmailAlreadyTaken() {
    UserUpdateDto dto = new UserUpdateDto(null, TAKEN_EMAIL, null, null);

    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.existsByEmailIgnoreCase(TAKEN_EMAIL)).thenReturn(true);

    assertThatThrownBy(() -> userService.update(USER_ID, dto))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(EMAIL_EXISTS_MESSAGE);
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(lobbyRepository.findAllByOwner_Id(USER_ID)).thenReturn(List.of());

    userService.delete(USER_ID, USER_ID);

    verify(userRepository).delete(testUser);
  }

  @Test
  void delete_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.delete(MISSING_USER_ID, MISSING_USER_ID))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);

    verify(userRepository, never()).delete(any());
  }

  @Test
  void delete_throwsForbidden_whenRequesterIsAnotherUser() {
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

    assertThatThrownBy(() -> userService.delete(USER_ID, MISSING_USER_ID))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("own account");

    verify(userRepository, never()).delete(any());
  }

  @Test
  void delete_throwsNotFound_whenAnotherRequesterTargetsMissingUser() {
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.delete(MISSING_USER_ID, USER_ID))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);
  }

  @Test
  void delete_throwsConflict_whenUserOwnsLobby() {
    var ownedLobby = new LobbyEntity();
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(lobbyRepository.findAllByOwner_Id(USER_ID)).thenReturn(List.of(ownedLobby));

    assertThatThrownBy(() -> userService.delete(USER_ID, USER_ID))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("Transfer ownership");

    verify(userRepository, never()).delete(any());
  }

  /* =======================
     CHANGE PASSWORD
  ======================= */

  @Test
  void changePassword_success() {
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_NEW_PASSWORD);

    userService.changePassword(USER_ID, NEW_PASSWORD);

    assertThat(testUser.getPassword()).isEqualTo(ENCODED_NEW_PASSWORD);
    verify(userRepository).save(testUser);
  }

  @Test
  void changePassword_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changePassword(MISSING_USER_ID, NEW_PASSWORD))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);

    verify(userRepository, never()).save(any());
  }

  /* =======================
     CHANGE EMAIL
  ======================= */

  @Test
  void changeEmail_success() {
    when(userRepository.existsByEmailIgnoreCase(NEW_EMAIL)).thenReturn(false);
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.changeEmail(USER_ID, NEW_EMAIL);

    assertThat(result).isNotNull();
    assertThat(testUser.getEmail()).isEqualTo(NEW_EMAIL);
  }

  @Test
  void changeEmail_throwsConflict_whenEmailAlreadyExists() {
    when(userRepository.existsByEmailIgnoreCase(TAKEN_EMAIL)).thenReturn(true);

    assertThatThrownBy(() -> userService.changeEmail(USER_ID, TAKEN_EMAIL))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(EMAIL_EXISTS_MESSAGE);

    verify(userRepository, never()).save(any());
  }

  @Test
  void changeEmail_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.existsByEmailIgnoreCase(NEW_EMAIL)).thenReturn(false);
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changeEmail(MISSING_USER_ID, NEW_EMAIL))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);
  }

  /* =======================
     CHANGE USERNAME
  ======================= */

  @Test
  void changeUsername_success() {
    when(userRepository.existsByUsernameIgnoreCase(NEW_USERNAME)).thenReturn(false);
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
    when(userRepository.save(testUser)).thenReturn(testUser);
    when(userMapper.toDto(testUser)).thenReturn(expectedDto);

    UserDto result = userService.changeUsername(USER_ID, NEW_USERNAME);

    assertThat(result).isNotNull();
    assertThat(testUser.getUsername()).isEqualTo(NEW_USERNAME);
  }

  @Test
  void changeUsername_throwsConflict_whenUsernameAlreadyExists() {
    when(userRepository.existsByUsernameIgnoreCase(TAKEN_USERNAME)).thenReturn(true);

    assertThatThrownBy(() -> userService.changeUsername(USER_ID, TAKEN_USERNAME))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining(USERNAME_EXISTS_MESSAGE);

    verify(userRepository, never()).save(any());
  }

  @Test
  void changeUsername_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.existsByUsernameIgnoreCase(NEW_USERNAME)).thenReturn(false);
    when(userRepository.findById(MISSING_USER_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.changeUsername(MISSING_USER_ID, NEW_USERNAME))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining(USER_NOT_FOUND_MESSAGE);
  }
}
