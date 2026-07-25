package io.backend.lined.task.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.task.domain.TaskEntity;
import io.backend.lined.task.domain.TaskVisibility;
import io.backend.lined.user.domain.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TaskAccessPolicyTest {

  private final TaskAccessPolicy policy = new TaskAccessPolicy();
  private TaskEntity task;

  @BeforeEach
  void setUp() {
    UserEntity creator = new UserEntity();
    creator.setId(1L);
    task = TaskEntity.builder().id(55L).creator(creator).visibility(TaskVisibility.PRIVATE).build();
  }

  @Test
  void ensureCanRead_allowsPrivateCreator() {
    policy.ensureCanRead(task, 1L);

    assertThat(policy.isVisibleTo(task, 1L)).isTrue();
  }

  @Test
  void ensureCanRead_hidesPrivateTaskFromAnotherMember() {
    assertThatThrownBy(() -> policy.ensureCanRead(task, 2L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("55");
  }

  @Test
  void ensureCanChangeVisibility_rejectsNonCreatorForSharedTask() {
    task.setVisibility(TaskVisibility.SHARED);

    assertThatThrownBy(() -> policy.ensureCanChangeVisibility(task, 2L))
        .isInstanceOf(ForbiddenException.class);
  }
}
