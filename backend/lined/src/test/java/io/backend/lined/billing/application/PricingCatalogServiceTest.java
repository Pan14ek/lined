package io.backend.lined.billing.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.domain.plan.BillingInterval;
import io.backend.lined.billing.domain.plan.PlanCatalogEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.plan.PriceCatalogEntity;
import io.backend.lined.billing.domain.plan.PriceCatalogRepository;
import io.backend.lined.billing.domain.plan.PriceCode;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PricingCatalogServiceTest {

  private static final String MONTHLY_PROVIDER_PRICE_ID = "sandbox-pro-monthly";

  @Mock
  private PriceCatalogRepository priceCatalogRepository;

  @InjectMocks
  private PricingCatalogService pricingCatalogService;

  @Test
  void getActivePrices_returnsRepositoryActivePrices() {
    PriceCatalogEntity monthly = price(PriceCode.PRO_MONTHLY, true, true, MONTHLY_PROVIDER_PRICE_ID);
    when(priceCatalogRepository.findActiveByPlanCode(PlanCode.PRO)).thenReturn(List.of(monthly));

    assertThat(pricingCatalogService.getActivePrices(PlanCode.PRO)).containsExactly(monthly);
  }

  @Test
  void requireProviderPriceId_returnsTrustedMapping_whenPriceIsAvailable() {
    when(priceCatalogRepository.findById(PriceCode.PRO_MONTHLY))
        .thenReturn(Optional.of(price(PriceCode.PRO_MONTHLY, true, true, MONTHLY_PROVIDER_PRICE_ID)));

    assertThat(pricingCatalogService.requireProviderPriceId(PriceCode.PRO_MONTHLY))
        .isEqualTo(MONTHLY_PROVIDER_PRICE_ID);
  }

  @Test
  void requireProviderPriceId_throwsNotFound_whenPriceDoesNotExist() {
    when(priceCatalogRepository.findById(PriceCode.PRO_YEARLY)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> pricingCatalogService.requireProviderPriceId(PriceCode.PRO_YEARLY))
        .isInstanceOf(NotFoundException.class);
  }

  @Test
  void requireProviderPriceId_throwsConflict_whenPriceIsInactive() {
    when(priceCatalogRepository.findById(PriceCode.PRO_MONTHLY))
        .thenReturn(Optional.of(price(PriceCode.PRO_MONTHLY, false, true, MONTHLY_PROVIDER_PRICE_ID)));

    assertPriceNotAvailable(PriceCode.PRO_MONTHLY);
  }

  @Test
  void requireProviderPriceId_throwsConflict_whenParentPlanIsInactive() {
    when(priceCatalogRepository.findById(PriceCode.PRO_MONTHLY))
        .thenReturn(Optional.of(price(PriceCode.PRO_MONTHLY, true, false, MONTHLY_PROVIDER_PRICE_ID)));

    assertPriceNotAvailable(PriceCode.PRO_MONTHLY);
  }

  @Test
  void requireProviderPriceId_throwsConflict_whenProviderPriceIdIsBlank() {
    when(priceCatalogRepository.findById(PriceCode.PRO_MONTHLY))
        .thenReturn(Optional.of(price(PriceCode.PRO_MONTHLY, true, true, " ")));

    assertPriceNotAvailable(PriceCode.PRO_MONTHLY);
  }

  private void assertPriceNotAvailable(PriceCode priceCode) {
    assertThatThrownBy(() -> pricingCatalogService.requireProviderPriceId(priceCode))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("PRICE_NOT_AVAILABLE");
  }

  private PriceCatalogEntity price(PriceCode code, boolean priceActive, boolean planActive,
                                   String providerPriceId) {
    PlanCatalogEntity plan = PlanCatalogEntity.builder()
        .code(PlanCode.PRO)
        .displayName("Pro")
        .active(planActive)
        .build();
    return PriceCatalogEntity.builder()
        .code(code)
        .plan(plan)
        .billingInterval(BillingInterval.MONTH)
        .provider("sandbox")
        .providerPriceId(providerPriceId)
        .active(priceActive)
        .build();
  }
}
