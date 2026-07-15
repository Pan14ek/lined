package io.backend.lined.user.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.plan.domain.PlanEntity;
import io.backend.lined.role.domain.RoleEntity;
import io.backend.lined.subscription.domain.UserSubscriptionEntity;
import io.backend.lined.user.domain.UserEntity;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserMapperTest {

  private UserMapper mapper;

  @BeforeEach
  void setUp() {
    mapper = new UserMapperImpl();
  }

  /* =======================
     mapRoleNames
  ======================= */

  @Test
  void mapRoleNames_returnsEmptySet_whenNull() {
    Set<String> result = mapper.mapRoleNames(null);

    assertThat(result).isEmpty();
  }

  @Test
  void mapRoleNames_extractsRoleNames() {
    RoleEntity userRole = RoleEntity.builder().id(1L).name("USER").build();
    RoleEntity adminRole = RoleEntity.builder().id(2L).name("ADMIN").build();

    Set<String> result = mapper.mapRoleNames(new HashSet<>(Set.of(userRole, adminRole)));

    assertThat(result).containsExactlyInAnyOrder("USER", "ADMIN");
  }

  /* =======================
     extractActivePlanName
  ======================= */

  @Test
  void extractActivePlanName_returnsNull_whenNoSubscriptions() {
    UserEntity user = UserEntity.builder().id(1L).username("alice").build();

    String result = mapper.extractActivePlanName(user);

    assertThat(result).isNull();
  }

  @Test
  void extractActivePlanName_returnsNull_whenAllSubscriptionsInactive() {
    PlanEntity plan = new PlanEntity();
    plan.setName("FREE");

    UserSubscriptionEntity inactive = UserSubscriptionEntity.builder()
        .plan(plan)
        .endDate(OffsetDateTime.now().plusDays(10))
        .isActive(false)
        .build();

    UserEntity user = UserEntity.builder()
        .id(1L)
        .username("alice")
        .subscriptions(new HashSet<>(Set.of(inactive)))
        .build();

    String result = mapper.extractActivePlanName(user);

    assertThat(result).isNull();
  }

  @Test
  void extractActivePlanName_returnsPlanName_whenActiveSubscriptionExists() {
    PlanEntity plan = new PlanEntity();
    plan.setName("PRO_MONTHLY");

    UserSubscriptionEntity activeSub = UserSubscriptionEntity.builder()
        .plan(plan)
        .endDate(OffsetDateTime.now().plusDays(30))
        .isActive(true)
        .build();

    UserEntity user = UserEntity.builder()
        .id(1L)
        .username("alice")
        .subscriptions(new HashSet<>(Set.of(activeSub)))
        .build();

    String result = mapper.extractActivePlanName(user);

    assertThat(result).isEqualTo("PRO_MONTHLY");
  }

  @Test
  void extractActivePlanName_returnsNull_whenActiveButEndDateInPast() {
    PlanEntity plan = new PlanEntity();
    plan.setName("PRO_MONTHLY");

    UserSubscriptionEntity expiredSub = UserSubscriptionEntity.builder()
        .plan(plan)
        .endDate(OffsetDateTime.now().minusDays(1))
        .isActive(true)
        .build();

    UserEntity user = UserEntity.builder()
        .id(1L)
        .username("alice")
        .subscriptions(new HashSet<>(Set.of(expiredSub)))
        .build();

    String result = mapper.extractActivePlanName(user);

    assertThat(result).isNull();
  }

  /* =======================
     extractActiveEndDate
  ======================= */

  @Test
  void extractActiveEndDate_returnsNull_whenNoActiveSub() {
    UserEntity user = UserEntity.builder().id(1L).username("alice").build();

    OffsetDateTime result = mapper.extractActiveEndDate(user);

    assertThat(result).isNull();
  }

  @Test
  void extractActiveEndDate_returnsEndDate_whenActiveExists() {
    PlanEntity plan = new PlanEntity();
    plan.setName("PRO_MONTHLY");
    OffsetDateTime endDate = OffsetDateTime.now().plusDays(30);

    UserSubscriptionEntity activeSub = UserSubscriptionEntity.builder()
        .plan(plan)
        .endDate(endDate)
        .isActive(true)
        .build();

    UserEntity user = UserEntity.builder()
        .id(1L)
        .username("alice")
        .subscriptions(new HashSet<>(Set.of(activeSub)))
        .build();

    OffsetDateTime result = mapper.extractActiveEndDate(user);

    assertThat(result).isEqualTo(endDate);
  }

  @Test
  void extractActiveEndDate_returnsNull_whenNullEndDateOnOpenEndedActiveSub() {
    PlanEntity plan = new PlanEntity();
    plan.setName("PRO_MONTHLY");

    UserSubscriptionEntity openEndedSub = UserSubscriptionEntity.builder()
        .plan(plan)
        .endDate(null)
        .isActive(true)
        .build();

    UserEntity user = UserEntity.builder()
        .id(1L)
        .username("alice")
        .subscriptions(new HashSet<>(Set.of(openEndedSub)))
        .build();

    OffsetDateTime result = mapper.extractActiveEndDate(user);

    assertThat(result).isNull();
  }

  /* =======================
     toSearchResultDto
  ======================= */

  @Test
  void toSearchResultDto_mapsFieldsCorrectly() {
    RoleEntity role = RoleEntity.builder().id(1L).name("USER").build();
    OffsetDateTime createdAt = OffsetDateTime.parse("2025-01-01T12:00:00Z");

    UserEntity user = UserEntity.builder()
        .id(42L)
        .username("alice")
        .email("alice@example.com")
        .createdAt(createdAt)
        .roles(new HashSet<>(Set.of(role)))
        .build();

    UserSearchResultDto result = mapper.toSearchResultDto(user);

    assertThat(result.id()).isEqualTo(42L);
    assertThat(result.username()).isEqualTo("alice");
    assertThat(result.email()).isEqualTo("alice@example.com");
    assertThat(result.createdAt()).isEqualTo(createdAt);
    assertThat(result.roles()).containsExactly("USER");
  }
}
