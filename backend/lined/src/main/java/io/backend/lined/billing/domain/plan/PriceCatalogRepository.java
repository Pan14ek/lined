package io.backend.lined.billing.domain.plan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for trusted billing price mappings.
 *
 * <p>For example, {@link #findActiveByPlanCode(PlanCode)} returns active prices only when both
 * the price row and its parent plan are active, preventing an inactive catalog plan from being
 * offered accidentally.</p>
 */
@Repository
public interface PriceCatalogRepository extends JpaRepository<PriceCatalogEntity, PriceCode> {

  /**
   * Finds active checkout-eligible prices for one active product plan.
   *
   * <p>For example, querying {@link PlanCode#PRO} returns {@code PRO_MONTHLY} and
   * {@code PRO_YEARLY} while both rows are active; it returns no rows after Pro is disabled.</p>
   *
   * @param planCode stable product plan identifier
   * @return active price mappings belonging to the active plan
   */
  @Query("""
      select price
      from PriceCatalogEntity price
      where price.plan.code = :planCode
        and price.plan.active = true
        and price.active = true
      """)
  List<PriceCatalogEntity> findActiveByPlanCode(@Param("planCode") PlanCode planCode);
}
