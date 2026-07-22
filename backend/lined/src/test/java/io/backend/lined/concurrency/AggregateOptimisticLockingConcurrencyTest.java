package io.backend.lined.concurrency;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.event.api.EventUpdateDto;
import io.backend.lined.event.domain.EventRepository;
import io.backend.lined.event.service.EventService;
import io.backend.lined.task.api.TaskUpdateDto;
import io.backend.lined.task.domain.TaskRepository;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.service.TaskService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
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
import org.springframework.dao.OptimisticLockingFailureException;
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
class AggregateOptimisticLockingConcurrencyTest {

  private static final long OWNER_ID = 1L;
  private static final long ASSIGNEE_ID = 2L;
  private static final long EVENT_ID = 101L;
  private static final long TASK_ID = 201L;
  private static final long VERSION_ONE = 0L;

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired
  private EventRepository eventRepository;

  @Autowired
  private EventService eventService;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private TaskRepository taskRepository;

  @Autowired
  private TaskService taskService;

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
    insertFixtures();
  }

  @AfterEach
  void tearDown() {
    truncateTables();
  }

  @Test
  void eventUpdates_allowOneWinner_andRejectTheStaleWriter() throws Exception {
    RaceResults results = race(
        () -> eventRepository.findById(EVENT_ID).orElseThrow(),
        () -> eventService.update(EVENT_ID, titleUpdate("Winner title"), OWNER_ID, VERSION_ONE),
        () -> eventService.update(EVENT_ID, timeUpdate(), OWNER_ID, VERSION_ONE));

    assertOneSuccessAndOneConflict(results);
    Map<String, Object> event = eventRow();
    assertThat(event.get("version")).isEqualTo(1L);
    assertThat(event.get("title")).isIn("Winner title", "Original event");
    assertWinnerFieldsPersisted(event.get("title"), eventStart());
  }

  @Test
  void eventUpdateAndDelete_allowOneTerminalOperation_withoutResurrection() throws Exception {
    RaceResults results = race(
        () -> eventRepository.findById(EVENT_ID).orElseThrow(),
        () -> eventService.update(EVENT_ID, titleUpdate("Updated before delete"), OWNER_ID, VERSION_ONE),
        () -> eventService.delete(EVENT_ID, OWNER_ID, VERSION_ONE));

    assertOneSuccessAndOneConflictOrNotFound(results);
    Integer count = jdbcTemplate.queryForObject(
        "select count(*) from events where id = ?", Integer.class, EVENT_ID);
    assertThat(count).isIn(0, 1);
    if (count != null && count == 1) {
      assertThat(eventRow()).containsEntry("title", "Updated before delete");
    }
  }

  @Test
  void duplicateTaskCompletion_returnsOneSuccessAndOneConflict() throws Exception {
    RaceResults results = race(
        () -> taskRepository.findById(TASK_ID).orElseThrow(),
        () -> taskService.update(TASK_ID, statusUpdate(TaskStatus.DONE), OWNER_ID, VERSION_ONE),
        () -> taskService.update(TASK_ID, statusUpdate(TaskStatus.DONE), OWNER_ID, VERSION_ONE));

    assertOneSuccessAndOneConflict(results);
    Map<String, Object> task = taskRow();
    assertThat(task).containsEntry("status", "DONE").containsEntry("version", 1L);
  }

  @Test
  void taskReassignmentAndCompletion_allowOneWinner_andPreserveConsistentState()
      throws Exception {
    RaceResults results = race(
        () -> taskRepository.findById(TASK_ID).orElseThrow(),
        () -> taskService.update(TASK_ID, assigneeUpdate(), OWNER_ID, VERSION_ONE),
        () -> taskService.update(TASK_ID, statusUpdate(TaskStatus.DONE), OWNER_ID, VERSION_ONE));

    assertOneSuccessAndOneConflict(results);
    Map<String, Object> task = taskRow();
    assertThat(task).isIn(
        Map.of("assignee_id", OWNER_ID, "status", "DONE", "version", 1L),
        Map.of("assignee_id", ASSIGNEE_ID, "status", "TODO", "version", 1L));
  }

  private RaceResults race(Runnable preload, Runnable firstOperation, Runnable secondOperation)
      throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);
      Future<AttemptResult> first = executor.submit(
          () -> attempt(preload, firstOperation, ready, release));
      Future<AttemptResult> second = executor.submit(
          () -> attempt(preload, secondOperation, ready, release));

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();
      return new RaceResults(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
    } finally {
      executor.shutdownNow();
    }
  }

  private AttemptResult attempt(Runnable preload, Runnable operation, CountDownLatch ready,
                                CountDownLatch release) {
    try {
      new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
        preload.run();
        ready.countDown();
        await(release);
        operation.run();
      });
      return AttemptResult.success();
    } catch (RuntimeException ex) {
      return AttemptResult.failure(ex);
    }
  }

  private void assertOneSuccessAndOneConflict(RaceResults results) {
    List<AttemptResult> attempts = List.of(results.first(), results.second());
    assertThat(attempts).filteredOn(AttemptResult::successful).hasSize(1);
    assertThat(attempts).filteredOn(attempt -> isOptimisticConflict(attempt.failure())).hasSize(1);
  }

  private void assertOneSuccessAndOneConflictOrNotFound(RaceResults results) {
    List<AttemptResult> attempts = List.of(results.first(), results.second());
    assertThat(attempts).filteredOn(AttemptResult::successful).hasSize(1);
    assertThat(attempts).filteredOn(attempt -> isOptimisticConflict(attempt.failure())
        || hasCause(attempt.failure(), NotFoundException.class)).hasSize(1);
  }

  private boolean isOptimisticConflict(Throwable failure) {
    return hasCause(failure, OptimisticLockingFailureException.class);
  }

  private boolean hasCause(Throwable failure, Class<? extends Throwable> type) {
    Throwable current = failure;
    while (current != null) {
      if (type.isInstance(current)) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  private EventUpdateDto titleUpdate(String title) {
    return new EventUpdateDto(title, null, null, null, null, null);
  }

  private EventUpdateDto timeUpdate() {
    OffsetDateTime start = OffsetDateTime.parse("2026-08-01T13:00:00Z");
    return new EventUpdateDto(null, null, null, start, start.plusHours(2), null);
  }

  private TaskUpdateDto statusUpdate(TaskStatus status) {
    return new TaskUpdateDto(status, null, null, null, null, null);
  }

  private TaskUpdateDto assigneeUpdate() {
    return new TaskUpdateDto(null, ASSIGNEE_ID, null, null, null, null);
  }

  private Map<String, Object> eventRow() {
    return jdbcTemplate.queryForMap("select title, start_at, end_at, version from events where id = ?",
        EVENT_ID);
  }

  private Map<String, Object> taskRow() {
    return jdbcTemplate.queryForMap("select assignee_id, status, version from tasks where id = ?",
        TASK_ID);
  }

  private OffsetDateTime eventStart() {
    return jdbcTemplate.queryForObject("select start_at from events where id = ?",
        OffsetDateTime.class, EVENT_ID);
  }

  private void assertWinnerFieldsPersisted(Object title, OffsetDateTime start) {
    if ("Winner title".equals(title)) {
      assertThat(start).isEqualTo(OffsetDateTime.parse("2026-08-01T10:00:00Z"));
    } else {
      assertThat(start).isEqualTo(OffsetDateTime.parse("2026-08-01T13:00:00Z"));
    }
  }

  private void insertFixtures() {
    jdbcTemplate.update("""
        insert into users (id, username, email, password, version, created_at)
        values (1, 'owner', 'owner@example.com', 'pw', 0, now()),
               (2, 'assignee', 'assignee@example.com', 'pw', 0, now())
        """);
    jdbcTemplate.update("""
        insert into lobbies (id, name, lobby_type, owner_id, version)
        values (11, 'Home', 'COUPLE', 1, 0)
        """);
    jdbcTemplate.update("insert into lobby_members (lobby_id, user_id) values (11, 1), (11, 2)");
    jdbcTemplate.update("""
        insert into events (id, title, shared, start_at, end_at, timezone, lobby_id, owner_id, version)
        values (101, 'Original event', true, '2026-08-01T10:00:00Z', '2026-08-01T11:00:00Z',
                'UTC', 11, 1, 0)
        """);
    jdbcTemplate.update("""
        insert into tasks (id, title, priority, status, lobby_id, creator_id, assignee_id, version)
        values (201, 'Original task', 'MEDIUM', 'TODO', 11, 1, 1, 0)
        """);
  }

  private void truncateTables() {
    jdbcTemplate.execute("truncate table users restart identity cascade");
  }

  private void await(CountDownLatch latch) {
    try {
      if (!latch.await(5, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Timed out waiting for concurrent test latch");
      }
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while waiting for concurrent test latch", ex);
    }
  }

  private record RaceResults(AttemptResult first, AttemptResult second) {
  }

  private record AttemptResult(boolean successful, Throwable failure) {

    private static AttemptResult success() {
      return new AttemptResult(true, null);
    }

    private static AttemptResult failure(Throwable failure) {
      return new AttemptResult(false, failure);
    }
  }
}
