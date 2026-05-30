package io.backend.lined.role.service;

import static java.lang.String.format;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.role.domain.RoleRepository;
import jakarta.transaction.Transactional;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleResolverImpl implements RoleResolver {

  private final RoleRepository roleRepository;

  @Override
  public Set<RoleEntity> resolve(Set<String> roleNames) {
    if (roleNames == null || roleNames.isEmpty()) {
      return new LinkedHashSet<>();
    }

    Set<RoleEntity> roles = new LinkedHashSet<>();
    for (String name : roleNames) {
      if (name == null || name.isBlank()) {
        continue;
      }

      RoleEntity role = roleRepository.findByNameIgnoreCase(name)
          .orElseThrow(() -> new NotFoundException(format("Role not found: %s", name)));
      roles.add(role);
    }
    return roles;
  }
}
