package io.backend.lined.role.service;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.role.domain.BuiltInRole;
import io.backend.lined.user.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Resolves administrative authority from database-backed role state. */
@Component
@RequiredArgsConstructor
public class RoleAuthorizationPolicy {

  private final UserRepository userRepository;

  /** Requires the trusted subject to have the built-in administrator role. */
  public void ensureAdmin(Long requesterId) {
    boolean admin = userRepository.findWithRolesById(requesterId)
        .map(user -> user.getRoles().stream()
            .anyMatch(role -> BuiltInRole.ADMIN.value().equalsIgnoreCase(role.getName())))
        .orElse(false);
    if (!admin) {
      throw new ForbiddenException("Only administrators can manage roles");
    }
  }
}
