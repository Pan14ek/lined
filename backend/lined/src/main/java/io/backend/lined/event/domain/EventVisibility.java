package io.backend.lined.event.domain;

/**
 * Visibility of a calendar event within its lobby.
 *
 * <p>For example, {@link #PRIVATE} makes an appointment visible only to its owner while it still
 * blocks that owner's availability; {@link #SHARED} retains existing lobby-visible behavior.</p>
 */
public enum EventVisibility {
  PRIVATE,
  SHARED
}
