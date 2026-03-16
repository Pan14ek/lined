package io.backend.lined.app;

import io.backend.lined.subscription.api.dto.SubscriptionDto;
import io.backend.lined.user.api.dto.UserCreateDto;
import io.backend.lined.user.api.dto.UserDto;
import java.util.Set;

public interface AccountApplicationService {

  UserDto registerUser(UserCreateDto createDto, boolean assignDefaultRole, boolean startFreePlan);

  UserDto setRoles(Long userId, Set<String> roles);

  SubscriptionDto activatePlan(Long userId, String planName);

}
