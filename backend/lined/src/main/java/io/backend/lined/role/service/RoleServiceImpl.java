package io.backend.lined.role.service;

import static java.lang.String.format;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.api.RoleDto;
import io.backend.lined.role.api.RoleMapper;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleServiceImpl implements RoleService {

  private static final String USER_NOT_FOUND_ERROR_MESSAGE = "User not found: %s";

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final RoleMapper roleMapper;
  private final RoleResolver roleResolver;
  private final RoleAuthorizationPolicy authorizationPolicy;

  @Override
  public List<RoleDto> listAll() {
    return roleRepository.findAll().stream()
        .map(roleMapper::toDto)
        .toList();
  }

  @Override
  public void ensureExists(String roleName) {
    if (roleName == null || roleName.isBlank()) {
      return;
    }

    Optional<RoleEntity> foundRoleEntity = roleRepository.findByNameIgnoreCase(roleName);

    if (foundRoleEntity.isEmpty()) {
      roleRepository.save(RoleEntity.builder().name(roleName).build());
    }
  }

  @Override
  public void ensureExistsAsAdmin(String roleName, Long requesterId) {
    authorizationPolicy.ensureAdmin(requesterId);
    ensureExists(roleName);
  }

  @Override
  public Set<String> setUserRoles(Long userId, Set<String> roles) {
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, userId)));

    Set<RoleEntity> newRoles = roleResolver.resolve(roles);

    user.setRoles(newRoles);
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  @Override
  public Set<String> setUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles) {
    authorizationPolicy.ensureAdmin(requesterId);
    return setUserRoles(userId, roles);
  }

  @Override
  public Set<String> addUserRoles(Long userId, Set<String> roles) {
    if (roles == null || roles.isEmpty()) {
      return getUserRoleNames(userId);
    }

    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, userId)));

    Set<RoleEntity> add = roleResolver.resolve(roles);
    user.getRoles().addAll(add);
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  @Override
  public Set<String> addUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles) {
    authorizationPolicy.ensureAdmin(requesterId);
    return addUserRoles(userId, roles);
  }

  @Override
  public Set<String> removeUserRoles(Long userId, Set<String> roles) {
    if (roles == null || roles.isEmpty()) {
      return getUserRoleNames(userId);
    }
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, userId)));

    Set<String> toRemove = roles.stream().filter(Objects::nonNull)
        .map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());

    user.getRoles().removeIf(r -> toRemove.contains(r.getName().toLowerCase(Locale.ROOT)));
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  @Override
  public Set<String> removeUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles) {
    authorizationPolicy.ensureAdmin(requesterId);
    return removeUserRoles(userId, roles);
  }

  private Set<String> getUserRoleNames(Long userId) {
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException(format(USER_NOT_FOUND_ERROR_MESSAGE, userId)));
    return toNames(user.getRoles());
  }

  private Set<String> toNames(Set<RoleEntity> roles) {
    return roles.stream()
        .map(RoleEntity::getName)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }
}
