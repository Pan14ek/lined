package io.backend.lined.billing.application;

import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.billing.domain.plan.PriceCatalogEntity;
import io.backend.lined.billing.domain.plan.PriceCatalogRepository;
import io.backend.lined.billing.domain.plan.PriceCode;
import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.NotFoundException;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolves server-owned catalog prices for future billing provider operations.
 *
 * <p>For example, a checkout for {@link PriceCode#PRO_MONTHLY} asks this service for the mapped
 * provider identifier. The service returns {@code sandbox-pro-monthly}, rather than trusting a
 * provider price identifier supplied by the client.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PricingCatalogService {

  private final PriceCatalogRepository priceCatalogRepository;

  /**
   * Returns prices that are currently available for one product plan.
   *
   * <p>For example, {@code getActivePrices(PRO)} returns both seeded Pro intervals while their
   * price rows and the Pro plan are active. It returns an empty list after the plan is disabled.</p>
   *
   * @param planCode product plan whose available prices are requested
   * @return active prices for the active parent plan
   */
  public List<PriceCatalogEntity> getActivePrices(PlanCode planCode) {
    return priceCatalogRepository.findActiveByPlanCode(planCode);
  }

  /**
   * Resolves the trusted provider price identifier for one internal price code.
   *
   * <p>For example, {@code requireProviderPriceId(PRO_YEARLY)} returns
   * {@code sandbox-pro-yearly}. A missing code is a not-found error, while an inactive plan or
   * price, or a blank provider identifier, produces {@code PRICE_NOT_AVAILABLE}.</p>
   *
   * @param priceCode internal price selected by a caller
   * @return non-blank provider-managed price identifier
   * @throws NotFoundException when no catalog row exists for {@code priceCode}
   * @throws ConflictException when the price cannot be offered for checkout
   */
  public String requireProviderPriceId(PriceCode priceCode) {
    PriceCatalogEntity price = EntityFinder.findOrThrow(priceCatalogRepository.findById(priceCode),
        () -> new NotFoundException("Price %s not found".formatted(priceCode)));
    if (!price.isActive() || !price.getPlan().isActive() || isBlank(price.getProviderPriceId())) {
      throw new ConflictException("PRICE_NOT_AVAILABLE",
          "Price %s is not available".formatted(priceCode));
    }
    return price.getProviderPriceId();
  }

  /**
   * Identifies a missing provider mapping without treating surrounding whitespace as valid.
   *
   * <p>For example, both {@code null} and {@code "  "} make a catalog price unavailable, while
   * {@code sandbox-pro-monthly} is a valid mapping.</p>
   *
   * @param value provider price identifier to validate
   * @return {@code true} when the value is null, empty, or whitespace only
   */
  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
