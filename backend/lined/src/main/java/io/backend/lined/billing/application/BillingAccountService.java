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
public class BillingAccountService {

  private final BillingAccountRepository billingAccountRepository;

  public BillingAccountEntity ensurePersonalAccount(Long userId) {
    return billingAccountRepository.findByOwnerUserIdAndType(userId, BillingAccountType.PERSONAL)
        .orElseGet(() -> billingAccountRepository.save(newPersonalAccount(userId)));
  }

  public BillingAccountEntity getByOwnerUserId(Long userId) {
    return EntityFinder.findOrThrow(
        billingAccountRepository.findByOwnerUserIdAndType(userId, BillingAccountType.PERSONAL),
        () -> new NotFoundException("Personal billing account not found for user %d".formatted(userId)));
  }

  private BillingAccountEntity newPersonalAccount(Long userId) {
    return BillingAccountEntity.builder()
        .ownerUserId(userId)
        .type(BillingAccountType.PERSONAL)
        .status(BillingAccountStatus.ACTIVE)
        .build();
  }
}
