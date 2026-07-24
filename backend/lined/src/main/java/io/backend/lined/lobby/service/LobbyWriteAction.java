package io.backend.lined.lobby.service;

/**
 * Names a lobby mutation so the read-only policy can distinguish a reduction from a normal write.
 *
 * <p>For example, {@link #UPDATE_LOBBY} is blocked for a read-only lobby, while
 * {@link #REMOVE_MEMBER} remains allowed so its owner can reduce membership and regain access.</p>
 */
public enum LobbyWriteAction {
  /** Changes lobby metadata or ownership. */
  UPDATE_LOBBY,
  /** Removes a non-owner member to reduce a lobby's footprint. */
  REMOVE_MEMBER,
  /** Permanently deletes the lobby. */
  DELETE_LOBBY,
  /** Lets a member leave a lobby. */
  LEAVE_LOBBY,
  /** Selects the lobby retained as the owner's single Free lobby. */
  SELECT_AS_FREE_LOBBY,
  /** Creates or changes a task associated with the lobby. */
  TASK_MUTATION,
  /** Creates or changes a calendar event associated with the lobby. */
  EVENT_MUTATION,
  /** Creates or responds to a lobby invitation. */
  INVITE_MUTATION
}
