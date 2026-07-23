package io.backend.lined.lobby.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.ForbiddenException;
import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.entitlement.application.LimitEvaluator;
import io.backend.lined.lobby.api.LobbyCreateDto;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.api.LobbyMapper;
import io.backend.lined.lobby.api.LobbyUpdateDto;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.user.domain.UserEntity;
import io.backend.lined.user.domain.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LobbyServiceImplTest {

  @Mock
  private LobbyRepository lobbyRepo;
  @Mock
  private UserRepository userRepo;
  @Mock
  private LobbyMapper mapper;
  @Mock
  private LimitEvaluator limitEvaluator;
  @Spy
  private LobbyAccessPolicy accessPolicy;

  @InjectMocks
  private LobbyServiceImpl lobbyService;

  private UserEntity owner;
  private UserEntity member;
  private LobbyEntity lobbyEntity;
  private LobbyDto lobbyDto;

  @BeforeEach
  void setUp() {
    owner = new UserEntity();
    owner.setId(1L);
    owner.setUsername("owner");

    member = new UserEntity();
    member.setId(2L);
    member.setUsername("member");

    lobbyEntity = LobbyEntity.builder()
        .id(101L)
        .name("Our Family")
        .lobbyType(LobbyTypes.FAMILY)
        .owner(owner)
        .members(new HashSet<>(Set.of(owner)))
        .build();

    lobbyDto = new LobbyDto(101L, "Our Family", LobbyTypes.FAMILY, 1L, Set.of(1L));
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    LobbyCreateDto dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.save(any(LobbyEntity.class))).thenReturn(lobbyEntity);
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    LobbyDto result = lobbyService.create(dto, 1L);

    assertThat(result).isEqualTo(lobbyDto);
    verify(limitEvaluator).assertCanCreateLobby(1L);
    verify(lobbyRepo).save(any(LobbyEntity.class));
  }

  @Test
  void create_doesNotPersist_whenLobbyLimitIsExceeded() {
    LobbyCreateDto dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);
    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    org.mockito.Mockito.doThrow(new ConflictException(
        "LOBBY_LIMIT_EXCEEDED", "Lobby limit exceeded for current plan"))
        .when(limitEvaluator).assertCanCreateLobby(1L);

    assertThatThrownBy(() -> lobbyService.create(dto, 1L))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_LIMIT_EXCEEDED");

    verify(lobbyRepo, never()).save(any());
  }

  @Test
  void create_ownerIsAddedAsMember() {
    LobbyCreateDto dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);

    when(userRepo.findById(1L)).thenReturn(Optional.of(owner));
    when(lobbyRepo.save(any(LobbyEntity.class))).thenAnswer(invocation -> {
      LobbyEntity saved = invocation.getArgument(0);
      assertThat(saved.getMembers()).contains(owner);
      return lobbyEntity;
    });
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    lobbyService.create(dto, 1L);

    verify(lobbyRepo).save(any(LobbyEntity.class));
  }

  @Test
  void create_throwsNotFound_whenOwnerNotFound() {
    LobbyCreateDto dto = new LobbyCreateDto("Our Family", LobbyTypes.FAMILY);

    when(userRepo.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> lobbyService.create(dto, 99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(lobbyRepo, never()).save(any());
  }

  /* =======================
     GET BY ID
  ======================= */

  @Test
  void getById_success() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    LobbyDto result = lobbyService.getById(101L);

    assertThat(result).isEqualTo(lobbyDto);
  }

  @Test
  void getById_throwsNotFound_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> lobbyService.getById(999L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  /* =======================
     MY LOBBIES
  ======================= */

  @Test
  void myLobbies_returnsLobbiesForUser() {
    when(lobbyRepo.findAllByMemberId(1L)).thenReturn(List.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    List<LobbyDto> result = lobbyService.myLobbies(1L);

    assertThat(result).hasSize(1).containsExactly(lobbyDto);
  }

  @Test
  void myLobbies_returnsEmptyList_whenUserHasNoLobbies() {
    when(lobbyRepo.findAllByMemberId(99L)).thenReturn(List.of());

    List<LobbyDto> result = lobbyService.myLobbies(99L);

    assertThat(result).isEmpty();
  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_renamesLobby() {
    LobbyUpdateDto dto = new LobbyUpdateDto("Weekend Crew", null, null);
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    LobbyDto result = lobbyService.update(101L, dto, 1L);

    assertThat(result).isEqualTo(lobbyDto);
    assertThat(lobbyEntity.getName()).isEqualTo("Weekend Crew");
  }

  @Test
  void update_changesLobbyType() {
    LobbyUpdateDto dto = new LobbyUpdateDto(null, LobbyTypes.FRIENDS, null);
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    lobbyService.update(101L, dto, 1L);

    assertThat(lobbyEntity.getLobbyType()).isEqualTo(LobbyTypes.FRIENDS);
  }

  @Test
  void update_changesAllSuppliedFields() {
    lobbyEntity.getMembers().add(member);
    LobbyUpdateDto dto = new LobbyUpdateDto("Weekend Crew", LobbyTypes.FRIENDS, 2L);
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    lobbyService.update(101L, dto, 1L);

    assertThat(lobbyEntity.getName()).isEqualTo("Weekend Crew");
    assertThat(lobbyEntity.getLobbyType()).isEqualTo(LobbyTypes.FRIENDS);
    assertThat(lobbyEntity.getOwner()).isEqualTo(member);
    assertThat(lobbyEntity.getMembers()).containsExactlyInAnyOrder(owner, member);
  }

  @Test
  void update_skipsNullFields() {
    LobbyUpdateDto dto = new LobbyUpdateDto(null, null, null);
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    lobbyService.update(101L, dto, 1L);

    assertThat(lobbyEntity.getName()).isEqualTo("Our Family");
    assertThat(lobbyEntity.getLobbyType()).isEqualTo(LobbyTypes.FAMILY);
    assertThat(lobbyEntity.getOwner()).isEqualTo(owner);
  }

  @Test
  void update_throwsNotFound_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> lobbyService.update(999L, new LobbyUpdateDto(null, null, null), 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void update_throwsForbidden_whenRequesterIsNotOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    assertThatThrownBy(() -> lobbyService.update(101L, new LobbyUpdateDto(null, null, null), 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  @Test
  void update_throwsConflict_whenNewOwnerIsNotMember() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    assertThatThrownBy(() -> lobbyService.update(101L, new LobbyUpdateDto(null, null, 2L), 1L))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("member");
  }

  /* =======================
     REMOVE MEMBER
  ======================= */

  @Test
  void removeMember_success() {
    lobbyEntity.getMembers().add(member);

    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));
    when(mapper.toDto(lobbyEntity)).thenReturn(lobbyDto);

    LobbyDto result = lobbyService.removeMember(101L, 2L, 1L);

    assertThat(result).isNotNull();
    assertThat(lobbyEntity.getMembers()).doesNotContain(member);
  }

  @Test
  void removeMember_throwsBadRequest_whenRemovingOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    assertThatThrownBy(() -> lobbyService.removeMember(101L, 1L, 1L))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("Owner cannot be removed");
  }

  @Test
  void removeMember_throwsNotFound_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> lobbyService.removeMember(999L, 2L, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void removeMember_throwsForbidden_whenRequesterIsNotOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    assertThatThrownBy(() -> lobbyService.removeMember(101L, 2L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    lobbyService.delete(101L, 1L);

    verify(lobbyRepo).delete(lobbyEntity);
  }

  @Test
  void delete_throwsNotFound_whenLobbyNotFound() {
    when(lobbyRepo.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> lobbyService.delete(999L, 1L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("999");

    verify(lobbyRepo, never()).delete(any());
  }

  @Test
  void delete_throwsForbidden_whenRequesterIsNotOwner() {
    when(lobbyRepo.findById(101L)).thenReturn(Optional.of(lobbyEntity));

    assertThatThrownBy(() -> lobbyService.delete(101L, 99L))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("owner");

    verify(lobbyRepo, never()).delete(any());
  }
}
