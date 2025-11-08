package io.backend.lined.subscription.api;

import io.backend.lined.subscription.domain.UserSubscriptionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface SubscriptionMapper {

  @Mapping(target = "userId", source = "user.id")
  @Mapping(target = "planId", source = "plan.id")
  @Mapping(target = "planName", source = "plan.name")
  @Mapping(target = "active", source = "active")
  SubscriptionDto toDto(UserSubscriptionEntity sub);
}