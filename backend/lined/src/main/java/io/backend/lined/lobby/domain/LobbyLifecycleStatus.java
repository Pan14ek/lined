package io.backend.lined.lobby.domain;

/**
 * Describes whether a lobby is available for normal use or retained only as history.
 *
 * <p>For example, a lobby starts as {@link #ACTIVE}; a later downgrade workflow can move an
 * over-limit lobby to {@link #ARCHIVED} without deleting its events and tasks. {@link #DELETED}
 * is reserved for a future soft-delete workflow and is not produced by this task.</p>
 */
public enum LobbyLifecycleStatus {
  /** The lobby remains visible and can be used subject to its access mode. */
  ACTIVE,
  /** The lobby is retained for history and must be restored before normal use. */
  ARCHIVED,
  /** The lobby has been logically removed and is unavailable to ordinary users. */
  DELETED
}
