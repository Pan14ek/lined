package io.backend.lined.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.plan.domain.BuiltInPlan;
import io.backend.lined.role.domain.BuiltInRole;
import io.backend.lined.role.service.RoleService;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.service.UserService;
import java.time.OffsetDateTime;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountApplicationServiceImplTest {

  private static final long USER_ID = 1L;
  private static final long ADMIN_USER_ID = 2L;
  private static final int PLAN_DURATION_DAYS = 30;
  private static final String USERNAME = "testuser";
  private static final String USER_EMAIL = "test@example.com";
  private static final String PASSWORD = "password";
  private static final String ADMIN_USERNAME = "adminuser";
  private static final String ADMIN_EMAIL = "admin@example.com";
  private static final String USER_ROLE = BuiltInRole.USER.value();
  private static final String ADMIN_ROLE = BuiltInRole.ADMIN.value();
  private static final String MODERATOR_ROLE = "ROLE_MODERATOR";
  private static final String FREE_PLAN_NAME = BuiltInPlan.FREE.value();
  private static final String STARTER_PLAN_NAME = "STARTER";

  @Mock
  private UserService userService;
  @Mock
  private RoleService roleService;
  @Mock
  private AccountProvisioningPolicy provisioningPolicy;
  @Mock
  private BillingAccountService billingAccountService;

  @InjectMocks
  private AccountApplicationServiceImpl accountService;

  private UserCreateDto createDto;
  private UserDto userDto;
  private OffsetDateTime now;

  @BeforeEach
  void setUp() {
    now = OffsetDateTime.now();

    createDto = new UserCreateDto(USERNAME, USER_EMAIL, PASSWORD, Set.of());

    userDto = new UserDto(USER_ID, USERNAME, USER_EMAIL, now, Set.of(), null, null);

  }

  /* =======================
     REGISTER USER
  ======================= */

  @Test
  void registerUser_success_appliesDefaultProvisioningPolicy() {
    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(USER_ID)).thenReturn(userDto);
    when(provisioningPolicy.defaultRegistration())
        .thenReturn(new AccountProvisioningSpec(Set.of(USER_ROLE), FREE_PLAN_NAME, true));

    UserDto result = accountService.registerUser(createDto);

    assertThat(result).isEqualTo(userDto);
    verify(roleService).setUserRoles(USER_ID, Set.of(USER_ROLE));
    verify(billingAccountService).ensurePersonalAccount(USER_ID);
  }

  @Test
  void registerUser_usesPolicyPlanNameForDefaultSubscription() {
    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(USER_ID)).thenReturn(userDto);
    when(provisioningPolicy.defaultRegistration())
        .thenReturn(new AccountProvisioningSpec(Set.of(USER_ROLE), STARTER_PLAN_NAME, true));

    accountService.registerUser(createDto);

    verify(roleService).setUserRoles(USER_ID, Set.of(USER_ROLE));
    verify(billingAccountService).ensurePersonalAccount(USER_ID);
  }

  @Test
  void registerUser_usesPolicyActiveFlagForDefaultSubscription() {
    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(USER_ID)).thenReturn(userDto);
    when(provisioningPolicy.defaultRegistration())
        .thenReturn(new AccountProvisioningSpec(Set.of(USER_ROLE), FREE_PLAN_NAME, false));

    accountService.registerUser(createDto);

    verify(roleService).setUserRoles(USER_ID, Set.of(USER_ROLE));
    verify(billingAccountService).ensurePersonalAccount(USER_ID);
  }

  @Test
  void registerUser_policyRolesReplaceAnyDtoRoles() {
    UserCreateDto adminDto =
        new UserCreateDto(ADMIN_USERNAME, ADMIN_EMAIL, PASSWORD, Set.of(ADMIN_ROLE));
    UserDto adminUserDto =
        new UserDto(ADMIN_USER_ID, ADMIN_USERNAME, ADMIN_EMAIL, now, Set.of(ADMIN_ROLE), null, null);
    Set<String> policyRoles = Set.of(USER_ROLE);

    when(userService.create(adminDto)).thenReturn(adminUserDto);
    when(userService.getById(ADMIN_USER_ID)).thenReturn(adminUserDto);
    when(provisioningPolicy.defaultRegistration())
        .thenReturn(new AccountProvisioningSpec(policyRoles, FREE_PLAN_NAME, true));

    accountService.registerUser(adminDto);

    verify(roleService).setUserRoles(ADMIN_USER_ID, policyRoles);
    verify(roleService, never()).addUserRoles(any(), any());
    verify(billingAccountService).ensurePersonalAccount(ADMIN_USER_ID);
  }

  @Test
  void registerUser_returnsRefreshedUser_fromGetById() {
    UserDto refreshedUser = new UserDto(
        USER_ID, USERNAME, USER_EMAIL, now, Set.of(USER_ROLE), FREE_PLAN_NAME,
        now.plusDays(PLAN_DURATION_DAYS)
    );

    when(userService.create(createDto)).thenReturn(userDto);
    when(provisioningPolicy.defaultRegistration())
        .thenReturn(new AccountProvisioningSpec(Set.of(USER_ROLE), FREE_PLAN_NAME, true));
    when(userService.getById(USER_ID)).thenReturn(refreshedUser);

    UserDto result = accountService.registerUser(createDto);

    assertThat(result).isEqualTo(refreshedUser);
    verify(billingAccountService).ensurePersonalAccount(USER_ID);
  }

  /* =======================
     SET ROLES
  ======================= */

  @Test
  void setRoles_success() {
    Set<String> roles = Set.of(ADMIN_ROLE, USER_ROLE);

    when(userService.getById(USER_ID)).thenReturn(userDto);

    UserDto result = accountService.setRoles(USER_ID, roles);

    assertThat(result).isEqualTo(userDto);
    verify(roleService).setUserRoles(USER_ID, roles);
    verify(userService).getById(USER_ID);
  }

  @Test
  void setRoles_returnsRefreshedUser_afterRoleChange() {
    Set<String> roles = Set.of(ADMIN_ROLE);
    UserDto updatedUser = new UserDto(
        USER_ID, USERNAME, USER_EMAIL, now, Set.of(ADMIN_ROLE), null, null
    );

    when(userService.getById(USER_ID)).thenReturn(updatedUser);

    UserDto result = accountService.setRoles(USER_ID, roles);

    assertThat(result.roles()).contains(ADMIN_ROLE);
  }

  @Test
  void setRoles_delegatesExactRolesToRoleService() {
    Set<String> roles = Set.of(MODERATOR_ROLE);

    when(userService.getById(USER_ID)).thenReturn(userDto);

    accountService.setRoles(USER_ID, roles);

    verify(roleService).setUserRoles(eq(USER_ID), eq(roles));
  }

}
