package io.backend.lined.billing.domain.plan;

import io.backend.lined.billing.domain.common.BillingAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Trusted provider-price mapping for a purchasable product plan.
 *
 * <p>For example, {@link PriceCode#PRO_MONTHLY} belongs to {@link PlanCode#PRO} and maps to
 * {@code sandbox-pro-monthly}. The mapping is resolved on the server so a caller cannot replace
 * it with a cheaper provider price identifier.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_prices")
public class PriceCatalogEntity extends BillingAuditableEntity {

  @Id
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  @EqualsAndHashCode.Include
  private PriceCode code;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plan_code", nullable = false)
  private PlanCatalogEntity plan;

  @Enumerated(EnumType.STRING)
  @Column(name = "billing_interval", nullable = false, length = 8)
  private BillingInterval billingInterval;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "provider_price_id", nullable = false, length = 128)
  private String providerPriceId;

  @Column(nullable = false)
  private boolean active;

}
