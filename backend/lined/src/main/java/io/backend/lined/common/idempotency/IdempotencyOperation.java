package io.backend.lined.common.idempotency;

/** Operations whose optional idempotency keys are persisted independently. */
public enum IdempotencyOperation {
  TASK_CREATE,
  EVENT_CREATE
}
