package io.backend.lined.role.service;

import io.backend.lined.role.domain.RoleEntity;
import java.util.Set;

public interface RoleResolver {

  Set<RoleEntity> resolve(Set<String> roleNames);
}
