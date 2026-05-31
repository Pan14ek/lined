package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.api.UserConflictDto;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EventServiceImplConflictTest {

  @Mock
  private EventRepository repo;

  @Mock
  private LobbyRepository lobbyRepo;

  @Mock
  private UserRepository userRepo;

  @Mock
  private EventMapper mapper;

  @Spy
  private LobbyAccessPolicy accessPolicy;

  @InjectMocks
  private EventServiceImpl eventService;

  private UserEntity owner;
  private UserEntity member;
  private LobbyEntity lobby;
  private OffsetDateTime now;
  private OffsetDateTime windowStart;
  private OffsetDateTime windowEnd;

  private EventEntity eventA;
  private EventEntity eventB;
  private EventEntity eventC;
  private EventDto dtoA;
  private EventDto dtoB;
  private EventDto dtoC;

  @BeforeEach
  void setUp() {
    now = OffsetDateTime.now();
    windowStart = now.plusHours(1);
    windowEnd = now.plusHours(5);
    owner = setupUser(1L, "owner");
    member = setupUser(2L, "member");
    setupLobby();
    setupEvents();
    setupDtos();
  }

  private void setupDtos() {
    dtoA = new EventDto(1L, "Event A", true,
        eventA.getStartAt(), eventA.getEndAt(), "Europe/Kyiv", 101L, 1L, now);
    dtoB = new EventDto(2L, "Event B", true,
        eventB.getStartAt(), eventB.getEndAt(), "Europe/Kyiv", 101L, 2L, now);
    dtoC = new EventDto(3L, "Event C", true,
        eventC.getStartAt(), eventC.getEndAt(), "Europe/Kyiv", 101L, 1L, now);
  }

  private void setupEvents() {
    // Event A: 1h–3h (overlaps with B)
    eventA = EventEntity.builder()
        .id(1L)
        .title("Event A")
        .shared(true)
        .startAt(now.plusHours(1))
        .endAt(now.plusHours(3))
        .timezone("Europe/Kyiv")
        .lobby(lobby)
        .owner(owner)
        .build();

    // Event B: 2h–4h (overlaps with A and C)
    eventB = EventEntity.builder()
        .id(2L)
        .title("Event B")
        .shared(true)
        .startAt(now.plusHours(2))
        .endAt(now.plusHours(4))
        .timezone("Europe/Kyiv")
        .lobby(lobby)
        .owner(member)
        .build();

    // Event C: 3h30m–5h (overlaps with B only)
    eventC = EventEntity.builder()
        .id(3L)
        .title("Event C")
        .shared(true)
        .startAt(now.plusHours(3).plusMinutes(30))
        .endAt(now.plusHours(5))
        .timezone("Europe/Kyiv")
        .lobby(lobby)
        .owner(owner)
        .build();
  }

  private void setupLobby() {
    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Our Family")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner, member)))
        .build();
  }

  private UserEntity setupUser(long id, String username) {
    UserEntity user = new UserEntity();
    user.setId(id);
    user.setUsername(username);
    return user;
  }

  /* ======================= FIND CONFLICTS ======================= */

  @Test
  void findConflicts_returnsEmpty_whenNoEventsInWindow() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd)).thenReturn(List.of());

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).isEmpty();
    verify(mapper, never()).toDto(any());
  }

  @Test
  void findConflicts_returnsEmpty_whenSingleEventInWindow() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd)).thenReturn(List.of(eventA));

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).isEmpty();
    verify(mapper, never()).toDto(any());
  }

  @Test
  void findConflicts_returnsEmpty_whenEventsDoNotOverlap() {
    // Event A ends at 3h, Event C starts at 3h30m — no overlap
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd))
        .thenReturn(List.of(eventA, eventC));

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).isEmpty();
  }

  @Test
  void findConflicts_returnsOnePair_whenTwoEventsOverlap() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd))
        .thenReturn(List.of(eventA, eventB));
    when(mapper.toDto(eventA)).thenReturn(dtoA);
    when(mapper.toDto(eventB)).thenReturn(dtoB);

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).first()).isEqualTo(dtoA);
    assertThat(result.get(0).second()).isEqualTo(dtoB);
  }

  @Test
  void findConflicts_returnsMultiplePairs_whenThreeEventsOverlap() {
    // A overlaps B, B overlaps C — expect 2 conflict pairs
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd))
        .thenReturn(List.of(eventA, eventB, eventC));
    when(mapper.toDto(eventA)).thenReturn(dtoA);
    when(mapper.toDto(eventB)).thenReturn(dtoB);
    when(mapper.toDto(eventC)).thenReturn(dtoC);

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).hasSize(2);
  }

  @Test
  void findConflicts_calculatesOverlapBoundsCorrectly() {
    // A: 1h–3h, B: 2h–4h → overlap is 2h–3h
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, windowStart, windowEnd))
        .thenReturn(List.of(eventA, eventB));
    when(mapper.toDto(eventA)).thenReturn(dtoA);
    when(mapper.toDto(eventB)).thenReturn(dtoB);

    List<EventConflictDto> result = eventService.findConflicts(101L, windowStart, windowEnd, 1L);

    assertThat(result).hasSize(1);
    EventConflictDto conflict = result.get(0);
    assertThat(conflict.overlapStart()).isEqualTo(
        eventB.getStartAt()); // max(startA, startB) = startB
    assertThat(conflict.overlapEnd()).isEqualTo(eventA.getEndAt());     // min(endA, endB) = endA
  }

  @Test
  void findConflicts_throwsIllegalArgument_whenStartAfterEnd() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() ->
        eventService.findConflicts(101L, windowEnd, windowStart, 1L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("start must be before end");

    verify(repo, never()).findOverlapping(any(), any(), any());
  }

  @Test
  void findConflicts_throwsSecurity_whenUserIsNotLobbyMember() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() ->
        eventService.findConflicts(101L, windowStart, windowEnd, 99L))
        .isInstanceOf(SecurityException.class)
        .hasMessageContaining("not a member");

    verify(repo, never()).findOverlapping(any(), any(), any());
  }

  @Test
  void findConflicts_throwsNoSuchElement_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() ->
        eventService.findConflicts(999L, windowStart, windowEnd, 1L))
        .isInstanceOf(NoSuchElementException.class)
        .hasMessageContaining("999");
  }

  /* ======================= HAS CONFLICT ======================= */

  @Test
  void hasConflict_returnsFalse_whenNoOverlap() {
    when(repo.findOverlappingByUser(eq(1L), eq(windowStart), eq(windowEnd)))
        .thenReturn(List.of());

    UserConflictDto result = eventService.hasConflict(1L, windowStart, windowEnd, 1L);

    assertThat(result.hasConflict()).isFalse();
    assertThat(result.userId()).isEqualTo(1L);
    assertThat(result.conflictingEvent()).isNull();
  }

  @Test
  void hasConflict_returnsTrue_whenOverlapExists() {
    when(repo.findOverlappingByUser(eq(1L), eq(windowStart), eq(windowEnd)))
        .thenReturn(List.of(eventA));
    when(mapper.toDto(eventA)).thenReturn(dtoA);

    UserConflictDto result = eventService.hasConflict(1L, windowStart, windowEnd, 1L);

    assertThat(result.hasConflict()).isTrue();
    assertThat(result.conflictingEvent()).isEqualTo(dtoA);
  }

  @Test
  void hasConflict_returnsFirstConflict_whenMultipleOverlap() {
    when(repo.findOverlappingByUser(eq(1L), eq(windowStart), eq(windowEnd)))
        .thenReturn(List.of(eventA, eventC));
    when(mapper.toDto(eventA)).thenReturn(dtoA);

    UserConflictDto result = eventService.hasConflict(1L, windowStart, windowEnd, 1L);

    assertThat(result.hasConflict()).isTrue();
    assertThat(result.conflictingEvent()).isEqualTo(dtoA);
    verify(mapper, never()).toDto(eventC);
  }

  @Test
  void hasConflict_throwsIllegalArgument_whenStartAfterEnd() {
    assertThatThrownBy(() ->
        eventService.hasConflict(1L, windowEnd, windowStart, 1L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("start must be before end");

    verify(repo, never()).findOverlappingByUser(any(), any(), any());
  }

  @Test
  void hasConflict_throwsIllegalArgument_whenStartEqualsEnd() {
    assertThatThrownBy(() ->
        eventService.hasConflict(1L, windowStart, windowStart, 1L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("start must be before end");
  }

  @Test
  void hasConflict_includesUserIdInResponse() {
    when(repo.findOverlappingByUser(eq(2L), eq(windowStart), eq(windowEnd)))
        .thenReturn(List.of());

    UserConflictDto result = eventService.hasConflict(2L, windowStart, windowEnd, 2L);

    assertThat(result.userId()).isEqualTo(2L);
    assertThat(result.hasConflict()).isFalse();
  }
}