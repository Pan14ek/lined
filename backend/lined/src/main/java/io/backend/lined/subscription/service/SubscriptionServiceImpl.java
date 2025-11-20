package io.backend.lined.subscription.service;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.plan.domain.PlanEntity;
import io.backend.lined.plan.domain.PlanRepository;
import io.backend.lined.subscription.api.SubscriptionDto;
import io.backend.lined.subscription.api.SubscriptionMapper;
import io.backend.lined.subscription.domain.UserSubscriptionEntity;
import io.backend.lined.subscription.domain.UserSubscriptionRepository;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionServiceImpl implements SubscriptionService {


  private final UserSubscriptionRepository subscriptionRepository;
  private final UserRepository userRepository;
  private final PlanRepository planRepository;
  private final SubscriptionMapper mapper;

  @Override
  @Transactional
  public SubscriptionDto start(Long userId, Long planId,
                               OffsetDateTime start, OffsetDateTime end,
                               Boolean active) {

    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new NotFoundException("User with id " + userId + " not found"));

    PlanEntity plan = planRepository.findById(planId)
        .orElseThrow(() -> new NotFoundException("Plan with id " + planId + " not found"));

    OffsetDateTime startDate = (start != null) ? start : OffsetDateTime.now();
    OffsetDateTime endDate = (end != null)
        ? end
        : startDate.plusDays(plan.getDurationDays());

    boolean isActive = (active == null) || active;

    // якщо нова підписка активна — деактивуємо попередню
    if (isActive) {
      subscriptionRepository.findByUserIdAndIsActiveTrue(userId)
          .ifPresent(current -> {
            current.setActive(false);
            current.setEndDate(startDate);
            subscriptionRepository.save(current);
          });
    }

    UserSubscriptionEntity entity = UserSubscriptionEntity.builder()
        .user(user)
        .plan(plan)
        .startDate(startDate)
        .endDate(endDate)
        .isActive(isActive)
        .build();

    UserSubscriptionEntity saved = subscriptionRepository.save(entity);
    return mapper.toDto(saved);
  }

  @Override
  @Transactional
  public SubscriptionDto cancelActive(Long userId) {
    UserSubscriptionEntity activeSub = subscriptionRepository.findByUserIdAndIsActiveTrue(userId)
        .orElseThrow(() -> new NotFoundException(
            "Active subscription for user " + userId + " not found"));

    activeSub.setActive(false);
    activeSub.setEndDate(OffsetDateTime.now());
    UserSubscriptionEntity saved = subscriptionRepository.save(activeSub);

    return mapper.toDto(saved);
  }

  @Override
  public Optional<SubscriptionDto> getActive(Long userId) {
    return subscriptionRepository.findByUserIdAndIsActiveTrue(userId)
        .map(mapper::toDto);
  }

  @Override
  public List<SubscriptionDto> history(Long userId) {
    return subscriptionRepository.findAllByUserIdOrderByStartDateDesc(userId).stream()
        .map(mapper::toDto)
        .toList();
  }
}
