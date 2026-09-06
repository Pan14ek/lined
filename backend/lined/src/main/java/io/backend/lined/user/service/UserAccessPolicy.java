package io.backend.lined.user.service;

import io.backend.lined.common.exception.ForbiddenException;
import java.util.Objects;
import org.springframework.stereotype.Component;

/** Explicit caller-to-user authorization rules for account operations. */
@Component
public class UserAccessPolicy {

  /**
   * Requires a caller to operate on their own account.
   *
   * @param requesterId trusted authenticated subject
   * @param targetUserId path-selected account
   */
  public void ensureSelf(Long requesterId, Long targetUserId) {
    if (!Objects.equals(requesterId, targetUserId)) {
      throw new ForbiddenException("Users can only modify their own account");
    }
  }
}
