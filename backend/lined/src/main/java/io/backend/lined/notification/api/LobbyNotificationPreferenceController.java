package io.backend.lined.notification.api;

import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.featureflag.api.FeatureRequired;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@Tag(name = "Notifications", description = "Per-lobby notification preferences")
@RestController
@RequestMapping("/api/lobbies/{lobbyId}/notification-preferences")
@RequiredArgsConstructor
@FeatureRequired(FeatureFlagKey.NOTIFICATIONS)
public class LobbyNotificationPreferenceController {

  private final NotificationService service;

  @Operation(summary = "Get my lobby notification preferences")
  @GetMapping
  public ResponseEntity<LobbyNotificationPreferencesDto> preferences(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long lobbyId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    LobbyNotificationPreferencesDto preferences = service.getLobbyPreferences(lobbyId, currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(preferences.version())).body(preferences);
  }

  @Operation(summary = "Update my lobby notification preferences")
  @PatchMapping
  public ResponseEntity<LobbyNotificationPreferencesDto> updatePreferences(
      @Parameter(description = "Lobby ID", example = "101") @PathVariable Long lobbyId,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @Valid @RequestBody LobbyNotificationPreferencesUpdateDto dto) {
    LobbyNotificationPreferencesDto preferences = service.updateLobbyPreferences(
        lobbyId, currentUserId, dto, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(preferences.version())).body(preferences);
  }

  @Deprecated
  public LobbyNotificationPreferencesDto updatePreferences(
      Long lobbyId, Long currentUserId, LobbyNotificationPreferencesUpdateDto dto) {
    return service.updateLobbyPreferences(lobbyId, currentUserId, dto);
  }
}
