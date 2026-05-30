package io.backend.lined.user.service;

import static java.lang.String.format;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.service.RoleResolver;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.api.UserMapper;
import io.backend.lined.user.api.UserPageDto;
import io.backend.lined.user.api.UserSearchResultDto;
import io.backend.lined.user.api.UserUpdateDto;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

  private static final String USER_NOT_FOUND_ERROR_MESSAGE = "User not found: %s";
  private static final String USERNAME_ALREADY_EXISTS_ERROR_MESSAGE = "Username already exists: %s";

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;
  private final RoleResolver roleResolver;

  @Override
  public UserDto create(UserCreateDto dto) {
    if (userRepository.existsByUsernameIgnoreCase(dto.username())) {
      throw new ConflictException(format(USERNAME_ALREADY_EXISTS_ERROR_MESSAGE, dto.username()));
    }
    if (userRepository.existsByEmailIgnoreCase(dto.email())) {
      throw new ConflictException("Email already exists: " + dto.email());
    }

    UserEntity entity = userMapper.toEntity(dto);
    entity.setPassword(passwordEncoder.encode(dto.password()));

    if (dto.roles() != null && !dto.roles().isEmpty()) {
      entity.setRoles(roleResolver.resolve(dto.roles()));
    }

    try {
      return userMapper.toDto(userRepository.save(entity));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Username or email already taken");
    }
  }

  @Override
  public UserDto getById(Long id) {
    UserEntity u = mustUser(id);
    return userMapper.toDto(u);
  }

  @Override
  public UserDto update(Long id, UserUpdateDto dto) {
    UserEntity entity = mustUser(id);

    if (dto.username() != null && !dto.username().equalsIgnoreCase(entity.getUsername()) &&
        userRepository.existsByUsernameIgnoreCase(dto.username())) {
      throw new ConflictException(format(USERNAME_ALREADY_EXISTS_ERROR_MESSAGE, dto.username()));
    }

    if (dto.email() != null && !dto.email().equalsIgnoreCase(entity.getEmail()) &&
        userRepository.existsByEmailIgnoreCase(dto.email())) {
      throw new ConflictException("Email already exists: " + dto.email());
    }


    if (dto.password() != null) {
      entity.setPassword(passwordEncoder.encode(dto.password()));
    }

    userMapper.updateEntity(entity, dto);

    if (dto.roles() != null) {
      entity.setRoles(roleResolver.resolve(dto.roles()));
    }

    try {
      return userMapper.toDto(userRepository.save(entity));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Username or email already taken");
    }
  }

  @Override
  public void delete(Long id) {
    if (!userRepository.existsById(id)) {
      throw new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, id));
    }
    userRepository.deleteById(id);
  }

  @Override
  public void changePassword(Long userId, String rawNewPassword) {
    UserEntity u = mustUser(userId);
    u.setPassword(passwordEncoder.encode(rawNewPassword));
    userRepository.save(u);
  }

  @Override
  public UserDto changeEmail(Long userId, String newEmail) {
    if (userRepository.existsByEmailIgnoreCase(newEmail)) {
      throw new ConflictException("Email already exists: " + newEmail);
    }
    UserEntity u = mustUser(userId);
    u.setEmail(newEmail);
    try {
      return userMapper.toDto(userRepository.save(u));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Email already taken");
    }
  }

  @Override
  public UserDto changeUsername(Long userId, String newUsername) {
    if (userRepository.existsByUsernameIgnoreCase(newUsername)) {
      throw new ConflictException(format(USERNAME_ALREADY_EXISTS_ERROR_MESSAGE, newUsername));
    }
    UserEntity u = mustUser(userId);
    u.setUsername(newUsername);
    try {
      return userMapper.toDto(userRepository.save(u));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Username already taken");
    }
  }

  @Override
  public UserPageDto findUsers(String query, int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    Page<UserEntity> result = userRepository.searchWithRoles(query, pageable);
    List<UserSearchResultDto> content = result.getContent()
        .stream()
        .map(userMapper::toSearchResultDto)
        .toList();
    return new UserPageDto(content, page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Override
  public UserPageDto findUsersByRole(String roleName, int page, int size) {
    roleResolver.resolve(Set.of(roleName));
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    Page<UserEntity> result = userRepository.findAllByRoleName(roleName, pageable);
    List<UserSearchResultDto> content = result.getContent()
        .stream()
        .map(userMapper::toSearchResultDto)
        .toList();
    return new UserPageDto(content, page, size, result.getTotalElements(), result.getTotalPages());
  }

  private UserEntity mustUser(Long id) {
    return EntityFinder.findOrThrow(
        userRepository.findById(id),
        () -> new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, id)));
  }

}
