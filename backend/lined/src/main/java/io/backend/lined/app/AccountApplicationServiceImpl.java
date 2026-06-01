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
  private final AccountProvisioningPolicy provisioningPolicy;

  @Override
  @Transactional
  public UserDto registerUser(UserCreateDto createDto) {
    AccountProvisioningSpec provisioning = provisioningPolicy.defaultRegistration();
    UserDto user = userService.create(createDto);
    roleService.setUserRoles(user.id(), provisioning.roleNames());

    PlanDto defaultPlan = planService.getByName(provisioning.planName());
    subscriptionService.start(
        user.id(), defaultPlan.id(), null, null, provisioning.activeSubscription());

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
