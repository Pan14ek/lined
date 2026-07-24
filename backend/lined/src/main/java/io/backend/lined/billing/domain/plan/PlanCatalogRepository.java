package io.backend.lined.billing.domain.plan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Persistence boundary for server-managed billing product plans.
 *
 * <p>For example, {@code findById(PlanCode.PRO)} retrieves the catalog row whose availability
 * controls whether linked Pro prices can be offered.</p>
 */
@Repository
public interface PlanCatalogRepository extends JpaRepository<PlanCatalogEntity, PlanCode> {
}
