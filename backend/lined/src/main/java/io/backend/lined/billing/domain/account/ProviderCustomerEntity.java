package io.backend.lined.billing.domain.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
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
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "billing_provider_customers", uniqueConstraints = {
    @UniqueConstraint(name = "uq_billing_provider_customers_account_provider",
        columnNames = {"billing_account_id", "provider"}),
    @UniqueConstraint(name = "uq_billing_provider_customers_provider_customer",
        columnNames = "provider_customer_id")})
public class ProviderCustomerEntity {

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

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  /**
   * Initializes timestamps for a newly created provider-customer mapping.
   *
   * <p>For example, persisting a new sandbox mapping without timestamps assigns one UTC instant
   * to both {@code createdAt} and {@code updatedAt}; supplied values are preserved.</p>
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
   * Refreshes the audit timestamp whenever an existing mapping is written.
   *
   * <p>For example, a provider migration that replaces the provider customer identifier updates
   * {@code updatedAt} while retaining the original creation time.</p>
   */
  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }
}
