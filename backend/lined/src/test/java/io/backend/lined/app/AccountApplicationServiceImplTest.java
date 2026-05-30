package io.backend.lined.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.plan.api.PlanDto;
import io.backend.lined.plan.service.PlanService;
import io.backend.lined.role.service.RoleService;
import io.backend.lined.subscription.api.SubscriptionDto;
import io.backend.lined.subscription.service.SubscriptionService;
import io.backend.lined.user.api.UserCreateDto;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.service.UserService;
import java.math.BigDecimal;
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

  @Mock
  private UserService userService;
  @Mock
  private RoleService roleService;
  @Mock
  private PlanService planService;
  @Mock
  private SubscriptionService subscriptionService;
  @Mock
  private AccountProvisioningPolicy provisioningPolicy;

  @InjectMocks
  private AccountApplicationServiceImpl accountService;

  private UserCreateDto createDto;
  private UserDto userDto;
  private PlanDto freePlan;
  private SubscriptionDto subscriptionDto;
  private OffsetDateTime now;

  @BeforeEach
  void setUp() {
    now = OffsetDateTime.now();

    createDto = new UserCreateDto("testuser", "test@example.com", "password", Set.of());

    userDto = new UserDto(1L, "testuser", "test@example.com", now, Set.of(), null, null);

    freePlan = new PlanDto(10L, "FREE", BigDecimal.ZERO, 30, now);

    subscriptionDto = new SubscriptionDto(
        100L, 1L, 10L, "FREE",
        now, now.plusDays(30), true, now
    );
  }

  /* =======================
     REGISTER USER
  ======================= */

  @Test
  void registerUser_success_appliesDefaultProvisioningPolicy() {
    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(1L)).thenReturn(userDto);
    when(provisioningPolicy.defaultRoles()).thenReturn(Set.of("ROLE_USER"));
    when(provisioningPolicy.defaultPlanName()).thenReturn("FREE");
    when(provisioningPolicy.defaultSubscriptionActive()).thenReturn(true);
    when(planService.getByName("FREE")).thenReturn(freePlan);

    UserDto result = accountService.registerUser(createDto);

    assertThat(result).isEqualTo(userDto);
    verify(roleService).setUserRoles(1L, Set.of("ROLE_USER"));
    verify(subscriptionService).start(eq(1L), eq(10L), isNull(), isNull(), eq(true));
  }

  @Test
  void registerUser_usesPolicyPlanNameForDefaultSubscription() {
    PlanDto starterPlan = new PlanDto(20L, "STARTER", BigDecimal.ZERO, 30, now);

    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(1L)).thenReturn(userDto);
    when(provisioningPolicy.defaultRoles()).thenReturn(Set.of("ROLE_USER"));
    when(provisioningPolicy.defaultPlanName()).thenReturn("STARTER");
    when(provisioningPolicy.defaultSubscriptionActive()).thenReturn(true);
    when(planService.getByName("STARTER")).thenReturn(starterPlan);

    accountService.registerUser(createDto);

    verify(roleService).setUserRoles(1L, Set.of("ROLE_USER"));
    verify(planService).getByName("STARTER");
    verify(subscriptionService).start(eq(1L), eq(20L), isNull(), isNull(), eq(true));
  }

  @Test
  void registerUser_usesPolicyActiveFlagForDefaultSubscription() {
    when(userService.create(createDto)).thenReturn(userDto);
    when(userService.getById(1L)).thenReturn(userDto);
    when(provisioningPolicy.defaultRoles()).thenReturn(Set.of("ROLE_USER"));
    when(provisioningPolicy.defaultPlanName()).thenReturn("FREE");
    when(provisioningPolicy.defaultSubscriptionActive()).thenReturn(false);
    when(planService.getByName("FREE")).thenReturn(freePlan);

    accountService.registerUser(createDto);

    verify(roleService).setUserRoles(1L, Set.of("ROLE_USER"));
    verify(subscriptionService).start(eq(1L), eq(10L), isNull(), isNull(), eq(false));
  }

  @Test
  void registerUser_policyRolesReplaceAnyDtoRoles() {
    UserCreateDto adminDto =
        new UserCreateDto("adminuser", "admin@example.com", "password", Set.of("ROLE_ADMIN"));
    UserDto adminUserDto =
        new UserDto(2L, "adminuser", "admin@example.com", now, Set.of("ROLE_ADMIN"), null, null);
    Set<String> policyRoles = Set.of("ROLE_USER");

    when(userService.create(adminDto)).thenReturn(adminUserDto);
    when(userService.getById(2L)).thenReturn(adminUserDto);
    when(provisioningPolicy.defaultRoles()).thenReturn(policyRoles);
    when(provisioningPolicy.defaultPlanName()).thenReturn("FREE");
    when(provisioningPolicy.defaultSubscriptionActive()).thenReturn(true);
    when(planService.getByName("FREE")).thenReturn(freePlan);

    accountService.registerUser(adminDto);

    verify(roleService).setUserRoles(2L, policyRoles);
    verify(roleService, never()).addUserRoles(any(), any());
  }

  @Test
  void registerUser_returnsRefreshedUser_fromGetById() {
    UserDto refreshedUser = new UserDto(
        1L, "testuser", "test@example.com", now, Set.of("ROLE_USER"), "FREE", now.plusDays(30)
    );

    when(userService.create(createDto)).thenReturn(userDto);
    when(provisioningPolicy.defaultRoles()).thenReturn(Set.of("ROLE_USER"));
    when(provisioningPolicy.defaultPlanName()).thenReturn("FREE");
    when(provisioningPolicy.defaultSubscriptionActive()).thenReturn(true);
    when(planService.getByName("FREE")).thenReturn(freePlan);
    when(userService.getById(1L)).thenReturn(refreshedUser);

    UserDto result = accountService.registerUser(createDto);

    assertThat(result).isEqualTo(refreshedUser);
  }

  /* =======================
     SET ROLES
  ======================= */

  @Test
  void setRoles_success() {
    Set<String> roles = Set.of("ROLE_ADMIN", "ROLE_USER");

    when(userService.getById(1L)).thenReturn(userDto);

    UserDto result = accountService.setRoles(1L, roles);

    assertThat(result).isEqualTo(userDto);
    verify(roleService).setUserRoles(1L, roles);
    verify(userService).getById(1L);
  }

  @Test
  void setRoles_returnsRefreshedUser_afterRoleChange() {
    Set<String> roles = Set.of("ROLE_ADMIN");
    UserDto updatedUser = new UserDto(
        1L, "testuser", "test@example.com", now, Set.of("ROLE_ADMIN"), null, null
    );

    when(userService.getById(1L)).thenReturn(updatedUser);

    UserDto result = accountService.setRoles(1L, roles);

    assertThat(result.roles()).contains("ROLE_ADMIN");
  }

  @Test
  void setRoles_delegatesExactRolesToRoleService() {
    Set<String> roles = Set.of("ROLE_MODERATOR");

    when(userService.getById(1L)).thenReturn(userDto);

    accountService.setRoles(1L, roles);

    verify(roleService).setUserRoles(eq(1L), eq(roles));
  }

  /* =======================
     ACTIVATE PLAN
  ======================= */

  @Test
  void activatePlan_success() {
    when(planService.getByName("FREE")).thenReturn(freePlan);
    when(subscriptionService.start(eq(1L), eq(10L), isNull(), isNull(), eq(true)))
        .thenReturn(subscriptionDto);

    SubscriptionDto result = accountService.activatePlan(1L, "FREE");

    assertThat(result).isEqualTo(subscriptionDto);
    verify(planService).getByName("FREE");
    verify(subscriptionService).start(eq(1L), eq(10L), isNull(), isNull(), eq(true));
  }

  @Test
  void activatePlan_looksPlanUpByName() {
    PlanDto proPlan = new PlanDto(20L, "PRO_MONTHLY", new BigDecimal("9.99"), 30, now);

    when(planService.getByName("PRO_MONTHLY")).thenReturn(proPlan);
    when(subscriptionService.start(eq(1L), eq(20L), isNull(), isNull(), eq(true)))
        .thenReturn(subscriptionDto);

    accountService.activatePlan(1L, "PRO_MONTHLY");

    verify(planService).getByName("PRO_MONTHLY");
    verify(subscriptionService).start(eq(1L), eq(20L), isNull(), isNull(), eq(true));
  }

  @Test
  void activatePlan_alwaysStartsActiveSubscription() {
    when(planService.getByName("FREE")).thenReturn(freePlan);
    when(subscriptionService.start(any(), any(), any(), any(), eq(true)))
        .thenReturn(subscriptionDto);

    accountService.activatePlan(1L, "FREE");

    // Verify active=true is always passed
    verify(subscriptionService).start(any(), any(), isNull(), isNull(), eq(true));
  }
}
