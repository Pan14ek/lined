package io.backend.lined.lobby.invite.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import io.backend.lined.lobby.invite.api.LobbyInviteMapper;
import io.backend.lined.lobby.invite.domain.LobbyInviteEntity;
import io.backend.lined.lobby.invite.domain.LobbyInviteRepository;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.backend.lined.lobby.service.LobbyAccessPolicy;
import io.backend.lined.entitlement.application.LimitEvaluator;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LobbyInviteServiceImplTest {

  @Mock
  private LobbyRepository lobbyRepo;
  @Mock
  private UserRepository userRepo;
  @Mock
  private LobbyInviteRepository inviteRepo;
  @Mock
  private LobbyInviteMapper mapper;
  @Mock
  private EntityManager entityManager;
  @Mock
  private LimitEvaluator limitEvaluator;
  @Spy
  private LobbyAccessPolicy accessPolicy;

  @InjectMocks
  private LobbyInviteServiceImpl inviteService;

  private UserEntity owner;
  private UserEntity invitee;
  private LobbyEntity lobby;
  private LobbyInviteEntity invite;
  private LobbyInviteDto inviteDto;

  @BeforeEach
  void setUp() {
    owner = user(1L, "owner");
    invitee = user(2L, "invitee");
    lobby = LobbyEntity.builder()
        .id(101L)
        .name("Our Family")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner)))
        .build();
    invite = LobbyInviteEntity.builder()
        .id(501L)
        .lobby(lobby)
        .inviter(owner)
        .invitee(invitee)
        .status(LobbyInviteStatus.PENDING)
        .sentAt(OffsetDateTime.parse("2026-07-16T10:00:00Z"))
        .createdAt(OffsetDateTime.parse("2026-07-16T10:00:00Z"))
        .updatedAt(OffsetDateTime.parse("2026-07-16T10:00:00Z"))
        .build();
    inviteDto = new LobbyInviteDto(501L, 101L, 1L, 2L, LobbyInviteStatus.PENDING,
        invite.getSentAt(), invite.getCreatedAt(), invite.getUpdatedAt());
  }

  @Test
  void create_savesPendingInviteWithoutAddingMember() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(userRepo.findById(2L)).thenReturn(Optional.of(invitee));
    when(inviteRepo.findByLobby_IdAndInvitee_IdAndStatus(101L, 2L, LobbyInviteStatus.PENDING))
        .thenReturn(Optional.empty());
    when(inviteRepo.save(any(LobbyInviteEntity.class))).thenReturn(invite);
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    LobbyInviteDto result = inviteService.create(101L, 2L, null, 1L);

    ArgumentCaptor<LobbyInviteEntity> captor = ArgumentCaptor.forClass(LobbyInviteEntity.class);
    verify(inviteRepo).save(captor.capture());
    assertThat(result).isEqualTo(inviteDto);
    assertThat(captor.getValue().getStatus()).isEqualTo(LobbyInviteStatus.PENDING);
    assertThat(lobby.getMembers()).containsExactly(owner);
  }

  @Test
  void create_throwsConflict_whenUserIsAlreadyMember() {
    lobby.getMembers().add(invitee);
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(userRepo.findById(2L)).thenReturn(Optional.of(invitee));

    assertThatThrownBy(() -> inviteService.create(101L, 2L, null, 1L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("already a lobby member");

    verify(inviteRepo, never()).save(any());
  }

  @Test
  void create_throwsConflict_whenPendingInviteExists() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(userRepo.findById(2L)).thenReturn(Optional.of(invitee));
    when(inviteRepo.findByLobby_IdAndInvitee_IdAndStatus(101L, 2L, LobbyInviteStatus.PENDING))
        .thenReturn(Optional.of(invite));

    assertThatThrownBy(() -> inviteService.create(101L, 2L, null, 1L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("pending");
  }

  @Test
  void create_resolvesInviteeByEmail() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(userRepo.findByEmailIgnoreCase("invitee@example.com")).thenReturn(Optional.of(invitee));
    when(inviteRepo.findByLobby_IdAndInvitee_IdAndStatus(101L, 2L, LobbyInviteStatus.PENDING))
        .thenReturn(Optional.empty());
    when(inviteRepo.save(any(LobbyInviteEntity.class))).thenReturn(invite);
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    assertThat(inviteService.create(101L, null, "invitee@example.com", 1L)).isEqualTo(inviteDto);
  }

  @Test
  void create_rejectsMissingOrAmbiguousInviteeSelector() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> inviteService.create(101L, null, null, 1L))
        .hasMessageContaining("exactly one");
    assertThatThrownBy(() -> inviteService.create(101L, 2L, "invitee@example.com", 1L))
        .hasMessageContaining("exactly one");
  }

  @Test
  void pendingForLobby_returnsOnlyPendingInvitesForOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(inviteRepo.findAllByLobby_IdAndStatusOrderBySentAtDesc(101L, LobbyInviteStatus.PENDING))
        .thenReturn(List.of(invite));
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    assertThat(inviteService.pendingForLobby(101L, 1L)).containsExactly(inviteDto);
  }

  @Test
  void pendingForLobby_throwsForbidden_whenRequesterIsNotOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));

    assertThatThrownBy(() -> inviteService.pendingForLobby(101L, 99L))
        .isInstanceOf(ForbiddenException.class);
  }

  @Test
  void pendingForInvitee_returnsOwnPendingInvites() {
    when(inviteRepo.findAllByInvitee_IdAndStatusOrderBySentAtDesc(2L, LobbyInviteStatus.PENDING))
        .thenReturn(List.of(invite));
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    assertThat(inviteService.pendingForInvitee(2L)).containsExactly(inviteDto);
  }

  @Test
  void resend_renewsSentTimeForPendingInvite() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(mapper.toDto(invite)).thenReturn(inviteDto);
    OffsetDateTime previousSentAt = invite.getSentAt();

    inviteService.resend(101L, 501L, 1L);

    assertThat(invite.getSentAt()).isAfter(previousSentAt);
    assertThat(invite.getUpdatedAt()).isAfter(previousSentAt);
  }

  @Test
  void cancel_marksPendingInviteCancelled() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(inviteRepo.transitionPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(LobbyInviteStatus.CANCELLED),
        any(OffsetDateTime.class))).thenReturn(1);
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    inviteService.cancel(101L, 501L, 1L);

    assertThat(invite.getStatus()).isEqualTo(LobbyInviteStatus.CANCELLED);
    assertThat(invite.getUpdatedAt()).isAfter(OffsetDateTime.parse("2026-07-16T10:00:00Z"));
  }

  @Test
  void cancel_throwsConflict_whenConcurrentAcceptanceAlreadyClaimedInvite() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobby));
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(inviteRepo.transitionPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(LobbyInviteStatus.CANCELLED),
        any(OffsetDateTime.class))).thenReturn(0);

    assertThatThrownBy(() -> inviteService.cancel(101L, 501L, 1L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("no longer pending");
  }

  @Test
  void accept_addsInviteeAndMarksInviteAccepted() {
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(inviteRepo.acceptPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(2L),
        any(OffsetDateTime.class))).thenReturn(1);
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    inviteService.accept(501L, 2L);

    assertThat(lobby.getMembers()).contains(owner, invitee);
    assertThat(invite.getStatus()).isEqualTo(LobbyInviteStatus.ACCEPTED);
    verify(limitEvaluator).assertCanAcceptInvite(101L);
  }

  @Test
  void accept_doesNotClaimInvite_whenLobbyMemberLimitIsExceeded() {
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    org.mockito.Mockito.doThrow(new ConflictException(
        "LOBBY_MEMBER_LIMIT_EXCEEDED", "Lobby member limit exceeded for current plan"))
        .when(limitEvaluator).assertCanAcceptInvite(101L);

    assertThatThrownBy(() -> inviteService.accept(501L, 2L))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_MEMBER_LIMIT_EXCEEDED");

    verify(inviteRepo, never()).acceptPending(
        org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(), any());
    assertThat(lobby.getMembers()).containsExactly(owner);
    assertThat(invite.getStatus()).isEqualTo(LobbyInviteStatus.PENDING);
  }

  @Test
  void accept_returnsAcceptedInvite_whenConcurrentRequestAlreadyClaimedIt() {
    var acceptedInvite = LobbyInviteEntity.builder()
        .id(501L)
        .lobby(lobby)
        .inviter(owner)
        .invitee(invitee)
        .status(LobbyInviteStatus.ACCEPTED)
        .sentAt(invite.getSentAt())
        .createdAt(invite.getCreatedAt())
        .updatedAt(invite.getUpdatedAt().plusMinutes(1))
        .build();
    var acceptedDto = new LobbyInviteDto(501L, 101L, 1L, 2L, LobbyInviteStatus.ACCEPTED,
        acceptedInvite.getSentAt(), acceptedInvite.getCreatedAt(), acceptedInvite.getUpdatedAt());
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite), Optional.of(acceptedInvite));
    when(inviteRepo.acceptPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(2L),
        any(OffsetDateTime.class))).thenReturn(0);
    when(mapper.toDto(acceptedInvite)).thenReturn(acceptedDto);

    assertThat(inviteService.accept(501L, 2L)).isEqualTo(acceptedDto);
    verify(entityManager).clear();
  }

  @Test
  void accept_returnsAcceptedInvite_whenAlreadyAcceptedBySameInvitee() {
    invite.setStatus(LobbyInviteStatus.ACCEPTED);
    var acceptedDto = new LobbyInviteDto(501L, 101L, 1L, 2L, LobbyInviteStatus.ACCEPTED,
        invite.getSentAt(), invite.getCreatedAt(), invite.getUpdatedAt());
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(mapper.toDto(invite)).thenReturn(acceptedDto);

    assertThat(inviteService.accept(501L, 2L)).isEqualTo(acceptedDto);
    verify(inviteRepo, never()).acceptPending(any(), any(), any());
  }

  @Test
  void accept_throwsForbidden_whenRequesterIsNotInvitee() {
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));

    assertThatThrownBy(() -> inviteService.accept(501L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("invited user");
  }

  @Test
  void decline_marksPendingInviteDeclined() {
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(inviteRepo.transitionPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(LobbyInviteStatus.DECLINED),
        any(OffsetDateTime.class))).thenReturn(1);
    when(mapper.toDto(invite)).thenReturn(inviteDto);

    inviteService.decline(501L, 2L);

    assertThat(invite.getStatus()).isEqualTo(LobbyInviteStatus.DECLINED);
    assertThat(lobby.getMembers()).containsExactly(owner);
  }

  @Test
  void decline_throwsConflict_whenConcurrentAcceptanceAlreadyClaimedInvite() {
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));
    when(inviteRepo.transitionPending(
        org.mockito.ArgumentMatchers.eq(501L),
        org.mockito.ArgumentMatchers.eq(LobbyInviteStatus.DECLINED),
        any(OffsetDateTime.class))).thenReturn(0);

    assertThatThrownBy(() -> inviteService.decline(501L, 2L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("no longer pending");
  }

  @Test
  void decline_throwsConflict_whenInviteIsTerminal() {
    invite.setStatus(LobbyInviteStatus.CANCELLED);
    when(inviteRepo.findById(501L)).thenReturn(Optional.of(invite));

    assertThatThrownBy(() -> inviteService.decline(501L, 2L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("no longer pending");
  }

  private UserEntity user(Long id, String username) {
    return UserEntity.builder().id(id).username(username).build();
  }
}
