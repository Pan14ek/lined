package io.backend.lined.notification.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.notification.service.NotificationService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

  @Mock
  private NotificationService service;

  private NotificationController controller;

  @BeforeEach
  void setUp() {
    controller = new NotificationController(service);
  }

  @Test
  void preferences_delegatesToService() {
    var expected = new NotificationPreferencesDto(true, true, true, true, true);
    when(service.getPreferences(42L)).thenReturn(expected);

    assertThat(controller.preferences(42L)).isEqualTo(expected);

    verify(service).getPreferences(42L);
  }

  @Test
  void updatePreferences_delegatesToService() {
    var update = new NotificationPreferencesUpdateDto(false, null, null, null, null);
    var expected = new NotificationPreferencesDto(false, true, true, true, true);
    when(service.updatePreferences(42L, update)).thenReturn(expected);

    assertThat(controller.updatePreferences(42L, update)).isEqualTo(expected);

    verify(service).updatePreferences(42L, update);
  }

  @Test
  void mine_delegatesToService() {
    var notification = notification();
    when(service.listMine(42L)).thenReturn(List.of(notification));

    assertThat(controller.mine(42L)).containsExactly(notification);

    verify(service).listMine(42L);
  }

  @Test
  void markRead_delegatesToService() {
    var notification = notification();
    when(service.markRead(9L, 42L)).thenReturn(notification);

    assertThat(controller.markRead(9L, 42L)).isEqualTo(notification);

    verify(service).markRead(9L, 42L);
  }

  private NotificationDto notification() {
    return new NotificationDto(9L, null, "title", "message", 101L, null, null,
        null, OffsetDateTime.now(), Set.of());
  }
}
