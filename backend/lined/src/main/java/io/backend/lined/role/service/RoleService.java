package io.backend.lined.role.service;

import io.backend.lined.role.api.RoleDto;
import java.util.List;
import java.util.Set;

public interface RoleService {

  List<RoleDto> listAll();

  void ensureExists(String roleName);

  Set<String> setUserRoles(Long userId, Set<String> roles);

  Set<String> addUserRoles(Long userId, Set<String> roles);

  Set<String> removeUserRoles(Long userId, Set<String> roles);

}
