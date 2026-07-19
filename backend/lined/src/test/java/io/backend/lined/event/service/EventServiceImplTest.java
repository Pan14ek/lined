package io.backend.lined.event.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.EventCreateDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.notification.service.NotificationService;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EventServiceImplTest {

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
  @Mock
  private EventConflictAnalyzer conflictAnalyzer;
  @Mock
  private FreeSlotCalculator freeSlotCalculator;
  @Mock
  private NotificationService notificationService;

  @InjectMocks
  private EventServiceImpl eventService;

  private UserEntity owner;
  private UserEntity member;
  private LobbyEntity lobby;
  private EventEntity eventEntity;
  private EventDto eventDto;
  private OffsetDateTime now;
  private OffsetDateTime startAt;
  private OffsetDateTime endAt;

  @BeforeEach
  void setUp() {
    now = OffsetDateTime.now();
    startAt = now.plusHours(1);
    endAt = now.plusHours(3);

    owner = new UserEntity();
    owner.setId(1L);
    owner.setUsername("owner");

    member = new UserEntity();
    member.setId(2L);
    member.setUsername("member");

    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Our Family")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner, member)))
        .build();

    eventEntity = EventEntity.builder()
        .id(9001L)
        .title("Dinner together")
        .location("Whole Foods Market")
        .shared(true)
        .startAt(startAt)
        .endAt(endAt)
        .timezone("Europe/Kyiv")
        .lobby(lobby)
        .owner(owner)
        .build();

    eventDto = new EventDto(
        9001L, 0L, "Dinner together", "Whole Foods Market", true,
        startAt, endAt, "Europe/Kyiv",
        101L, 1L, now
    );
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", "  Whole Foods Market  ", true, startAt, endAt, "Europe/Kyiv",
        101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any(EventEntity.class))).thenReturn(eventEntity);
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    EventDto result = eventService.create(dto, 1L);

    assertThat(result).isEqualTo(eventDto);
    var entityCaptor = ArgumentCaptor.forClass(EventEntity.class);
    verify(repo).save(entityCaptor.capture());
    assertThat(entityCaptor.getValue().getLocation()).isEqualTo("Whole Foods Market");
  }

  @Test
  void create_notifiesOtherMembers_whenRequestedForSharedEvent() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, endAt, "Europe/Kyiv", 101L, true);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any(EventEntity.class))).thenReturn(eventEntity);
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    eventService.create(dto, 1L);

    verify(notificationService).notifySharedEventCreated(member, owner, 9001L, lobby,
        "Dinner together");
  }

  @Test
  void create_storesNullLocation_whenLocationIsBlank() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", "  ", true, startAt, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any(EventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    eventService.create(dto, 1L);

    var entityCaptor = ArgumentCaptor.forClass(EventEntity.class);
    verify(repo).save(entityCaptor.capture());
    assertThat(entityCaptor.getValue().getLocation()).isNull();
  }

  @Test
  void create_storesNullLocation_whenLocationIsOmitted() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any(EventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    eventService.create(dto, 1L);

    var entityCaptor = ArgumentCaptor.forClass(EventEntity.class);
    verify(repo).save(entityCaptor.capture());
    assertThat(entityCaptor.getValue().getLocation()).isNull();
  }

  @Test
  void create_throwsBadRequest_whenStartAtNotBeforeEndAt() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, endAt, startAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.create(dto, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("startAt must be before endAt");

    verify(repo, never()).save(any());
  }

  @Test
  void create_throwsBadRequest_whenStartAtEqualsEndAt() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, startAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.create(dto, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("startAt must be before endAt");
  }

  @Test
  void create_throwsBadRequest_whenStartAtIsNull() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, null, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.create(dto, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("startAt must be before endAt");

    verify(repo, never()).save(any());
  }

  @Test
  void create_throwsNotFound_whenUserNotFound() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> eventService.create(dto, 99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(repo, never()).save(any());
  }

  @Test
  void create_throwsNotFound_whenLobbyNotFound() {
    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, endAt, "Europe/Kyiv", 999L);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> eventService.create(dto, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void create_throwsForbidden_whenUserIsNotLobbyMember() {
    UserEntity outsider = new UserEntity();
    outsider.setId(99L);

    EventCreateDto dto = new EventCreateDto(
        "Dinner together", null, true, startAt, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(99L)).thenReturn(Optional.of(outsider));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.create(dto, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");
  }

  @Test
  void create_allowsMember_toCreateEvent() {
    EventCreateDto dto = new EventCreateDto(
        "Lunch", null, true, startAt, endAt, "Europe/Kyiv", 101L);

    when(userRepo.findById(2L)).thenReturn(Optional.of(member));
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.save(any())).thenReturn(eventEntity);
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    EventDto result = eventService.create(dto, 2L);

    assertThat(result).isNotNull();
  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_success() {
    EventUpdateDto dto = new EventUpdateDto("Updated title", "  Central Park  ", false,
        null, null, null);

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    EventDto result = eventService.update(9001L, dto, 1L);

    assertThat(result).isNotNull();
    assertThat(eventEntity.getTitle()).isEqualTo("Updated title");
    assertThat(eventEntity.getLocation()).isEqualTo("Central Park");
    assertThat(eventEntity.isShared()).isFalse();
  }

  @Test
  void update_updatesOnlyNonNullFields() {
    EventUpdateDto dto = new EventUpdateDto(null, null, null, null, null, "UTC");

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    eventService.update(9001L, dto, 1L);

    assertThat(eventEntity.getTitle()).isEqualTo("Dinner together");
    assertThat(eventEntity.getTimezone()).isEqualTo("UTC");
    assertThat(eventEntity.getLocation()).isEqualTo("Whole Foods Market");
  }

  @Test
  void update_clearsLocation_whenLocationIsBlank() {
    EventUpdateDto dto = new EventUpdateDto(null, " ", null, null, null, null);

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    eventService.update(9001L, dto, 1L);

    assertThat(eventEntity.getLocation()).isNull();
  }

  @Test
  void update_rejectsStaleVersion_withoutOverwritingEvent() {
    EventUpdateDto dto = new EventUpdateDto("Stale title", null, null, null, null, null);
    eventEntity.setVersion(3L);
    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.update(9001L, dto, 1L, 2L))
        .isInstanceOf(ConflictException.class);

    assertThat(eventEntity.getTitle()).isEqualTo("Dinner together");
    verify(repo, never()).saveAndFlush(any());
  }

  @Test
  void update_throwsBadRequest_whenUpdatedDatesAreInvalid() {
    EventUpdateDto dto = new EventUpdateDto(null, null, null, endAt, startAt, null);

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.update(9001L, dto, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("startAt must be before endAt");
  }

  @Test
  void update_doesNotMutateEntity_whenUpdatedDatesAreInvalid() {
    EventUpdateDto dto = new EventUpdateDto("Invalid update", null, false, endAt, startAt,
        "UTC");

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.update(9001L, dto, 1L))
        .isInstanceOf(BadRequestException.class);

    assertThat(eventEntity.getTitle()).isEqualTo("Dinner together");
    assertThat(eventEntity.isShared()).isTrue();
    assertThat(eventEntity.getStartAt()).isEqualTo(startAt);
    assertThat(eventEntity.getEndAt()).isEqualTo(endAt);
    assertThat(eventEntity.getTimezone()).isEqualTo("Europe/Kyiv");
  }

  @Test
  void update_throwsBadRequest_whenNewStartAtExceedsExistingEndAt() {
    EventUpdateDto dto = new EventUpdateDto("Invalid update", null, false, endAt.plusHours(1),
        null, "UTC");

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.update(9001L, dto, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("startAt must be before endAt");

    assertThat(eventEntity.getTitle()).isEqualTo("Dinner together");
    assertThat(eventEntity.isShared()).isTrue();
    assertThat(eventEntity.getStartAt()).isEqualTo(startAt);
    assertThat(eventEntity.getEndAt()).isEqualTo(endAt);
    assertThat(eventEntity.getTimezone()).isEqualTo("Europe/Kyiv");
  }

  @Test
  void update_throwsNotFound_whenEventNotFound() {
    EventUpdateDto dto = new EventUpdateDto("Title", null, null, null, null, null);

    when(repo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> eventService.update(999L, dto, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_throwsForbidden_whenUserIsNotLobbyMember() {
    EventUpdateDto dto = new EventUpdateDto("Title", null, null, null, null, null);

    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.update(9001L, dto, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    eventService.delete(9001L, 1L);

    verify(repo).delete(eventEntity);
  }

  @Test
  void delete_throwsNotFound_whenEventNotFound() {
    when(repo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> eventService.delete(999L, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");

    verify(repo, never()).delete(any(EventEntity.class));
  }

  @Test
  void delete_throwsForbidden_whenUserIsNotLobbyMember() {
    when(repo.findById(9001L)).thenReturn(Optional.of(eventEntity));

    assertThatThrownBy(() -> eventService.delete(9001L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");

    verify(repo, never()).delete(any(EventEntity.class));
  }

  /* =======================
     LIST
  ======================= */

  @Test
  void list_success() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, startAt, endAt)).thenReturn(List.of(eventEntity));
    when(mapper.toDto(eventEntity)).thenReturn(eventDto);

    List<EventDto> result = eventService.list(101L, startAt, endAt, 1L);

    assertThat(result).hasSize(1).containsExactly(eventDto);
  }

  @Test
  void list_returnsEmpty_whenNoEventsInWindow() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(repo.findOverlapping(101L, startAt, endAt)).thenReturn(List.of());

    List<EventDto> result = eventService.list(101L, startAt, endAt, 1L);

    assertThat(result).isEmpty();
  }

  @Test
  void list_throwsBadRequest_whenFromIsNull() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.list(101L, null, endAt, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid time window");
  }

  @Test
  void list_throwsBadRequest_whenToIsNull() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.list(101L, startAt, null, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid time window");
  }

  @Test
  void list_throwsBadRequest_whenFromIsAfterTo() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.list(101L, endAt, startAt, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Invalid time window");
  }

  @Test
  void list_throwsNotFound_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> eventService.list(999L, startAt, endAt, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void list_throwsForbidden_whenUserIsNotLobbyMember() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> eventService.list(101L, startAt, endAt, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("not a member");
  }
}
