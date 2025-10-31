package io.backend.lined.subscription.service;

import io.backend.lined.subscription.api.SubscriptionDto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionServiceImpl implements SubscriptionService {

  @Override
  public SubscriptionDto start(Long userId, Long planId, OffsetDateTime start, OffsetDateTime end,
                               Boolean active) {
    return null;
  }

  @Override
  public SubscriptionDto cancelActive(Long userId) {
    return null;
  }

  @Override
  public Optional<SubscriptionDto> getActive(Long userId) {
    return Optional.empty();
  }

  @Override
  public List<SubscriptionDto> history(Long userId) {
    return List.of();
  }
}
