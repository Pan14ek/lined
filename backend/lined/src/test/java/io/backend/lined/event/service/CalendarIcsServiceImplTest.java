package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.GoneException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.common.metrics.PrivateItemMetrics;
import io.backend.lined.common.metrics.PrivateItemType;
import io.backend.lined.event.domain.CalendarFeedTokenEntity;
import io.backend.lined.event.domain.CalendarFeedTokenRepository;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.event.domain.EventVisibility;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.lobby.service.LobbyWritePolicy;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import net.fortuna.ical4j.data.CalendarBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CalendarIcsServiceImplTest {

  @Mock
  private CalendarFeedTokenRepository tokenRepository;
  @Mock
  private EventRepository eventRepository;
  @Mock
  private LobbyRepository lobbyRepository;
  @Mock
  private UserRepository userRepository;
  @Mock
  private LobbyAccessPolicy accessPolicy;
  @Mock
  private LobbyWritePolicy writePolicy;
  @Mock
  private PrivateItemMetrics privateItemMetrics;

  private CalendarIcsService service;
  private UserEntity user;
  private LobbyEntity lobby;

  @BeforeEach
  void setUp() {
    service = new CalendarIcsServiceImpl(tokenRepository, eventRepository, lobbyRepository,
        userRepository, accessPolicy, writePolicy, privateItemMetrics);
    user = new UserEntity();
    user.setId(42L);
    lobby = LobbyEntity.builder().id(101L).name("Family").owner(user).build();
  }

  @Test
  void createFeedToken_revokesActiveTokens_andPersistsOnlyHash() {
    CalendarFeedTokenEntity active = CalendarFeedTokenEntity.builder().user(user)
        .tokenHash("old").build();
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(tokenRepository.findAllByUser_IdAndRevokedAtIsNull(42L)).thenReturn(List.of(active));

    var result = service.createFeedToken(42L);

    String rawToken = result.feedUrl().replace("/api/calendar/feed/", "").replace(".ics", "");
    ArgumentCaptor<CalendarFeedTokenEntity> captor = ArgumentCaptor.forClass(
        CalendarFeedTokenEntity.class);
    verify(tokenRepository).save(captor.capture());
    assertThat(active.getRevokedAt()).isNotNull();
    assertThat(rawToken).hasSizeGreaterThan(40);
    assertThat(captor.getValue().getTokenHash()).hasSize(64).isNotEqualTo(rawToken);
  }

  @Test
  void exportFeed_throwsGone_whenTokenWasRevoked() {
    CalendarFeedTokenEntity revoked = CalendarFeedTokenEntity.builder().user(user)
        .tokenHash("hash").revokedAt(OffsetDateTime.now()).build();
    when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(revoked));

    assertThatThrownBy(() -> service.exportFeed("former-secret"))
        .isInstanceOf(GoneException.class)
        .hasMessageContaining("revoked");
  }

  @Test
  void exportFeed_serializesVisibleEventAsParseableCalendar() throws Exception {
    EventEntity event = EventEntity.builder().id(9001L).title("Dinner").location("Home")
        .startAt(OffsetDateTime.parse("2026-07-24T18:00:00Z"))
        .endAt(OffsetDateTime.parse("2026-07-24T20:00:00Z")).timezone("Europe/Kyiv")
        .owner(user).lobby(lobby).build();
    CalendarFeedTokenEntity active = CalendarFeedTokenEntity.builder().user(user)
        .tokenHash("hash").build();
    when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.of(active));
    when(eventRepository.findFeedEvents(42L)).thenReturn(List.of(event));

    String result = service.exportFeed("current-secret");

    assertThat(new CalendarBuilder().build(new java.io.StringReader(result)).getComponents())
        .hasSize(1);
    assertThat(result).contains("UID:lined-event-9001@lined.app", "X-LINED-TIMEZONE:Europe/Kyiv",
        "DESCRIPTION:Lined lobby: Family");
  }

  @Test
  void importCalendar_createsPrivateEvent_andDeduplicatesByOwnerLobbyUid() {
    String document = """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:work-17@example.com
        DTSTART:20260724T090000Z
        DTEND:20260724T100000Z
        SUMMARY:Team standup
        LOCATION:Office
        END:VEVENT
        END:VCALENDAR
        """;
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(lobbyRepository.findById(101L)).thenReturn(Optional.of(lobby));
    when(eventRepository.findByOwner_IdAndLobby_IdAndIcsUid(42L, 101L,
        "work-17@example.com")).thenReturn(Optional.empty());

    var result = service.importCalendar(document.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        101L, 42L);

    ArgumentCaptor<EventEntity> captor = ArgumentCaptor.forClass(EventEntity.class);
    verify(eventRepository).save(captor.capture());
    verify(privateItemMetrics).recordPrivateItemCreated(PrivateItemType.EVENT);
    assertThat(result.imported()).isEqualTo(1);
    assertThat(result.skipped()).isZero();
    assertThat(captor.getValue().isShared()).isFalse();
    assertThat(captor.getValue().getVisibility()).isEqualTo(EventVisibility.PRIVATE);
    assertThat(captor.getValue().getIcsUid()).isEqualTo("work-17@example.com");
    assertThat(captor.getValue().getTimezone()).isEqualTo("UTC");
  }

  @Test
  void importCalendar_skipsRecurringEvent_withoutPersistingIt() {
    String document = """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:weekly@example.com
        DTSTART:20260724T090000Z
        DTEND:20260724T100000Z
        RRULE:FREQ=WEEKLY
        END:VEVENT
        END:VCALENDAR
        """;
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(lobbyRepository.findById(101L)).thenReturn(Optional.of(lobby));

    var result = service.importCalendar(document.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        101L, 42L);

    assertThat(result.imported()).isZero();
    assertThat(result.skipped()).isEqualTo(1);
    assertThat(result.errors()).singleElement().satisfies(error ->
        assertThat(error).contains("recurring events"));
  }

  @Test
  void importCalendar_skipsOversizedSummary_withoutReachingPersistence() {
    String document = """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:long-summary@example.com
        DTSTART:20260724T090000Z
        DTEND:20260724T100000Z
        SUMMARY:%s
        END:VEVENT
        END:VCALENDAR
        """.formatted("A".repeat(161));
    when(userRepository.findById(42L)).thenReturn(Optional.of(user));
    when(lobbyRepository.findById(101L)).thenReturn(Optional.of(lobby));

    var result = service.importCalendar(document.getBytes(java.nio.charset.StandardCharsets.UTF_8),
        101L, 42L);

    assertThat(result.imported()).isZero();
    assertThat(result.errors()).singleElement().satisfies(error ->
        assertThat(error).contains("SUMMARY exceeds 160"));
  }

  @Test
  void exportFeed_throwsNotFound_whenTokenWasNeverIssued() {
    when(tokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.exportFeed("unknown"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("feed");
  }
}
