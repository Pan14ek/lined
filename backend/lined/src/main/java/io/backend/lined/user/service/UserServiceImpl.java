package io.backend.lined.user.service;

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
import jakarta.transaction.Transactional;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;

  @Override
  public UserDto create(UserCreateDto dto) {
    if (userRepository.existsByUsernameIgnoreCase(dto.username())) {
      throw new ConflictException("Username already exists: " + dto.username());
    }
    if (userRepository.existsByEmailIgnoreCase(dto.email())) {
      throw new ConflictException("Email already exists: " + dto.email());
    }

    UserEntity entity = userMapper.toEntity(dto);
    entity.setPassword(passwordEncoder.encode(dto.password()));

    if (dto.roles() != null && !dto.roles().isEmpty()) {
      entity.setRoles(resolveRoles(dto.roles()));
    }

    try {
      return userMapper.toDto(userRepository.save(entity));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Username or email already taken");
    }
  }

  @Override
  public UserDto getById(Long id) {
    UserEntity u = userRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("User not found: " + id));
    return userMapper.toDto(u);
  }

  @Override
  public UserDto update(Long id, UserUpdateDto dto) {
    UserEntity entity = userRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("User not found: " + id));

    if (dto.username() != null && !dto.username().equalsIgnoreCase(entity.getUsername()) &&
        userRepository.existsByUsernameIgnoreCase(dto.username())) {
      throw new ConflictException("Username already exists: " + dto.username());
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
      entity.setRoles(resolveRoles(dto.roles()));
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
      throw new NotFoundException("User not found: " + id);
    }
    userRepository.deleteById(id);
  }

  @Override
  public void changePassword(Long userId, String rawNewPassword) {
    UserEntity u = userRepository.findById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    u.setPassword(passwordEncoder.encode(rawNewPassword));
    userRepository.save(u);
  }

  @Override
  public UserDto changeEmail(Long userId, String newEmail) {
    if (userRepository.existsByEmailIgnoreCase(newEmail)) {
      throw new ConflictException("Email already exists: " + newEmail);
    }
    UserEntity u = userRepository.findById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));
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
      throw new ConflictException("Username already exists: " + newUsername);
    }
    UserEntity u = userRepository.findById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    u.setUsername(newUsername);
    try {
      return userMapper.toDto(userRepository.save(u));
    } catch (DataIntegrityViolationException ex) {
      throw new ConflictException("Username already taken");
    }
  }

  private Set<RoleEntity> resolveRoles(Set<String> roleNames) {
    Set<RoleEntity> out = new HashSet<>();
    for (String roleName : roleNames) {
      Optional<RoleEntity> r = roleRepository.findByNameIgnoreCase(roleName);
      if (r.isEmpty()) {
        throw new NotFoundException("Role not found: " + roleName);
      }
      out.add(r.get());
    }
    return out;
  }
}
