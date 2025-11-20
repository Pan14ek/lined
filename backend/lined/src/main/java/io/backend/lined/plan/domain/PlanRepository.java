package io.backend.lined.plan.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanRepository extends JpaRepository<PlanEntity, Long> {

  Optional<PlanEntity> findByNameIgnoreCase(String name);
}
