package io.backend.lined.event.service;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.domain.EventEntity;
import io.backend.lined.event.domain.EventVisibility;
import org.springframework.stereotype.Component;

/**
 * Central authorization rules for shared and owner-only calendar events.
 *
 * <p>For example, a non-owner reading a private appointment receives {@code 404}, while a
 * non-owner changing a visible shared event's visibility receives {@code 403}.</p>
 */
@Component
public class EventAccessPolicy {

  /** Ensures that the requester may receive an event's details. */
  public void ensureCanRead(EventEntity event, Long requesterId) {
    if (!isVisibleTo(event, requesterId)) {
      throw new NotFoundException("Event %d not found".formatted(event.getId()));
    }
  }

  /** Ensures that private events can be mutated only by their owner. */
  public void ensureCanMutate(EventEntity event, Long requesterId) {
    ensureCanRead(event, requesterId);
  }

  /** Ensures that only an owner changes visibility. */
  public void ensureCanChangeVisibility(EventEntity event, Long requesterId) {
    ensureCanRead(event, requesterId);
    if (!event.getOwner().getId().equals(requesterId)) {
      throw new ForbiddenException("Only the event owner can change visibility");
    }
  }

  /** Returns whether an event is shared or belongs to the requester. */
  public boolean isVisibleTo(EventEntity event, Long requesterId) {
    return event.getVisibility() == EventVisibility.SHARED
        || event.getOwner().getId().equals(requesterId);
  }
}
