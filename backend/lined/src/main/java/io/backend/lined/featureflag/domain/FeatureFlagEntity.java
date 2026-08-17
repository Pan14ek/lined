package io.backend.lined.featureflag.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persistent feature-flag value for one Lined deployment environment.
 *
 * <p>For example, the {@code CALENDARS/PRODUCTION} row can be disabled without altering the
 * independent {@code CALENDARS/LOCAL} row.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "feature_flags", uniqueConstraints = @UniqueConstraint(
    name = "uq_feature_flags_key_environment", columnNames = {"flag_key", "environment"}))
public class FeatureFlagEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(name = "flag_key", nullable = false, length = 64)
  private String key;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private FeatureFlagEnvironment environment;

  @Column(nullable = false)
  private boolean enabled;

  @Column(nullable = false, length = 255)
  private String description;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @Column(name = "updated_by", nullable = false, length = 255)
  private String updatedBy;

  @PrePersist
  void initializeAuditFields() {
    if (updatedAt == null) {
      updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
    if (updatedBy == null || updatedBy.isBlank()) {
      updatedBy = "system";
    }
  }

  @PreUpdate
  void updateTimestamp() {
    updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
  }
}
