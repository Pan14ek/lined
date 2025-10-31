package io.backend.lined.role.service;

import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class RoleServiceImpl implements RoleService {
  @Override
  public Set<String> listAll() {
    return Set.of();
  }

  @Override
  public void ensureExists(String roleName) {

  }

  @Override
  public Set<String> setUserRoles(Long userId, Set<String> roles) {
    return Set.of();
  }

  @Override
  public Set<String> addUserRoles(Long userId, Set<String> roles) {
    return Set.of();
  }

  @Override
  public Set<String> removeUserRoles(Long userId, Set<String> roles) {
    return Set.of();
  }
}
