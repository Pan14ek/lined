package io.backend.lined.subscription.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscriptionEntity, Long> {

  Optional<UserSubscriptionEntity> findByUserIdAndIsActiveTrue(Long userId);

  List<UserSubscriptionEntity> findAllByUserIdOrderByStartDateDesc(Long userId);
}