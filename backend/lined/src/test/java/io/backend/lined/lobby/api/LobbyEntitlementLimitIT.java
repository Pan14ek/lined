package io.backend.lined.lobby.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class LobbyEntitlementLimitIT {

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
  private MockMvc mockMvc;
  @Autowired
  private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void setUp() {
    jdbcTemplate.execute("truncate table lobby_invites, lobby_members, lobbies, billing_accounts, users cascade");
  }

  @Test
  void create_returnsLimitCode_whenFreeOwnerAlreadyOwnsOneLobby() throws Exception {
    long ownerId = insertUser("create-owner");
    insertPersonalBillingAccount(ownerId);

    createLobby(ownerId).andExpect(status().isOk());

    createLobby(ownerId)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LOBBY_LIMIT_EXCEEDED"));
  }

  @Test
  void accept_returnsLimitCode_whenFreeOwnedLobbyAlreadyHasFourMembers() throws Exception {
    long ownerId = insertUser("invite-owner");
    long firstMemberId = insertUser("invite-member-one");
    long secondMemberId = insertUser("invite-member-two");
    long thirdMemberId = insertUser("invite-member-three");
    long inviteeId = insertUser("invitee");
    insertPersonalBillingAccount(ownerId);
    long lobbyId = insertLobby(ownerId);
    insertMember(lobbyId, ownerId);
    insertMember(lobbyId, firstMemberId);
    insertMember(lobbyId, secondMemberId);
    insertMember(lobbyId, thirdMemberId);
    long inviteId = insertPendingInvite(lobbyId, ownerId, inviteeId);

    mockMvc.perform(post("/api/lobby-invites/{inviteId}/accept", inviteId)
            .header("X-User-Id", inviteeId))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("LOBBY_MEMBER_LIMIT_EXCEEDED"));
  }

  private ResultActions createLobby(long ownerId) throws Exception {
    return mockMvc.perform(post("/api/lobbies")
        .header("X-User-Id", ownerId)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Our Family\",\"lobbyType\":\"FAMILY\"}"));
  }

  private long insertUser(String username) {
    return jdbcTemplate.queryForObject("""
        insert into users (username, email, password)
        values (?, ?, 'password')
        returning id
        """, Long.class, username, username + "@example.com");
  }

  private void insertPersonalBillingAccount(long ownerUserId) {
    jdbcTemplate.update("""
        insert into billing_accounts (owner_user_id, type, status)
        values (?, 'PERSONAL', 'ACTIVE')
        """, ownerUserId);
  }

  private long insertLobby(long ownerId) {
    return jdbcTemplate.queryForObject("""
        insert into lobbies (name, lobby_type, owner_id)
        values ('Our Family', 'FAMILY', ?)
        returning id
        """, Long.class, ownerId);
  }

  private void insertMember(long lobbyId, long userId) {
    jdbcTemplate.update("insert into lobby_members (lobby_id, user_id) values (?, ?)", lobbyId, userId);
  }

  private long insertPendingInvite(long lobbyId, long inviterId, long inviteeId) {
    return jdbcTemplate.queryForObject("""
        insert into lobby_invites (lobby_id, inviter_id, invitee_id, status)
        values (?, ?, ?, 'PENDING')
        returning id
        """, Long.class, lobbyId, inviterId, inviteeId);
  }
}
