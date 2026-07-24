package io.backend.lined.lobby.domain;

/**
 * Controls whether ordinary changes may be made to an otherwise existing lobby.
 *
 * <p>For example, an {@link #ACTIVE} lobby is normally {@link #READ_WRITE}. A downgrade workflow
 * can set it to {@link #READ_ONLY}, at which point only reduction actions such as removing a
 * member are permitted by {@code LobbyWritePolicy}.</p>
 */
public enum LobbyAccessMode {
  /** Normal members and owners may perform authorised writes. */
  READ_WRITE,
  /** Normal writes are blocked until a permitted reduction action makes the lobby compliant. */
  READ_ONLY
}
