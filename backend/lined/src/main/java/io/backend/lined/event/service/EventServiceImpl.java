package io.backend.lined.event.service;

import io.backend.lined.common.EntityFinder;
import io.backend.lined.common.idempotency.IdempotencyOperation;
import io.backend.lined.common.idempotency.IdempotencyClaim;
import io.backend.lined.common.idempotency.IdempotencyService;
import io.backend.lined.common.metrics.PrivateItemMetrics;
import io.backend.lined.common.metrics.PrivateItemType;
import io.backend.lined.common.VersionPrecondition;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.EventConflictDto;
import io.backend.lined.event.api.EventCreateDto;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.EventMapper;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.api.UserConflictDto;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.event.domain.EventVisibility;
import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.PrivateItemNotificationException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.lobby.service.LobbyWriteAction;
import io.backend.lined.lobby.service.LobbyWritePolicy;
import io.backend.lined.notification.service.NotificationService;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class EventServiceImpl implements EventService {

  private final EventRepository repo;
  private final LobbyRepository lobbyRepo;
  private final UserRepository userRepo;
  private final EventMapper mapper;
  private final LobbyAccessPolicy accessPolicy;
  private final LobbyWritePolicy writePolicy;
  private final EventConflictAnalyzer conflictAnalyzer;
  private final FreeSlotCalculator freeSlotCalculator;
  private final NotificationService notificationService;
  private final EventAccessPolicy eventAccessPolicy;
  private final IdempotencyService idempotencyService;
  private final PrivateItemMetrics privateItemMetrics;

  /**
   * Creates an event with its optional reminder policy.
   *
   * <p>For example, an omitted {@code reminderMinutesBefore} stores the default policy, while a
   * value of {@code 0} stores an explicit opt-out and therefore produces no scheduled reminder.</p>
   */
  @Override
  public EventDto create(EventCreateDto dto, Long currentUserId, String idempotencyKey) {
    var claim = idempotencyKey == null
        ? IdempotencyClaim.withoutKey()
        : idempotencyService.claim(IdempotencyOperation.EVENT_CREATE, currentUserId,
            idempotencyKey, dto);
    if (claim.replay()) {
      return mapper.toDto(mustVisibleEvent(claim.resourceId(), currentUserId));
    }
    var owner = mustUser(currentUserId);
    var lobby = mustLobby(dto.lobbyId());
    accessPolicy.ensureMember(lobby, currentUserId);
    writePolicy.assertWritable(lobby, LobbyWriteAction.EVENT_MUTATION);
    var window = eventWindow(dto.startAt(), dto.endAt());
    EventVisibility visibility = resolveVisibility(dto.shared(), dto.visibility(), EventVisibility.SHARED);
    boolean privateEventNotifyingMembers = visibility == EventVisibility.PRIVATE
        && dto.notifyMembers();
    if (privateEventNotifyingMembers) {
      throw new PrivateItemNotificationException();
    }

    var entity = EventEntity.builder()
        .title(dto.title())
        .location(normalizeLocation(dto.location()))
        .shared(visibility == EventVisibility.SHARED)
        .visibility(visibility)
        .startAt(window.start())
        .endAt(window.end())
        .timezone(dto.timezone())
        .reminderMinutesBefore(dto.reminderMinutesBefore())
        .lobby(lobby)
        .owner(owner)
        .build();

    var saved = repo.save(entity);
    if (visibility == EventVisibility.PRIVATE) {
      privateItemMetrics.recordPrivateItemCreated(PrivateItemType.EVENT);
    }
    if (dto.notifyMembers() && visibility == EventVisibility.SHARED) {
      lobby.getMembers().stream()
          .filter(member -> !member.getId().equals(owner.getId()))
          .forEach(member -> notificationService.notifySharedEventCreated(
              member, owner, saved.getId(), lobby, saved.getTitle()));
    }
    if (idempotencyKey != null) {
      idempotencyService.complete(IdempotencyOperation.EVENT_CREATE, currentUserId, claim,
          saved.getId());
    }
    return mapper.toDto(saved);
  }

  /**
   * Partially updates an event and re-enables a reminder when its occurrence changes.
   *
   * <p>For example, moving a dinner from 18:00 to 20:00 after its first reminder clears the
   * marker, so the newly scheduled occurrence can emit exactly one fresh reminder.</p>
   */
  @Override
  public EventDto update(Long id, EventUpdateDto dto, Long currentUserId, long expectedVersion) {
    var event = mustVisibleEvent(id, currentUserId);
    accessPolicy.ensureMember(event.getLobby(), currentUserId);
    writePolicy.assertWritable(event.getLobby(), LobbyWriteAction.EVENT_MUTATION);
    verifyVersion(event.getVersion(), expectedVersion);
    EventVisibility currentVisibility = currentVisibility(event);
    EventVisibility visibility = resolveVisibility(dto.shared(), dto.visibility(), currentVisibility);
    if (visibility != currentVisibility) {
      eventAccessPolicy.ensureCanChangeVisibility(event, currentUserId);
    }
    var window = eventWindow(
        dto.startAt() == null ? event.getStartAt() : dto.startAt(),
        dto.endAt() == null ? event.getEndAt() : dto.endAt());

    boolean reminderOccurrenceChanged = (dto.startAt() != null
        && !dto.startAt().equals(event.getStartAt()))
        || (dto.reminderMinutesBefore() != null
        && effectiveReminderMinutes(dto.reminderMinutesBefore())
        != effectiveReminderMinutes(event.getReminderMinutesBefore()));
    if (dto.title() != null && !dto.title().isBlank()) {
      event.setTitle(dto.title());
    }
    if (dto.location() != null) {
      event.setLocation(normalizeLocation(dto.location()));
    }
    event.setVisibility(visibility);
    event.setShared(visibility == EventVisibility.SHARED);
    event.setStartAt(window.start());
    event.setEndAt(window.end());
    if (dto.timezone() != null && !dto.timezone().isBlank()) {
      event.setTimezone(dto.timezone());
    }
    if (dto.reminderMinutesBefore() != null) {
      event.setReminderMinutesBefore(dto.reminderMinutesBefore());
    }
    if (reminderOccurrenceChanged) {
      event.setReminderSentAt(null);
    }

    if (expectedVersion >= 0) {
      repo.saveAndFlush(event);
    }
    if (visibility != currentVisibility) {
      privateItemMetrics.recordVisibilityChange(PrivateItemType.EVENT, currentVisibility,
          visibility);
    }
    return mapper.toDto(event);
  }

  /** {@inheritDoc} */
  @Override
  public EventDto get(Long id, Long currentUserId) {
    var event = mustVisibleEvent(id, currentUserId);
    accessPolicy.ensureMember(event.getLobby(), currentUserId);
    return mapper.toDto(event);
  }

  @Override
  public void delete(Long id, Long currentUserId, long expectedVersion) {
    var e = mustVisibleEvent(id, currentUserId);
    accessPolicy.ensureMember(e.getLobby(), currentUserId);
    writePolicy.assertWritable(e.getLobby(), LobbyWriteAction.EVENT_MUTATION);
    verifyVersion(e.getVersion(), expectedVersion);
    repo.delete(e);
    if (expectedVersion >= 0) {
      repo.flush();
    }
  }

  @Override
  public List<EventDto> list(Long lobbyId, OffsetDateTime from, OffsetDateTime to,
                             Long currentUserId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, currentUserId);
    var window = queryWindow(from, to);

    return repo.findVisibleOverlapping(lobbyId, currentUserId, window.start(), window.end()).stream()
        .map(mapper::toDto)
        .toList();
  }

  @Override
  public List<EventConflictDto> findConflicts(Long lobbyId,
                                              OffsetDateTime start, OffsetDateTime end,
                                              Long requesterId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, requesterId);
    var window = conflictWindow(start, end);
    var events = repo.findOverlapping(lobbyId, window.start(), window.end());
    return conflictAnalyzer.findConflicts(events, requesterId);
  }

  @Override
  public UserConflictDto hasConflict(Long userId, OffsetDateTime start,
                                     OffsetDateTime end, Long requesterId) {
    ensureOwnCalendar(userId, requesterId);
    var window = conflictWindow(start, end);
    var overlapping = repo.findOverlappingByUser(userId, window.start(), window.end());
    if (overlapping.isEmpty()) {
      return new UserConflictDto(userId, false, null);
    }
    return new UserConflictDto(userId, true, mapper.toDto(overlapping.get(0)));
  }

  @Override
  public List<FreeSlotDto> findFreeSlots(Long lobbyId, OffsetDateTime from,
                                         OffsetDateTime to, Long currentUserId) {
    var lobby = mustLobby(lobbyId);
    accessPolicy.ensureMember(lobby, currentUserId);
    var window = queryWindow(from, to);
    var busyEvents = repo.findBusyForMemberIds(memberIds(lobby), window.start(), window.end());
    return freeSlotCalculator.findFreeSlots(window, busyEvents);
  }

  private UserEntity mustUser(Long id) {
    return EntityFinder.findOrThrow(userRepo.findById(id),
        () -> new NotFoundException("User %d not found".formatted(id)));
  }

  private LobbyEntity mustLobby(Long id) {
    return EntityFinder.findOrThrow(lobbyRepo.findById(id),
        () -> new NotFoundException("Lobby %d not found".formatted(id)));
  }

  /**
   * Loads an event through the privacy predicate before any mutation is attempted.
   *
   * <p>For example, a lobby member updating event {@code 9001} receives the normal not-found
   * response when it is private and owned by another member. A shared event remains available for
   * the existing lobby write-policy checks.</p>
   *
   * @param id requested event identifier
   * @param requesterId caller identity
   * @return visible event
   * @throws NotFoundException if the event is unknown or private to another owner
   */
  private EventEntity mustVisibleEvent(Long id, Long requesterId) {
    return EntityFinder.findOrThrow(repo.findVisibleById(id, requesterId),
        () -> notFoundAfterPrivacyMetric(id, requesterId));
  }

  private NotFoundException notFoundAfterPrivacyMetric(Long id, Long requesterId) {
    if (repo.existsPrivateEventOwnedByAnotherUser(id, requesterId)) {
      privateItemMetrics.recordAccessDenied(PrivateItemType.EVENT);
    }
    return new NotFoundException("Event %d not found".formatted(id));
  }

  /**
   * Resolves the enum-first compatibility contract and rejects contradictory client fields.
   *
   * <p>For example, {@code shared=false} maps to {@code PRIVATE}; supplying it together with
   * {@code visibility=SHARED} fails rather than silently choosing one privacy level.</p>
   */
  private EventVisibility resolveVisibility(Boolean shared, EventVisibility visibility,
                                            EventVisibility fallback) {
    if (hasContradictoryVisibility(shared, visibility)) {
      throw new BadRequestException("shared and visibility must agree");
    }
    if (visibility != null) {
      return visibility;
    }
    if (shared != null) {
      return shared ? EventVisibility.SHARED : EventVisibility.PRIVATE;
    }
    return fallback;
  }

  private boolean hasContradictoryVisibility(Boolean shared, EventVisibility visibility) {
    return shared != null && visibility != null
        && shared.booleanValue() != isShared(visibility);
  }

  private boolean isShared(EventVisibility visibility) {
    return visibility == EventVisibility.SHARED;
  }

  private EventVisibility currentVisibility(EventEntity event) {
    if (event.getVisibility() != null) {
      return event.getVisibility();
    }
    return event.isShared() ? EventVisibility.SHARED : EventVisibility.PRIVATE;
  }

  private void verifyVersion(long actualVersion, long expectedVersion) {
    if (expectedVersion >= 0) {
      VersionPrecondition.verify(actualVersion, expectedVersion);
    }
  }

  private CalendarTimeWindow eventWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "startAt must be before endAt");
  }

  private String normalizeLocation(String location) {
    if (location == null || location.isBlank()) {
      return null;
    }
    return location.trim();
  }

  private int effectiveReminderMinutes(Integer reminderMinutesBefore) {
    return reminderMinutesBefore == null ? 30 : reminderMinutesBefore;
  }

  private CalendarTimeWindow queryWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "Invalid time window: from < to is required");
  }

  private CalendarTimeWindow conflictWindow(OffsetDateTime start, OffsetDateTime end) {
    return CalendarTimeWindow.of(start, end, "start must be before end");
  }

  private void ensureOwnCalendar(Long userId, Long requesterId) {
    if (!Objects.equals(userId, requesterId)) {
      throw new ForbiddenException("Requester can only check their own calendar");
    }
  }

  private Set<Long> memberIds(LobbyEntity lobby) {
    Set<Long> memberIds = new HashSet<>();
    memberIds.add(lobby.getOwner().getId());
    lobby.getMembers().forEach(member -> memberIds.add(member.getId()));
    return memberIds;
  }

}
