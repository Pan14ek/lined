package io.backend.lined.app;

import io.backend.lined.plan.api.PlanDto;
import io.backend.lined.plan.service.PlanService;
import io.backend.lined.role.service.RoleService;
import io.backend.lined.subscription.api.SubscriptionDto;
import io.backend.lined.subscription.service.SubscriptionService;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.service.UserService;
import jakarta.transaction.Transactional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountApplicationServiceImpl implements AccountApplicationService {

  private final UserService userService;
  private final RoleService roleService;
  private final PlanService planService;
  private final SubscriptionService subscriptionService;

  @Override
  @Transactional
  public UserDto registerUser(UserCreateDto createDto, boolean assignDefaultRole,
                              boolean startFreePlan) {
    UserDto user = userService.create(createDto);
    if (assignDefaultRole) {
      roleService.addUserRoles(user.id(), Set.of("ROLE_USER"));
    }

    if (startFreePlan) {
      PlanDto free = planService.getByName("FREE");
      subscriptionService.start(user.id(), free.id(), null, null, true);
    }

    return userService.getById(user.id());
  }

  @Override
  @Transactional
  public UserDto setRoles(Long userId, Set<String> roles) {
    roleService.setUserRoles(userId, roles);
    return userService.getById(userId);
  }

  @Override
  @Transactional
  public SubscriptionDto activatePlan(Long userId, String planName) {
    PlanDto plan = planService.getByName(planName);
    return subscriptionService.start(userId, plan.id(), null, null, true);
  }
}
