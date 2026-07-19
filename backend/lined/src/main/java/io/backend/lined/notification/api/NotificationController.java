package io.backend.lined.notification.api;

import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@Tag(name = "Notifications", description = "Notification preferences and inbox")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService service;

  @Operation(summary = "Get notification preferences")
  @GetMapping("/preferences")
  public ResponseEntity<NotificationPreferencesDto> preferences(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    NotificationPreferencesDto preferences = service.getPreferences(currentUserId);
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(preferences.version())).body(preferences);
  }

  @Operation(summary = "Update notification preferences")
  @PatchMapping("/preferences")
  public ResponseEntity<NotificationPreferencesDto> updatePreferences(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @Valid @RequestBody NotificationPreferencesUpdateDto dto) {
    NotificationPreferencesDto preferences = service.updatePreferences(
        currentUserId, dto, VersionPrecondition.parse(ifMatch));
    return ResponseEntity.ok().eTag(VersionPrecondition.etag(preferences.version())).body(preferences);
  }

  @Deprecated
  public NotificationPreferencesDto updatePreferences(
      Long currentUserId, NotificationPreferencesUpdateDto dto) {
    return service.updatePreferences(currentUserId, dto);
  }

  @Operation(summary = "List my notifications")
  @GetMapping("/mine")
  public List<NotificationDto> mine(
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return service.listMine(currentUserId);
  }

  @Operation(summary = "Mark notification as read")
  @PatchMapping("/{id}/read")
  public NotificationDto markRead(
      @Parameter(description = "Notification ID", example = "9001") @PathVariable Long id,
      @Parameter(description = "Current user id (temporary for MVP)", example = "42")
      @RequestHeader("X-User-Id") Long currentUserId) {
    return service.markRead(id, currentUserId);
  }
}
