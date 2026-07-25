package io.backend.lined.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Reports an attempt to give a private task to someone other than its creator.
 *
 * <p>For example, creating a private task as user {@code 42} with {@code assigneeId=77} returns
 * this error instead of disclosing the task to user {@code 77}.</p>
 */
public class PrivateTaskAssigneeException extends BaseAppException {

  /**
   * Creates the stable private-task assignee validation error.
   */
  public PrivateTaskAssigneeException() {
    super(HttpStatus.BAD_REQUEST, "private_task.assignee_invalid",
        "A private task can only be assigned to its creator");
  }
}
