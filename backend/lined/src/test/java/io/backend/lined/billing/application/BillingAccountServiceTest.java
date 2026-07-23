package io.backend.lined.billing.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.account.BillingAccountRepository;
import io.backend.lined.billing.domain.account.BillingAccountStatus;
import io.backend.lined.billing.domain.account.BillingAccountType;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BillingAccountServiceTest {

  private static final long USER_ID = 1L;

  @Mock
  private BillingAccountRepository billingAccountRepository;

  @InjectMocks
  private BillingAccountService service;

  @Test
  void ensurePersonalAccount_returnsExistingAccount_whenCalledAgain() {
    BillingAccountEntity existing = BillingAccountEntity.builder()
        .id(10L)
        .ownerUserId(USER_ID)
        .type(BillingAccountType.PERSONAL)
        .status(BillingAccountStatus.ACTIVE)
        .build();
    when(billingAccountRepository.findByOwnerUserIdAndType(USER_ID, BillingAccountType.PERSONAL))
        .thenReturn(Optional.of(existing));

    BillingAccountEntity result = service.ensurePersonalAccount(USER_ID);

    assertThat(result).isSameAs(existing);
    verify(billingAccountRepository).findByOwnerUserIdAndType(USER_ID, BillingAccountType.PERSONAL);
    verifyNoMoreInteractions(billingAccountRepository);
  }

  @Test
  void ensurePersonalAccount_createsActivePersonalAccount_whenMissing() {
    when(billingAccountRepository.findByOwnerUserIdAndType(USER_ID, BillingAccountType.PERSONAL))
        .thenReturn(Optional.empty());

    service.ensurePersonalAccount(USER_ID);

    ArgumentCaptor<BillingAccountEntity> account = ArgumentCaptor.forClass(BillingAccountEntity.class);
    verify(billingAccountRepository).save(account.capture());
    assertThat(account.getValue().getOwnerUserId()).isEqualTo(USER_ID);
    assertThat(account.getValue().getType()).isEqualTo(BillingAccountType.PERSONAL);
    assertThat(account.getValue().getStatus()).isEqualTo(BillingAccountStatus.ACTIVE);
  }
}
