package io.backend.lined.event.api;

import io.backend.lined.event.service.CalendarIcsService;
import io.backend.lined.featureflag.api.FeatureRequired;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * HTTP boundary for Lined's personal ICS feed and external calendar import.
 *
 * <p>Authenticated users create feed URLs and import calendars through the trusted Spring
 * Security context, while calendar applications fetch a feed without a header because its
 * opaque token is the credential. ICS import accepts either a raw {@code text/calendar} body or
 * an uploaded {@code .ics} file.</p>
 */
@Tag(name = "Calendar", description = "Calendar events and iCalendar integration")
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@FeatureRequired(FeatureFlagKey.CALENDARS)
public class CalendarIcsController {

  private final CalendarIcsService service;
  private final CurrentUserProvider currentUserProvider;

  /**
   * Creates a new secret personal ICS feed URL for the authenticated user.
   *
   * <p>For example, an authenticated {@code POST /api/calendar/feed-token} responds {@code 201}
   * with a relative URL that may be pasted into Google Calendar, Outlook, or Apple
   * Calendar. Creating another URL automatically revokes the previous one.</p>
   *
   * @return {@code 201 Created} and the token-bearing relative feed URL
   */
  @Operation(summary = "Create personal ICS feed URL",
      description = "Generates a secret calendar subscription URL and revokes prior URLs.",
      responses = @ApiResponse(responseCode = "201", description = "New secret feed URL",
          content = @Content(schema = @Schema(implementation = CalendarFeedTokenDto.class))))
  @PostMapping("/feed-token")
  public ResponseEntity<CalendarFeedTokenDto> createFeedToken() {
    return ResponseEntity.status(201)
        .body(service.createFeedToken(currentUserProvider.requireUserId()));
  }

  /**
   * Revokes the authenticated user's active personal ICS feed URLs.
   *
   * <p>For example, an authenticated {@code DELETE /api/calendar/feed-token} returns {@code 204}
   * whether or not the caller currently has a feed, making client cleanup safe to retry.
   * A calendar application using a previously issued URL then receives {@code 410 Gone}.</p>
   *
   * @return {@code 204 No Content}
   */
  @Operation(summary = "Revoke personal ICS feed URLs",
      description = "Idempotently revokes all active feed URLs belonging to the caller.")
  @DeleteMapping("/feed-token")
  public ResponseEntity<Void> revokeFeedToken() {
    service.revokeFeedToken(currentUserProvider.requireUserId());
    return ResponseEntity.noContent().build();
  }

  /**
   * Returns a token-authorized personal calendar subscription as RFC 5545 text.
   *
   * <p>For example, {@code GET /api/calendar/feed/AbCd.ics} needs no JWT because the opaque path
   * token identifies its owner. Valid URLs export owner-private and lobby-shared
   * events only. Revoked URLs return {@code 410 Gone}; unknown URLs return {@code 404}.</p>
   *
   * @param token opaque secret copied from a previously issued feed URL
   * @return UTF-8 {@code text/calendar} response
   */
  @Operation(summary = "Read personal ICS feed",
      description = "Public bearer-token endpoint for calendar subscription clients.",
      responses = {
          @ApiResponse(responseCode = "200", description = "RFC 5545 calendar"),
          @ApiResponse(responseCode = "410", description = "Feed URL was revoked")
      })
  @GetMapping(value = "/feed/{token}.ics", produces = "text/calendar;charset=UTF-8")
  public ResponseEntity<String> exportFeed(
      @Parameter(description = "Secret feed token", example = "AbCdEf123") @PathVariable String token) {
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"))
        .body(service.exportFeed(token));
  }

  /**
   * Imports a raw {@code text/calendar} request body into the caller's selected lobby.
   *
   * <p>For example, a server-to-server client posts an ICS document to
   * {@code /api/calendar/import?lobbyId=101} with {@code Content-Type: text/calendar}. The
   * service creates or updates only private events owned by the caller.</p>
   *
   * @param content complete ICS document bytes
   * @param lobbyId destination lobby identifier
   * @return best-effort import counts and skipped-event errors
   */
  @Operation(summary = "Import raw ICS calendar",
      description = "Accepts a text/calendar request body and upserts private caller events by UID.",
      requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
          content = @Content(mediaType = "text/calendar", examples = @ExampleObject(value = """
              BEGIN:VCALENDAR
              VERSION:2.0
              BEGIN:VEVENT
              UID:work-17@example.com
              DTSTART:20260724T090000Z
              DTEND:20260724T100000Z
              SUMMARY:Team standup
              END:VEVENT
              END:VCALENDAR
              """))))
  @PostMapping(value = "/import", consumes = "text/calendar")
  public CalendarImportResultDto importRawCalendar(
      @RequestBody byte[] content,
      @RequestParam Long lobbyId) {
    return service.importCalendar(content, lobbyId, currentUserProvider.requireUserId());
  }

  /**
   * Imports an uploaded {@code .ics} file into the caller's selected lobby.
   *
   * <p>For example, a browser posts {@code multipart/form-data} with a {@code file} part and
   * {@code lobbyId=101}. This route has the same UID-deduplication and privacy behavior as the
   * raw-body route, so clients may choose the transport best suited to their UI.</p>
   *
   * @param file uploaded ICS file
   * @param lobbyId destination lobby identifier
   * @return best-effort import counts and skipped-event errors
   * @throws IOException if Spring cannot read the uploaded file
   */
  @Operation(summary = "Import uploaded ICS calendar",
      description = "Accepts a multipart .ics file and upserts private caller events by UID.")
  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public CalendarImportResultDto importMultipartCalendar(
      @RequestParam MultipartFile file,
      @RequestParam Long lobbyId) throws IOException {
    return service.importCalendar(file.getBytes(), lobbyId, currentUserProvider.requireUserId());
  }
}
