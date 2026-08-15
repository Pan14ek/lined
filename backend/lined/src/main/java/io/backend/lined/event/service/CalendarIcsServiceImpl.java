package io.backend.lined.event.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.GoneException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.CalendarFeedTokenDto;
import io.backend.lined.event.api.CalendarImportResultDto;
import io.backend.lined.event.domain.CalendarFeedTokenEntity;
import io.backend.lined.event.domain.CalendarFeedTokenRepository;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.event.domain.EventVisibility;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.lobby.service.LobbyWriteAction;
import io.backend.lined.lobby.service.LobbyWritePolicy;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import lombok.RequiredArgsConstructor;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.data.CalendarOutputter;
import net.fortuna.ical4j.data.ParserException;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.ComponentList;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.PropertyList;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.DateProperty;
import net.fortuna.ical4j.model.property.Description;
import net.fortuna.ical4j.model.property.Location;
import net.fortuna.ical4j.model.property.ProdId;
import net.fortuna.ical4j.model.property.Uid;
import net.fortuna.ical4j.model.property.Version;
import org.springframework.stereotype.Service;

/**
 * Transactional implementation of Lined's standards-based personal-calendar integration.
 *
 * <p>For example, it converts a feed URL token to a digest before lookup, exports only events the
 * token owner may see, and converts an external VEVENT into a private event owned by the importer.
 * The implementation uses iCal4j rather than manually assembling or parsing RFC 5545 text.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CalendarIcsServiceImpl implements CalendarIcsService {

  private static final int TOKEN_BYTES = 32;
  private static final String FEED_PATH = "/api/calendar/feed/";
  private static final String DEFAULT_TITLE = "Imported event";
  private static final String UTC_TIMEZONE = "UTC";
  private static final int MAX_UID_LENGTH = 255;
  private static final int MAX_TITLE_LENGTH = 160;
  private static final int MAX_LOCATION_LENGTH = 255;
  private static final int MAX_TIMEZONE_LENGTH = 64;

  private final CalendarFeedTokenRepository tokenRepository;
  private final EventRepository eventRepository;
  private final LobbyRepository lobbyRepository;
  private final UserRepository userRepository;
  private final LobbyAccessPolicy accessPolicy;
  private final LobbyWritePolicy writePolicy;
  private final SecureRandom secureRandom = new SecureRandom();

  /** {@inheritDoc} */
  @Override
  public CalendarFeedTokenDto createFeedToken(Long currentUserId) {
    UserEntity user = mustUser(currentUserId);
    OffsetDateTime now = now();
    tokenRepository.findAllByUser_IdAndRevokedAtIsNull(currentUserId)
        .forEach(token -> token.setRevokedAt(now));
    String rawToken = generateRawToken();
    tokenRepository.save(CalendarFeedTokenEntity.builder()
        .user(user)
        .tokenHash(hash(rawToken))
        .build());
    return new CalendarFeedTokenDto(FEED_PATH + rawToken + ".ics");
  }

  /** {@inheritDoc} */
  @Override
  public void revokeFeedToken(Long currentUserId) {
    mustUser(currentUserId);
    OffsetDateTime now = now();
    tokenRepository.findAllByUser_IdAndRevokedAtIsNull(currentUserId)
        .forEach(token -> token.setRevokedAt(now));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(Transactional.TxType.SUPPORTS)
  public String exportFeed(String rawToken) {
    CalendarFeedTokenEntity token = EntityFinder.findOrThrow(
        tokenRepository.findByTokenHash(hash(rawToken)),
        () -> new NotFoundException("Calendar feed not found"));
    if (token.getRevokedAt() != null) {
      throw new GoneException("Calendar feed has been revoked");
    }
    return serializeFeed(eventRepository.findFeedEvents(token.getUser().getId()));
  }

  /** {@inheritDoc} */
  @Override
  public CalendarImportResultDto importCalendar(byte[] content, Long lobbyId, Long currentUserId) {
    UserEntity owner = mustUser(currentUserId);
    LobbyEntity lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, currentUserId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.EVENT_MUTATION);
    Calendar calendar = parse(content);
    List<String> errors = new ArrayList<>();
    int imported = 0;
    int sequence = 0;
    for (VEvent event : calendar.getComponents().stream()
        .filter(VEvent.class::isInstance)
        .map(VEvent.class::cast)
        .toList()) {
      sequence++;
      try {
        upsertImportedEvent(event, owner, lobby);
        imported++;
      } catch (UnsupportedEventException ex) {
        errors.add("VEVENT " + sequence + ": " + ex.getMessage());
      }
    }
    return new CalendarImportResultDto(imported, errors.size(), List.copyOf(errors));
  }

  /**
   * Converts visible Lined events into a standards-compliant calendar document.
   *
   * <p>For example, event {@code 9001} without an imported UID receives the stable generated UID
   * {@code lined-event-9001@lined.app}; re-exporting it produces the same UID. UTC instants are
   * emitted along with {@code X-LINED-TIMEZONE} so consumers can retain the event's source zone.</p>
   *
   * @param events events authorized for the feed owner
   * @return serialized UTF-8 iCalendar content
   */
  private String serializeFeed(List<EventEntity> events) {
    PropertyList properties = new PropertyList()
        .add(new ProdId("-//Lined//Calendar Feed//EN"))
        .add(new Version(Version.VALUE_2_0, Version.VALUE_2_0));
    ComponentList<net.fortuna.ical4j.model.component.CalendarComponent> components =
        new ComponentList<>(events.stream().map(this::toVEvent).toList());
    Calendar calendar = new Calendar(properties, components);
    try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      new CalendarOutputter().output(calendar, output);
      return output.toString(StandardCharsets.UTF_8);
    } catch (IOException | net.fortuna.ical4j.validate.ValidationException ex) {
      throw new IllegalStateException("Unable to serialize calendar feed", ex);
    }
  }

  /**
   * Builds one exported VEVENT from a Lined event.
   *
   * <p>For example, a shared dinner in lobby {@code Family} becomes a VEVENT with summary
   * {@code Dinner}, description {@code Lined lobby: Family}, and an opaque stable UID. A private
   * work event is included only when the feed belongs to that event's owner.</p>
   *
   * @param event persisted event to export
   * @return RFC 5545 VEVENT
   */
  private VEvent toVEvent(EventEntity event) {
    VEvent vEvent = new VEvent(event.getStartAt().toInstant(), event.getEndAt().toInstant(),
        event.getTitle());
    PropertyList properties = vEvent.getPropertyList()
        .add(new Uid(eventUid(event)))
        .add(new Description("Lined lobby: " + event.getLobby().getName()))
        .add(new net.fortuna.ical4j.model.property.XProperty(
            "X-LINED-TIMEZONE", event.getTimezone()));
    if (event.getLocation() != null) {
      properties = properties.add(new Location(event.getLocation()));
    }
    vEvent.setPropertyList(properties);
    return vEvent;
  }

  /**
   * Resolves the UID retained by external sync or derives a deterministic Lined-only UID.
   *
   * <p>For example, an imported {@code UID:work-17@example.com} remains unchanged in the export,
   * while a normal Lined event with id {@code 9001} uses {@code lined-event-9001@lined.app}.</p>
   *
   * @param event source event
   * @return stable RFC 5545 UID value
   */
  private String eventUid(EventEntity event) {
    if (event.getIcsUid() != null) {
      return event.getIcsUid();
    }
    return "lined-event-" + event.getId() + "@lined.app";
  }

  /**
   * Parses one raw calendar document before any individual VEVENT is imported.
   *
   * <p>For example, a missing {@code END:VCALENDAR} causes iCal4j parsing to fail and this method
   * returns {@code 400 Bad Request}; a syntactically valid calendar with one unsupported VEVENT is
   * handled later as a best-effort skipped entry.</p>
   *
   * @param content raw request bytes
   * @return parsed iCalendar model
   * @throws BadRequestException if iCal4j cannot parse the document
   */
  private Calendar parse(byte[] content) {
    try {
      return new CalendarBuilder().build(new ByteArrayInputStream(content));
    } catch (IOException | ParserException ex) {
      throw new BadRequestException("Unparsable ICS document");
    }
  }

  /**
   * Creates or updates one private imported event after validating its supported RFC 5545 shape.
   *
   * <p>For example, a repeated UID for the same user and lobby updates start, end, title, location,
   * and timezone in-place. The exact same UID in another lobby remains a separate event because
   * the deduplication key includes both owner and destination lobby.</p>
   *
   * @param source VEVENT from the parsed document
   * @param owner importing event owner
   * @param lobby destination lobby
   * @throws UnsupportedEventException when this VEVENT is outside v1's timed-one-off contract
   */
  private void upsertImportedEvent(VEvent source, UserEntity owner, LobbyEntity lobby) {
    ImportedEvent imported = toImportedEvent(source);
    EventEntity target = eventRepository.findByOwner_IdAndLobby_IdAndIcsUid(
        owner.getId(), lobby.getId(), imported.uid()).orElseGet(EventEntity::new);
    target.setTitle(imported.title());
    target.setLocation(imported.location());
    target.setShared(false);
    target.setVisibility(EventVisibility.PRIVATE);
    target.setStartAt(imported.startAt());
    target.setEndAt(imported.endAt());
    target.setTimezone(imported.timezone());
    target.setIcsUid(imported.uid());
    target.setOwner(owner);
    target.setLobby(lobby);
    eventRepository.save(target);
  }

  /**
   * Validates and normalizes one v1-supported VEVENT.
   *
   * <p>For example, {@code DTSTART:20260724T090000Z} becomes UTC, whereas
   * {@code DTSTART;TZID=Europe/Kyiv:20260724T120000} retains {@code Europe/Kyiv}. A date-only or
   * floating local time is rejected because Lined cannot determine a reliable busy interval.</p>
   *
   * @param source external VEVENT
   * @return normalized values suitable for a private Lined event
   * @throws UnsupportedEventException when required values are absent or unsupported
   */
  private ImportedEvent toImportedEvent(VEvent source) {
    if (hasProperty(source, Property.RRULE) || hasProperty(source, Property.RECURRENCE_ID)) {
      throw new UnsupportedEventException("recurring events are not supported");
    }
    String uid = source.getUid().map(Uid::getValue)
        .filter(value -> !value.isBlank())
        .orElseThrow(() -> new UnsupportedEventException("UID is required"));
    ImportedTimestamp start = timestamp(source.getDateTimeStart(), "DTSTART");
    ImportedTimestamp end = timestamp(source.getDateTimeEnd(), "DTEND");
    if (!start.value().isBefore(end.value())) {
      throw new UnsupportedEventException("DTSTART must be before DTEND");
    }
    String timezone = start.timezone();
    String endTimezone = end.timezone();
    if (!timezone.equals(endTimezone)) {
      throw new UnsupportedEventException("DTSTART and DTEND must use the same timezone");
    }
    String title = source.getSummary() == null || source.getSummary().getValue().isBlank()
        ? DEFAULT_TITLE : source.getSummary().getValue();
    String location = source.getLocation() == null ? null : source.getLocation().getValue();
    validateLength(uid, MAX_UID_LENGTH, "UID");
    validateLength(title, MAX_TITLE_LENGTH, "SUMMARY");
    if (location != null) {
      validateLength(location, MAX_LOCATION_LENGTH, "LOCATION");
    }
    validateLength(timezone, MAX_TIMEZONE_LENGTH, "timezone");
    return new ImportedEvent(uid, title, location, start.value(), end.value(), timezone);
  }

  /**
   * Rejects a VEVENT property that cannot fit Lined's persisted event contract.
   *
   * <p>For example, a 300-character ICS LOCATION is skipped with a per-event import error rather
   * than reaching JPA and aborting the entire otherwise-valid calendar import.</p>
   *
   * @param value externally supplied property value
   * @param maximum maximum supported character count
   * @param propertyName property shown in a safe import error
   * @throws UnsupportedEventException when the value exceeds the persisted field limit
   */
  private void validateLength(String value, int maximum, String propertyName) {
    if (value.length() > maximum) {
      throw new UnsupportedEventException(propertyName + " exceeds " + maximum + " characters");
    }
  }

  /**
   * Converts an iCal date-time property to a Lined instant and retained timezone name.
   *
   * <p>For example, a Zulu instant yields {@code UTC}; a {@code TZID=Europe/Kyiv} value yields
   * an equivalent offset instant plus {@code Europe/Kyiv}. Local date-times without a zone and
   * date-only values are rejected instead of inventing an ambiguous availability interval.</p>
   *
   * @param property DTSTART or DTEND property
   * @param propertyName human-readable property name for an import error
   * @return normalized timestamp and timezone
   * @throws UnsupportedEventException when the value is absent, all-day, or floating
   */
  private ImportedTimestamp timestamp(DateProperty<?> property, String propertyName) {
    if (property == null || property.getDate() == null) {
      throw new UnsupportedEventException(propertyName + " is required");
    }
    Temporal value = property.getDate();
    if (value instanceof Instant instant) {
      return new ImportedTimestamp(instant.atOffset(ZoneOffset.UTC), UTC_TIMEZONE);
    }
    if (value instanceof ZonedDateTime zonedDateTime) {
      return new ImportedTimestamp(zonedDateTime.toOffsetDateTime(), timezone(property,
          zonedDateTime.getZone().getId()));
    }
    if (value instanceof OffsetDateTime offsetDateTime) {
      return new ImportedTimestamp(offsetDateTime, timezone(property,
          offsetDateTime.getOffset().equals(ZoneOffset.UTC) ? UTC_TIMEZONE : offsetDateTime
              .getOffset().getId()));
    }
    throw new UnsupportedEventException(propertyName + " must be a timezone-aware date-time");
  }

  /**
   * Gets an explicit TZID where supplied, otherwise uses the parsed temporal zone.
   *
   * <p>For example, {@code DTSTART;TZID=Europe/Kyiv:...} returns {@code Europe/Kyiv}; a Zulu
   * DTSTART has no TZID and therefore falls back to {@code UTC}.</p>
   *
   * @param property source date-time property
   * @param fallback parsed timezone when no TZID parameter exists
   * @return retained timezone identifier
   */
  private String timezone(DateProperty<?> property, String fallback) {
    return property.getParameter(net.fortuna.ical4j.model.Parameter.TZID)
        .map(net.fortuna.ical4j.model.Parameter::getValue)
        .orElse(fallback);
  }

  /**
   * Determines whether a VEVENT declares a named RFC 5545 property.
   *
   * <p>For example, an {@code RRULE:FREQ=WEEKLY} property makes v1 skip the VEVENT rather than
   * importing one arbitrary occurrence and reporting misleading free time.</p>
   *
   * @param event source VEVENT
   * @param propertyName RFC 5545 property name
   * @return whether the property is present
   */
  private boolean hasProperty(VEvent event, String propertyName) {
    return event.getProperties().stream().anyMatch(property -> propertyName.equals(property.getName()));
  }

  /**
   * Generates a new URL-safe opaque token with 256 bits of entropy.
   *
   * <p>For example, 32 random bytes become an unpadded Base64URL value that is safe in the
   * {@code /api/calendar/feed/{token}.ics} path. Callers must persist only {@link #hash(String)}.
   * </p>
   *
   * @return raw token intended only for the initial response and URL lookup
   */
  private String generateRawToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /**
   * Derives the fixed-width database lookup representation of a raw feed credential.
   *
   * <p>For example, the database contains the hexadecimal SHA-256 digest of a feed URL token,
   * never the URL token itself. A leaked database row therefore cannot be used directly as a feed
   * bearer credential.</p>
   *
   * @param rawToken raw URL credential
   * @return 64-character lowercase SHA-256 digest
   */
  private String hash(String rawToken) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }

  /**
   * Loads an existing user with Lined's standardized not-found behavior.
   *
   * <p>For example, a deleted account cannot generate a new feed or import an ICS file, so this
   * lookup returns {@code 404 Not Found} instead of allowing a null owner to reach persistence.</p>
   *
   * @param userId expected account identifier
   * @return existing user entity
   */
  private UserEntity mustUser(Long userId) {
    return EntityFinder.findOrThrow(userRepository.findById(userId),
        () -> new NotFoundException("User %d not found".formatted(userId)));
  }

  /**
   * Loads an existing destination lobby with Lined's standardized not-found behavior.
   *
   * <p>For example, an import targeting deleted lobby {@code 101} fails with {@code 404 Not
   * Found} before a private event can be associated with an invalid group.</p>
   *
   * @param lobbyId expected lobby identifier
   * @return existing lobby entity
   */
  private LobbyEntity mustLobby(Long lobbyId) {
    return EntityFinder.findOrThrow(lobbyRepository.findById(lobbyId),
        () -> new NotFoundException("Lobby %d not found".formatted(lobbyId)));
  }

  /**
   * Gets the current UTC instant for persistent token revocation timestamps.
   *
   * <p>For example, regenerating a feed records the same UTC instant on every old active token,
   * allowing consistent {@code 410 Gone} behavior independent of the server's local timezone.</p>
   *
   * @return current UTC instant
   */
  private OffsetDateTime now() {
    return OffsetDateTime.now(ZoneOffset.UTC);
  }

  private record ImportedEvent(String uid, String title, String location, OffsetDateTime startAt,
                               OffsetDateTime endAt, String timezone) {
  }

  private record ImportedTimestamp(OffsetDateTime value, String timezone) {
  }

  private static final class UnsupportedEventException extends RuntimeException {
    private UnsupportedEventException(String message) {
      super(message);
    }
  }
}
