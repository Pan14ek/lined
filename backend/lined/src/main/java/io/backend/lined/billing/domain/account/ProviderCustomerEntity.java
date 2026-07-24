package io.backend.lined.billing.domain.account;

import io.backend.lined.billing.domain.common.BillingAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Maps a local billing account to its customer record at one payment provider.
 *
 * <p>For example, a personal billing account can map {@code sandbox} to
 * {@code cus_sandbox_42}. The pair is unique so retries reuse the same provider customer rather
 * than creating a second customer for the account.</p>
 */
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_provider_customers", uniqueConstraints = {
    @UniqueConstraint(name = "uq_billing_provider_customers_account_provider",
        columnNames = {"billing_account_id", "provider"}),
    @UniqueConstraint(name = "uq_billing_provider_customers_provider_customer",
        columnNames = "provider_customer_id")})
public class ProviderCustomerEntity extends BillingAuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "billing_account_id", nullable = false)
  private BillingAccountEntity billingAccount;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "provider_customer_id", nullable = false, length = 128)
  private String providerCustomerId;

}
