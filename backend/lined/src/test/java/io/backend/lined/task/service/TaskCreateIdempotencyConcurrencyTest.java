package io.backend.lined.task.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.backend.lined.task.api.TaskCreateDto;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class TaskCreateIdempotencyConcurrencyTest {

  private static final long OWNER_ID = 1L;
  private static final long ASSIGNEE_ID = 2L;
  private static final long LOBBY_ID = 101L;
  private static final String KEY = "task-create-retry";

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private TaskService taskService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private PlatformTransactionManager transactionManager;

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @BeforeEach
  void setUp() {
    truncateTables();
    jdbcTemplate.update("""
        insert into users (id, username, email, password, version, created_at)
        values (1, 'owner', 'owner@example.com', 'password', 0, now()),
               (2, 'assignee', 'assignee@example.com', 'password', 0, now())
        """);
    jdbcTemplate.update("""
        insert into lobbies (id, name, lobby_type, owner_id, version)
        values (?, 'Test lobby', 'COUPLE', ?, 0)
        """, LOBBY_ID, OWNER_ID);
    jdbcTemplate.update("insert into lobby_members (lobby_id, user_id) values (?, ?)",
        LOBBY_ID, ASSIGNEE_ID);
  }

  @AfterEach
  void tearDown() {
    truncateTables();
  }

  @Test
  void create_replaysOneTaskAndOneDeliverySet_forConcurrentAndSequentialRetries() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);
      Future<TaskDto> first = executor.submit(() -> createAfterBarrier(ready, release));
      Future<TaskDto> second = executor.submit(() -> createAfterBarrier(ready, release));

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();

      List<TaskDto> results = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
      TaskDto replay = taskService.create(dto(), OWNER_ID, KEY);

      assertThat(results).extracting(TaskDto::id).containsOnly(replay.id());
      assertThat(count("tasks")).isEqualTo(1);
      assertThat(count("notifications")).isEqualTo(1);
      assertThat(count("notification_deliveries")).isEqualTo(3);
      assertThat(count("idempotency_requests")).isEqualTo(1);
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void create_rollsBackTaskNotificationsDeliveriesAndIdempotencyRecord_afterFailure() {
    assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
      taskService.create(dto(), OWNER_ID, KEY);
      throw new IllegalStateException("force rollback after notification persistence");
    })).isInstanceOf(IllegalStateException.class);

    assertThat(count("tasks")).isZero();
    assertThat(count("notifications")).isZero();
    assertThat(count("notification_deliveries")).isZero();
    assertThat(count("idempotency_requests")).isZero();
  }

  private TaskDto createAfterBarrier(CountDownLatch ready, CountDownLatch release) {
    return new TransactionTemplate(transactionManager).execute(status -> {
      ready.countDown();
      await(release);
      return taskService.create(dto(), OWNER_ID, KEY);
    });
  }

  private TaskCreateDto dto() {
    return new TaskCreateDto("Buy groceries", LOBBY_ID, ASSIGNEE_ID, null, null,
        TaskPriority.MEDIUM, TaskStatus.TODO, TaskVisibility.SHARED, true);
  }

  private int count(String table) {
    return jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
  }

  private void await(CountDownLatch latch) {
    try {
      if (!latch.await(5, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Timed out waiting for concurrent create");
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while waiting for concurrent create", ex);
    }
  }

  private void truncateTables() {
    jdbcTemplate.execute("""
        truncate table notification_deliveries, notifications, idempotency_requests, tasks,
        lobby_members, lobbies, users restart identity cascade
        """);
  }
}
