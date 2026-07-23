package io.backend.lined.lobby.invite.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import java.util.List;
import java.util.concurrent.Callable;
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
class LobbyInviteServiceConcurrencyTest {

  @Container
  private static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void postgresProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired
  private LobbyInviteService inviteService;

  @Autowired
  private PlatformTransactionManager transactionManager;

  @Autowired
  private JdbcTemplate jdbcTemplate;

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
  void accept_acceptsExactlyOnce_andReturnsAcceptedInviteToConcurrentRetry() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);

      Callable<LobbyInviteDto> attempt = () -> inTransaction(() -> {
        ready.countDown();
        await(ready);
        await(release);
        return inviteService.accept(501L, 2L);
      });

      Future<LobbyInviteDto> first = executor.submit(attempt);
      Future<LobbyInviteDto> second = executor.submit(attempt);

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();

      LobbyInviteDto firstResult = first.get(10, TimeUnit.SECONDS);
      LobbyInviteDto secondResult = second.get(10, TimeUnit.SECONDS);

      assertThat(firstResult.status()).isEqualTo(LobbyInviteStatus.ACCEPTED);
      assertThat(secondResult.status()).isEqualTo(LobbyInviteStatus.ACCEPTED);
      assertThat(firstResult.id()).isEqualTo(501L);
      assertThat(secondResult.id()).isEqualTo(501L);
      assertThat(memberCount()).isEqualTo(2);
      assertThat(inviteStatus()).isEqualTo("ACCEPTED");
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void accept_andDecline_leaveOneTerminalState_withMembershipMatchingAcceptance() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    try {
      CountDownLatch ready = new CountDownLatch(2);
      CountDownLatch release = new CountDownLatch(1);

      Future<TransitionResult> acceptance = executor.submit(
          () -> runTransition(ready, release, () -> inviteService.accept(501L, 2L)));
      Future<TransitionResult> decline = executor.submit(
          () -> runTransition(ready, release, () -> inviteService.decline(501L, 2L)));

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      release.countDown();

      assertThat(List.of(acceptance.get(10, TimeUnit.SECONDS), decline.get(10, TimeUnit.SECONDS)))
          .filteredOn(TransitionResult::succeeded)
          .hasSize(1);
      assertThat(inviteStatus()).isIn("ACCEPTED", "DECLINED");
      assertThat(memberCount()).isEqualTo(inviteStatus().equals("ACCEPTED") ? 2 : 1);
    } finally {
      executor.shutdownNow();
    }
  }

  private TransitionResult runTransition(
      CountDownLatch ready, CountDownLatch release, Callable<LobbyInviteDto> callback) {
    try {
      return inTransaction(() -> {
        ready.countDown();
        await(ready);
        await(release);
        return new TransitionResult(callback.call(), false);
      });
    } catch (ConflictException ex) {
      return new TransitionResult(null, true);
    }
  }

  private <T> T inTransaction(Callable<T> callback) {
    return new TransactionTemplate(transactionManager).execute(status -> {
      try {
        return callback.call();
      } catch (RuntimeException ex) {
        throw ex;
      } catch (Exception ex) {
        throw new IllegalStateException(ex);
      }
    });
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

  private void insertFixtures() {
    jdbcTemplate.update("""
        insert into users (id, username, email, password, version, created_at)
        values (1, 'owner', 'owner@example.com', 'pw', 0, now()),
               (2, 'invitee', 'invitee@example.com', 'pw', 0, now())
        """);
    jdbcTemplate.update("""
        insert into lobbies (id, name, lobby_type, owner_id, version)
        values (101, 'Home', 'COUPLE', 1, 0)
        """);
    jdbcTemplate.update("insert into lobby_members (lobby_id, user_id) values (101, 1)");
    jdbcTemplate.update("""
        insert into lobby_invites
          (id, lobby_id, inviter_id, invitee_id, status, sent_at, created_at, updated_at)
        values
          (501, 101, 1, 2, 'PENDING', now(), now(), now())
        """);
  }

  private void truncateTables() {
    jdbcTemplate.execute("""
        truncate table
          lobby_invites,
          lobby_members,
          lobbies,
          users
        restart identity cascade
        """);
  }

  private int memberCount() {
    Integer count = jdbcTemplate.queryForObject(
        "select count(*) from lobby_members where lobby_id = 101", Integer.class);
    return count == null ? 0 : count;
  }

  private String inviteStatus() {
    return jdbcTemplate.queryForObject(
        "select status from lobby_invites where id = 501", String.class);
  }

  private record TransitionResult(LobbyInviteDto invite, boolean conflicted) {

    private boolean succeeded() {
      return !conflicted;
    }
  }
}
