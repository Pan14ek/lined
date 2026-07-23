package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.account.BillingAccountRepository;
import io.backend.lined.billing.domain.account.BillingAccountStatus;
import io.backend.lined.billing.domain.account.BillingAccountType;
import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.NotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
/**
 * Manages the billing account that owns a user's commercial state.
 *
 * <p>The initial product model creates one active {@link BillingAccountType#PERSONAL PERSONAL}
 * account for each user. Later billing features resolve subscriptions, invoices, and entitlements
 * through this aggregate rather than attaching them directly to a user.</p>
 *
 * <p>Example: registering user {@code 42} calls {@code ensurePersonalAccount(42L)}. The first
 * call persists an active personal account; a later call returns that same account.</p>
 */
public class BillingAccountService {

  private final BillingAccountRepository billingAccountRepository;

  /**
   * Returns the user's personal account, creating it when it does not exist yet.
   *
   * <p>This is intentionally idempotent for ordinary retries. For example,
   * {@code ensurePersonalAccount(42L)} can safely be invoked by registration and a repair flow:
   * once the personal account exists, no second account is saved.</p>
   *
   * @param userId identifier of the user who owns the personal account
   * @return the existing or newly persisted active personal account
   */
  public BillingAccountEntity ensurePersonalAccount(Long userId) {
    return billingAccountRepository.findByOwnerUserIdAndType(userId, BillingAccountType.PERSONAL)
        .orElseGet(() -> billingAccountRepository.save(newPersonalAccount(userId)));
  }

  /**
   * Retrieves the active user's personal billing account for downstream billing operations.
   *
   * <p>For example, a later {@code GET /api/billing/me} endpoint can resolve the authenticated
   * user ID with {@code getByOwnerUserId(currentUserId)} before calculating an effective plan.</p>
   *
   * @param userId identifier of the account owner
   * @return the owner's personal billing account
   * @throws NotFoundException when no personal billing account exists for {@code userId}
   */
  public BillingAccountEntity getByOwnerUserId(Long userId) {
    return EntityFinder.findOrThrow(
        billingAccountRepository.findByOwnerUserIdAndType(userId, BillingAccountType.PERSONAL),
        () -> new NotFoundException("Personal billing account not found for user %d".formatted(userId)));
  }

  /**
   * Builds the initial state for an account that is about to be persisted.
   *
   * <p>Example result: {@code {ownerUserId=42, type=PERSONAL, status=ACTIVE}}.</p>
   *
   * @param userId identifier of the user who will own the account
   * @return a new, unsaved personal billing account
   */
  private BillingAccountEntity newPersonalAccount(Long userId) {
    return BillingAccountEntity.builder()
        .ownerUserId(userId)
        .type(BillingAccountType.PERSONAL)
        .status(BillingAccountStatus.ACTIVE)
        .build();
  }
}
