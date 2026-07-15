package io.backend.lined.subscription.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.subscription.service.SubscriptionService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class SubscriptionControllerTest {

  @Mock
  private SubscriptionService subscriptionService;

  private SubscriptionController controller;
  private SubscriptionDto sampleSub;

  @BeforeEach
  void setUp() {
    controller = new SubscriptionController(subscriptionService);
    sampleSub = new SubscriptionDto(
        10L, 1L, 2L, "PRO_MONTHLY",
        OffsetDateTime.now(), OffsetDateTime.now().plusDays(30), true, OffsetDateTime.now());
  }

  @Test
  void start_delegatesToService_andReturns201() {
    var dto = new SubscriptionCreateDto(1L, 2L, null, null, true);
    when(subscriptionService.start(1L, 2L, null, null, true)).thenReturn(sampleSub);

    var response = controller.start(dto);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getBody()).isEqualTo(sampleSub);
    verify(subscriptionService).start(1L, 2L, null, null, true);
  }

  @Test
  void start_propagatesNotFoundException_whenUserOrPlanNotFound() {
    var dto = new SubscriptionCreateDto(99L, 2L, null, null, true);
    when(subscriptionService.start(99L, 2L, null, null, true))
        .thenThrow(new NotFoundException("User 99 not found"));

    assertThatThrownBy(() -> controller.start(dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void cancelActive_delegatesToService() {
    when(subscriptionService.cancelActive(1L)).thenReturn(sampleSub);

    SubscriptionDto result = controller.cancelActive(1L);

    assertThat(result).isEqualTo(sampleSub);
    verify(subscriptionService).cancelActive(1L);
  }

  @Test
  void cancelActive_propagatesNotFoundException_whenNoActiveSub() {
    when(subscriptionService.cancelActive(99L))
        .thenThrow(new NotFoundException("No active subscription for user 99"));

    assertThatThrownBy(() -> controller.cancelActive(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void getActive_returnsOk_whenPresent() {
    when(subscriptionService.getActive(1L)).thenReturn(Optional.of(sampleSub));

    var response = controller.getActive(1L);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isEqualTo(sampleSub);
  }

  @Test
  void getActive_returnsNotFound_whenEmpty() {
    when(subscriptionService.getActive(99L)).thenReturn(Optional.empty());

    var response = controller.getActive(99L);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody()).isNull();
  }

  @Test
  void history_delegatesToService() {
    when(subscriptionService.history(1L)).thenReturn(List.of(sampleSub));

    List<SubscriptionDto> result = controller.history(1L);

    assertThat(result).containsExactly(sampleSub);
    verify(subscriptionService).history(1L);
  }

  @Test
  void history_returnsEmptyList_whenNoHistory() {
    when(subscriptionService.history(99L)).thenReturn(List.of());

    List<SubscriptionDto> result = controller.history(99L);

    assertThat(result).isEmpty();
  }
}
