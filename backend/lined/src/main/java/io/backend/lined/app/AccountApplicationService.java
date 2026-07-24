package io.backend.lined.app;

import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import java.util.Set;

public interface AccountApplicationService {

  UserDto registerUser(UserCreateDto createDto);

  UserDto setRoles(Long userId, Set<String> roles);

}
