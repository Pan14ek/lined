package io.backend.lined.role.service;

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
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleServiceImpl implements RoleService {

  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final RoleMapper roleMapper;

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

    roleRepository.findByNameIgnoreCase(roleName)
        .orElseGet(() -> roleRepository.save(RoleEntity.builder().name(roleName).build()));
  }

  @Override
  public Set<String> setUserRoles(Long userId, Set<String> roles) {
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));

    Set<RoleEntity> newRoles = resolveRoles(roles);

    user.setRoles(newRoles);
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  @Override
  public Set<String> addUserRoles(Long userId, Set<String> roles) {
    if (roles == null || roles.isEmpty()) {
      return getUserRoleNames(userId);
    }

    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));

    Set<RoleEntity> add = resolveRoles(roles);
    user.getRoles().addAll(add);
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  @Override
  public Set<String> removeUserRoles(Long userId, Set<String> roles) {
    if (roles == null || roles.isEmpty()) {
      return getUserRoleNames(userId);
    }
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));

    Set<String> toRemove = roles.stream().filter(Objects::nonNull)
        .map(String::toLowerCase).collect(Collectors.toSet());

    user.getRoles().removeIf(r -> toRemove.contains(r.getName().toLowerCase()));
    userRepository.save(user);

    return toNames(user.getRoles());
  }

  private Set<String> getUserRoleNames(Long userId) {
    UserEntity user = userRepository.findWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    return toNames(user.getRoles());
  }

  private Set<RoleEntity> resolveRoles(Set<String> roleNames) {
    if (roleNames == null || roleNames.isEmpty()) {
      return new LinkedHashSet<>();
    }
    Set<RoleEntity> out = new LinkedHashSet<>();
    for (String name : roleNames) {
      if (name == null || name.isBlank()) {
        continue;
      }

      RoleEntity role = roleRepository.findByNameIgnoreCase(name)
          .orElseThrow(() -> new NotFoundException("Role not found: " + name));
      out.add(role);
    }
    return out;
  }

  private Set<String> toNames(Set<RoleEntity> roles) {
    return roles.stream()
        .map(RoleEntity::getName)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }
}
