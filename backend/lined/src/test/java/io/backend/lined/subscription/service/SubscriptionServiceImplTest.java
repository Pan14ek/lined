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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceImplTest {

  @Mock private UserSubscriptionRepository subscriptionRepository;
  @Mock private UserRepository userRepository;
  @Mock private PlanRepository planRepository;
  @Mock private SubscriptionMapper mapper;

  @InjectMocks
  private SubscriptionServiceImpl subscriptionService;

  private UserEntity user;
  private PlanEntity plan;
  private UserSubscriptionEntity subscriptionEntity;
  private SubscriptionDto subscriptionDto;
  private OffsetDateTime now;

  @BeforeEach
  void setUp() {
    now = OffsetDateTime.now();

    user = new UserEntity();
    user.setId(1L);
    user.setUsername("testuser");

    plan = PlanEntity.builder()
        .id(2L)
        .name("PRO_MONTHLY")
        .priceUsd(new BigDecimal("9.99"))
        .durationDays(30)
        .createdAt(now)
        .build();

    subscriptionEntity = UserSubscriptionEntity.builder()
        .id(10L)
        .user(user)
        .plan(plan)
        .startDate(now)
        .endDate(now.plusDays(30))
        .isActive(true)
        .build();

    subscriptionDto = new SubscriptionDto(
        10L, 1L, 2L, "PRO_MONTHLY",
        now, now.plusDays(30), true, now
    );
  }

  /* =======================
     START
  ======================= */

  @Test
  void start_success_withExplicitDates() {
    OffsetDateTime start = now;
    OffsetDateTime end = now.plusDays(30);

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(Optional.empty());
    when(subscriptionRepository.save(any())).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    SubscriptionDto result = subscriptionService.start(1L, 2L, start, end, true);

    assertThat(result).isEqualTo(subscriptionDto);
    verify(subscriptionRepository).save(any(UserSubscriptionEntity.class));
  }

  @Test
  void start_success_withNullDates_usesDefaults() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(Optional.empty());
    when(subscriptionRepository.save(any())).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    SubscriptionDto result = subscriptionService.start(1L, 2L, null, null, true);

    assertThat(result).isNotNull();

    ArgumentCaptor<UserSubscriptionEntity> captor = ArgumentCaptor.forClass(UserSubscriptionEntity.class);
    verify(subscriptionRepository).save(captor.capture());

    UserSubscriptionEntity saved = captor.getValue();
    assertThat(saved.getEndDate()).isAfter(saved.getStartDate());
  }

  @Test
  void start_deactivatesPreviousSubscription_whenNewIsActive() {
    UserSubscriptionEntity previousSub = UserSubscriptionEntity.builder()
        .id(5L)
        .user(user)
        .plan(plan)
        .startDate(now.minusDays(10))
        .endDate(now.plusDays(20))
        .isActive(true)
        .build();

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(Optional.of(previousSub));
    when(subscriptionRepository.save(any())).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    subscriptionService.start(1L, 2L, null, null, true);

    assertThat(previousSub.isActive()).isFalse();
    verify(subscriptionRepository, times(2)).save(any());
  }

  @Test
  void start_doesNotDeactivatePrevious_whenNewIsNotActive() {
    UserSubscriptionEntity previousSub = UserSubscriptionEntity.builder()
        .id(5L)
        .user(user)
        .plan(plan)
        .startDate(now.minusDays(10))
        .isActive(true)
        .build();

    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
    when(subscriptionRepository.save(any())).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    subscriptionService.start(1L, 2L, null, null, false);

    assertThat(previousSub.isActive()).isTrue();
    verify(subscriptionRepository, times(1)).save(any());
  }

  @Test
  void start_treatsNullActiveAsTrue() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(Optional.empty());
    when(subscriptionRepository.save(any())).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    subscriptionService.start(1L, 2L, null, null, null);

    // findByUserIdAndIsActiveTrue should be called — proving null active is treated as true
    verify(subscriptionRepository).findByUserIdAndIsActiveTrue(1L);
  }

  @Test
  void start_throwsNotFound_whenUserDoesNotExist() {
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> subscriptionService.start(99L, 2L, null, null, true))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(subscriptionRepository, never()).save(any());
  }

  @Test
  void start_throwsNotFound_whenPlanDoesNotExist() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(planRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> subscriptionService.start(1L, 99L, null, null, true))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(subscriptionRepository, never()).save(any());
  }

  /* =======================
     CANCEL ACTIVE
  ======================= */

  @Test
  void cancelActive_success() {
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L))
        .thenReturn(Optional.of(subscriptionEntity));
    when(subscriptionRepository.save(subscriptionEntity)).thenReturn(subscriptionEntity);
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    SubscriptionDto result = subscriptionService.cancelActive(1L);

    assertThat(result).isNotNull();
    assertThat(subscriptionEntity.isActive()).isFalse();
    assertThat(subscriptionEntity.getEndDate()).isNotNull();
    verify(subscriptionRepository).save(subscriptionEntity);
  }

  @Test
  void cancelActive_throwsNotFound_whenNoActiveSubscription() {
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> subscriptionService.cancelActive(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(subscriptionRepository, never()).save(any());
  }

  /* =======================
     GET ACTIVE
  ======================= */

  @Test
  void getActive_returnsSubscription_whenExists() {
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(1L))
        .thenReturn(Optional.of(subscriptionEntity));
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);

    Optional<SubscriptionDto> result = subscriptionService.getActive(1L);

    assertThat(result).isPresent().contains(subscriptionDto);
  }

  @Test
  void getActive_returnsEmpty_whenNoActiveSubscription() {
    when(subscriptionRepository.findByUserIdAndIsActiveTrue(99L)).thenReturn(Optional.empty());

    Optional<SubscriptionDto> result = subscriptionService.getActive(99L);

    assertThat(result).isEmpty();
  }

  /* =======================
     HISTORY
  ======================= */

  @Test
  void history_returnsAllSubscriptions() {
    UserSubscriptionEntity older = UserSubscriptionEntity.builder()
        .id(5L)
        .user(user)
        .plan(plan)
        .startDate(now.minusDays(60))
        .endDate(now.minusDays(30))
        .isActive(false)
        .build();
    SubscriptionDto olderDto = new SubscriptionDto(
        5L, 1L, 2L, "PRO_MONTHLY",
        now.minusDays(60), now.minusDays(30), false, now.minusDays(60)
    );

    when(subscriptionRepository.findAllByUserIdOrderByStartDateDesc(1L))
        .thenReturn(List.of(subscriptionEntity, older));
    when(mapper.toDto(subscriptionEntity)).thenReturn(subscriptionDto);
    when(mapper.toDto(older)).thenReturn(olderDto);

    List<SubscriptionDto> result = subscriptionService.history(1L);

    assertThat(result).hasSize(2).containsExactly(subscriptionDto, olderDto);
  }

  @Test
  void history_returnsEmptyList_whenNoSubscriptions() {
    when(subscriptionRepository.findAllByUserIdOrderByStartDateDesc(99L))
        .thenReturn(List.of());

    List<SubscriptionDto> result = subscriptionService.history(99L);

    assertThat(result).isEmpty();
  }
}