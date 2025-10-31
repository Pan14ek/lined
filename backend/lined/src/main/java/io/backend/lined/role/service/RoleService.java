package io.backend.lined.role.service;

import java.util.Set;

public interface RoleService {

  Set<String> listAll();                    // ["ROLE_USER", "ROLE_ADMIN", ...]

  void ensureExists(String roleName);       // idempotent init

  Set<String> setUserRoles(Long userId, Set<String> roles);

  Set<String> addUserRoles(Long userId, Set<String> roles);

  Set<String> removeUserRoles(Long userId, Set<String> roles);

}
