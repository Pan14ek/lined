package io.backend.lined.billing.domain.plan;

import io.backend.lined.billing.domain.common.BillingAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_plans")
public class PlanCatalogEntity extends BillingAuditableEntity {

  @Id
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  @EqualsAndHashCode.Include
  private PlanCode code;

  @Column(name = "display_name", nullable = false, length = 64)
  private String displayName;

  @Column(nullable = false)
  private boolean active;

}
