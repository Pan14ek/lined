package io.backend.lined.subscription.service;

import io.backend.lined.subscription.api.SubscriptionDto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionService {

  SubscriptionDto start(Long userId, Long planId,
                        OffsetDateTime start, OffsetDateTime end, Boolean active);

  SubscriptionDto cancelActive(Long userId);

  Optional<SubscriptionDto> getActive(Long userId);

  List<SubscriptionDto> history(Long userId);

}
