package io.backend.lined.role.service;

import io.backend.lined.role.api.RoleDto;
import java.util.List;
import java.util.Set;

public interface RoleService {

  List<RoleDto> listAll();

  void ensureExists(String roleName);

  void ensureExistsAsAdmin(String roleName, Long requesterId);

  Set<String> setUserRoles(Long userId, Set<String> roles);

  Set<String> setUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles);

  Set<String> addUserRoles(Long userId, Set<String> roles);

  Set<String> addUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles);

  Set<String> removeUserRoles(Long userId, Set<String> roles);

  Set<String> removeUserRolesAsAdmin(Long requesterId, Long userId, Set<String> roles);

}
