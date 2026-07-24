package io.backend.lined.billing.domain.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Shared persistence state for billing aggregates that retain creation and modification times.
 *
 * <p>For example, a newly persisted billing plan, provider customer, or subscription receives one
 * UTC instant for both timestamps when neither is supplied. On a later update, only
 * {@code updatedAt} changes. This mapped superclass keeps that invariant in one billing-domain
 * module while subclasses retain their own tables and business fields.</p>
 */
@Getter
@Setter
@MappedSuperclass
public abstract class BillingAuditableEntity {

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  /**
   * Initializes missing local audit timestamps immediately before the first insert.
   *
   * <p>For example, an entity built without timestamps receives the same current UTC instant in
   * both fields, while explicitly supplied timestamps remain unchanged for deterministic imports.</p>
   */
  @PrePersist
  protected void initializeAuditTimestamps() {
    OffsetDateTime now = OffsetDateTime.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  /**
   * Refreshes the mutable audit timestamp before an existing entity is written.
   *
   * <p>For example, scheduling a subscription change preserves {@code createdAt} and replaces
   * {@code updatedAt} with the current UTC instant.</p>
   */
  @PreUpdate
  protected void refreshUpdatedAt() {
    updatedAt = OffsetDateTime.now();
  }
}
