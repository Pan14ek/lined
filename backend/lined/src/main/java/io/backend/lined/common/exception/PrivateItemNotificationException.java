package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Reports a request to notify another person about a private item.
 *
 * <p>For example, {@code notifyAssignee=true} is invalid when creating a private task, because
 * the request could reveal surprise-preparation details to another lobby member.</p>
 */
public class PrivateItemNotificationException extends BaseAppException {

  /**
   * Creates the stable private-item notification validation error.
   */
  public PrivateItemNotificationException() {
    super(HttpStatus.BAD_REQUEST, "private_item.notification_invalid",
        "Private items cannot notify other lobby members");
  }
}
