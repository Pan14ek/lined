package io.backend.lined.app;

import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.role.service.RoleService;
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
  private final AccountProvisioningPolicy provisioningPolicy;
  private final BillingAccountService billingAccountService;

  @Override
  @Transactional
  public UserDto registerUser(UserCreateDto createDto) {
    AccountProvisioningSpec provisioning = provisioningPolicy.defaultRegistration();
    UserDto user = userService.create(createDto);
    roleService.setUserRoles(user.id(), provisioning.roleNames());
    billingAccountService.ensurePersonalAccount(user.id());

    return userService.getById(user.id());
  }

  @Override
  @Transactional
  public UserDto setRoles(Long userId, Set<String> roles) {
    roleService.setUserRoles(userId, roles);
    return userService.getById(userId);
  }

}
