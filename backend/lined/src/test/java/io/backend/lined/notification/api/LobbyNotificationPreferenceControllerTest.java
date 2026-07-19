package io.backend.lined.notification.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LobbyNotificationPreferenceControllerTest {

  @Mock
  private NotificationService service;

  private LobbyNotificationPreferenceController controller;

  @BeforeEach
  void setUp() {
    controller = new LobbyNotificationPreferenceController(service);
  }

  @Test
  void preferences_delegatesToService() {
    var expected = new LobbyNotificationPreferencesDto(101L, true, true, true);
    when(service.getLobbyPreferences(101L, 42L)).thenReturn(expected);

    assertThat(controller.preferences(101L, 42L).getBody()).isEqualTo(expected);

    verify(service).getLobbyPreferences(101L, 42L);
  }

  @Test
  void updatePreferences_delegatesToService() {
    var update = new LobbyNotificationPreferencesUpdateDto(false, null, null);
    var expected = new LobbyNotificationPreferencesDto(101L, false, true, true);
    when(service.updateLobbyPreferences(101L, 42L, update)).thenReturn(expected);

    assertThat(controller.updatePreferences(101L, 42L, update)).isEqualTo(expected);

    verify(service).updateLobbyPreferences(101L, 42L, update);
  }
}
