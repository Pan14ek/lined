package io.backend.lined.featureflag.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence boundary for environment-scoped feature-flag values.
 */
public interface FeatureFlagRepository extends JpaRepository<FeatureFlagEntity, Long> {

  List<FeatureFlagEntity> findAllByEnvironment(FeatureFlagEnvironment environment);
}
