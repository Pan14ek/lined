package io.backend.lined.user.api;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.role.domain.RoleEntity;
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

  @Test
  void mapRoleNames_returnsEmptySet_whenNull() {
    assertThat(mapper.mapRoleNames(null)).isEmpty();
  }

  @Test
  void mapRoleNames_extractsRoleNames() {
    RoleEntity userRole = RoleEntity.builder().id(1L).name("USER").build();
    RoleEntity adminRole = RoleEntity.builder().id(2L).name("ADMIN").build();

    assertThat(mapper.mapRoleNames(new HashSet<>(Set.of(userRole, adminRole))))
        .containsExactlyInAnyOrder("USER", "ADMIN");
  }

  @Test
  void toDto_keepsLegacySubscriptionFieldsNull() {
    UserEntity user = UserEntity.builder()
        .id(42L)
        .username("alice")
        .email("alice@example.com")
        .createdAt(OffsetDateTime.parse("2025-01-01T12:00:00Z"))
        .roles(Set.of(RoleEntity.builder().id(1L).name("USER").build()))
        .build();

    UserDto result = mapper.toDto(user);

    assertThat(result.activePlan()).isNull();
    assertThat(result.activeUntil()).isNull();
  }

  @Test
  void toSearchResultDto_mapsFieldsCorrectly() {
    OffsetDateTime createdAt = OffsetDateTime.parse("2025-01-01T12:00:00Z");
    UserEntity user = UserEntity.builder()
        .id(42L)
        .username("alice")
        .email("alice@example.com")
        .createdAt(createdAt)
        .roles(new HashSet<>())
        .build();

    UserSearchResultDto result = mapper.toSearchResultDto(user);

    assertThat(result.id()).isEqualTo(42L);
    assertThat(result.username()).isEqualTo("alice");
  }
}
