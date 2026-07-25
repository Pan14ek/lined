package io.backend.lined.task.domain;

/**
 * Visibility boundary for a lobby task.
 *
 * <p>For example, a {@link #PRIVATE} task used to prepare a surprise is visible only to its
 * creator, whereas a {@link #SHARED} task remains available to eligible lobby members.</p>
 */
public enum TaskVisibility {
  PRIVATE,
  SHARED
}
