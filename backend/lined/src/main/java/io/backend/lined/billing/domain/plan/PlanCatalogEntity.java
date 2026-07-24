package io.backend.lined.billing.domain.plan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Server-managed product plan available to billing and entitlement workflows.
 *
 * <p>For example, the seeded {@code PRO} row has {@code displayName="Pro"} and can own active
 * monthly and yearly prices. Deactivating the row makes every linked price unavailable without
 * exposing a mutable public plan API.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_plans")
public class PlanCatalogEntity {

  @Id
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  @EqualsAndHashCode.Include
  private PlanCode code;

  @Column(name = "display_name", nullable = false, length = 64)
  private String displayName;

  @Column(nullable = false)
  private boolean active;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  /**
   * Initializes timestamps when a catalog plan is first persisted.
   *
   * <p>For example, a seed-like entity with no timestamps receives one current UTC value for
   * both {@code createdAt} and {@code updatedAt}; explicitly supplied values are retained.</p>
   */
  @PrePersist
  void prePersist() {
    OffsetDateTime now = OffsetDateTime.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  /**
   * Refreshes the catalog plan update timestamp before a persistence update.
   *
   * <p>For example, disabling {@code PRO} changes {@code updatedAt} but preserves the original
   * {@code createdAt} value.</p>
   */
  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }
}
