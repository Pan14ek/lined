package io.backend.lined.entitlement.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.lobby.domain.LobbyEntity;
import io.backend.lined.lobby.domain.LobbyRepository;
import io.backend.lined.user.domain.UserEntity;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LimitEvaluatorTest {

  private static final long OWNER_ID = 1L;
  private static final long BILLING_ACCOUNT_ID = 11L;
  private static final long LOBBY_ID = 101L;

  @Mock
  private LobbyRepository lobbyRepository;
  @Mock
  private BillingAccountService billingAccountService;
  @Mock
  private EntitlementService entitlementService;

  @InjectMocks
  private LimitEvaluator limitEvaluator;

  @BeforeEach
  void setUp() {
    BillingAccountEntity account = BillingAccountEntity.builder().id(BILLING_ACCOUNT_ID).build();
    UserEntity owner = new UserEntity();
    owner.setId(OWNER_ID);
    LobbyEntity lobby = LobbyEntity.builder().id(LOBBY_ID).owner(owner).build();
    when(billingAccountService.getByOwnerUserId(OWNER_ID)).thenReturn(account);
    lenient().when(lobbyRepository.findById(LOBBY_ID)).thenReturn(Optional.of(lobby));
  }

  @Test
  void assertCanCreateLobby_allowsFirstLobby_whenPlanIsFree() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.FREE);
    when(lobbyRepository.countByOwner_Id(OWNER_ID)).thenReturn(0L);

    assertThatCode(() -> limitEvaluator.assertCanCreateLobby(OWNER_ID)).doesNotThrowAnyException();
  }

  @Test
  void assertCanCreateLobby_rejectsSecondLobby_whenPlanIsFree() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.FREE);
    when(lobbyRepository.countByOwner_Id(OWNER_ID)).thenReturn(1L);

    assertThatThrownBy(() -> limitEvaluator.assertCanCreateLobby(OWNER_ID))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_LIMIT_EXCEEDED");
  }

  @Test
  void assertCanCreateLobby_allowsTenthLobby_whenPlanIsPro() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.PRO);
    when(lobbyRepository.countByOwner_Id(OWNER_ID)).thenReturn(9L);

    assertThatCode(() -> limitEvaluator.assertCanCreateLobby(OWNER_ID)).doesNotThrowAnyException();
  }

  @Test
  void assertCanCreateLobby_rejectsEleventhLobby_whenPlanIsPro() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.PRO);
    when(lobbyRepository.countByOwner_Id(OWNER_ID)).thenReturn(10L);

    assertThatThrownBy(() -> limitEvaluator.assertCanCreateLobby(OWNER_ID))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_LIMIT_EXCEEDED");
  }

  @Test
  void assertCanAcceptInvite_allowsFourthMember_whenPlanIsFree() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.FREE);
    when(lobbyRepository.countMembersByLobbyId(LOBBY_ID)).thenReturn(3L);

    assertThatCode(() -> limitEvaluator.assertCanAcceptInvite(LOBBY_ID)).doesNotThrowAnyException();
  }

  @Test
  void assertCanAcceptInvite_rejectsFifthMember_whenPlanIsFree() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.FREE);
    when(lobbyRepository.countMembersByLobbyId(LOBBY_ID)).thenReturn(4L);

    assertThatThrownBy(() -> limitEvaluator.assertCanAcceptInvite(LOBBY_ID))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_MEMBER_LIMIT_EXCEEDED");
  }

  @Test
  void assertCanAcceptInvite_allowsTwentiethMember_whenPlanIsPro() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.PRO);
    when(lobbyRepository.countMembersByLobbyId(LOBBY_ID)).thenReturn(19L);

    assertThatCode(() -> limitEvaluator.assertCanAcceptInvite(LOBBY_ID)).doesNotThrowAnyException();
  }

  @Test
  void assertCanAcceptInvite_rejectsTwentyFirstMember_whenPlanIsPro() {
    when(entitlementService.getEntitlements(BILLING_ACCOUNT_ID)).thenReturn(EntitlementService.PRO);
    when(lobbyRepository.countMembersByLobbyId(LOBBY_ID)).thenReturn(20L);

    assertThatThrownBy(() -> limitEvaluator.assertCanAcceptInvite(LOBBY_ID))
        .isInstanceOf(ConflictException.class)
        .extracting("code")
        .isEqualTo("LOBBY_MEMBER_LIMIT_EXCEEDED");
  }
}
