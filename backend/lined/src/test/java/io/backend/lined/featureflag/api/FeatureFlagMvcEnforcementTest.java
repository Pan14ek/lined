package io.backend.lined.featureflag.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.backend.lined.app.AccountApplicationService;
import io.backend.lined.billing.api.web.BillingController;
import io.backend.lined.billing.application.BillingAccountService;
import io.backend.lined.billing.application.EffectivePlanResolver;
import io.backend.lined.billing.domain.account.BillingAccountEntity;
import io.backend.lined.billing.domain.plan.PlanCode;
import io.backend.lined.config.GlobalExceptionHandler;
import io.backend.lined.entitlement.application.EntitlementService;
import io.backend.lined.entitlement.domain.PlanEntitlements;
import io.backend.lined.event.api.CalendarFeedTokenDto;
import io.backend.lined.event.api.CalendarIcsController;
import io.backend.lined.event.api.EventController;
import io.backend.lined.event.api.EventDto;
import io.backend.lined.event.api.FreeSlotDto;
import io.backend.lined.event.domain.EventVisibility;
import io.backend.lined.event.service.CalendarIcsService;
import io.backend.lined.event.service.EventService;
import io.backend.lined.featureflag.domain.FeatureFlagKey;
import io.backend.lined.featureflag.service.FeatureFlagService;
import io.backend.lined.lobby.api.LobbyController;
import io.backend.lined.lobby.api.LobbyDto;
import io.backend.lined.lobby.domain.LobbyTypes;
import io.backend.lined.lobby.invite.api.LobbyInviteController;
import io.backend.lined.lobby.invite.api.LobbyInviteDto;
import io.backend.lined.lobby.invite.domain.LobbyInviteStatus;
import io.backend.lined.lobby.invite.service.LobbyInviteService;
import io.backend.lined.lobby.service.LobbyService;
import io.backend.lined.notification.api.LobbyNotificationPreferenceController;
import io.backend.lined.notification.api.LobbyNotificationPreferencesDto;
import io.backend.lined.notification.api.NotificationController;
import io.backend.lined.notification.api.NotificationPreferencesDto;
import io.backend.lined.notification.service.NotificationService;
import io.backend.lined.task.api.TaskController;
import io.backend.lined.task.api.TaskDto;
import io.backend.lined.task.domain.TaskPriority;
import io.backend.lined.task.domain.TaskStatus;
import io.backend.lined.task.domain.TaskVisibility;
import io.backend.lined.task.service.TaskService;
import io.backend.lined.user.api.UserController;
import io.backend.lined.user.api.UserDto;
import io.backend.lined.user.service.UserService;
import io.backend.lined.security.CurrentUserProvider;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class FeatureFlagMvcEnforcementTest {

  private static final Long USER_ID = 42L;
  private static final Long LOBBY_ID = 101L;
  private static final String FEATURE_DISABLED_TYPE = "https://errors.lined.app/feature.disabled";
  private static final String FEATURE_DISABLED_DETAIL = "This feature is currently unavailable";
  private static final OffsetDateTime FROM = OffsetDateTime.parse("2026-01-01T09:00:00Z");
  private static final OffsetDateTime TO = OffsetDateTime.parse("2026-01-01T10:00:00Z");

  @Mock
  private FeatureFlagService featureFlagService;
  @Mock
  private EventService eventService;
  @Mock
  private CalendarIcsService calendarIcsService;
  @Mock
  private TaskService taskService;
  @Mock
  private NotificationService notificationService;
  @Mock
  private LobbyService lobbyService;
  @Mock
  private LobbyInviteService lobbyInviteService;
  @Mock
  private UserService userService;
  @Mock
  private AccountApplicationService accountApplicationService;
  @Mock
  private BillingAccountService billingAccountService;
  @Mock
  private EffectivePlanResolver effectivePlanResolver;
  @Mock
  private EntitlementService entitlementService;
  @Mock
  private CurrentUserProvider currentUserProvider;

  private FeatureFlagInterceptor interceptor;

  @BeforeEach
  void setUp() {
    lenient().when(currentUserProvider.requireUserId()).thenReturn(USER_ID);
    interceptor = new FeatureFlagInterceptor(featureFlagService, new FeatureRequiredResolver(),
        new FeatureFlagBlockedRequestLogger());
  }

  @Test
  void calendarEvents_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new EventController(eventService, currentUserProvider));
    when(eventService.list(LOBBY_ID, FROM, TO, USER_ID)).thenReturn(List.of(sampleEvent()));

    assertDisabled(mockMvc, calendarEventsRequest(), FeatureFlagKey.CALENDARS);
    verifyNoInteractions(eventService);

    when(featureFlagService.isEnabled(FeatureFlagKey.CALENDARS.value())).thenReturn(true);

    mockMvc.perform(calendarEventsRequest())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(9001));

    verify(eventService).list(LOBBY_ID, FROM, TO, USER_ID);
  }

  @Test
  void calendarIcsEndpoints_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new CalendarIcsController(calendarIcsService, currentUserProvider));
    when(calendarIcsService.createFeedToken(USER_ID))
        .thenReturn(new CalendarFeedTokenDto("/api/calendar/feed/token.ics"));

    MockHttpServletRequestBuilder request = post("/api/calendar/feed-token");
    assertDisabled(mockMvc, request, FeatureFlagKey.CALENDARS);
    verifyNoInteractions(calendarIcsService);

    when(featureFlagService.isEnabled(FeatureFlagKey.CALENDARS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.feedUrl").value("/api/calendar/feed/token.ics"));

    verify(calendarIcsService).createFeedToken(USER_ID);
  }

  @Test
  void lobbyFreeSlots_belongToCalendarInsteadOfLobbies() throws Exception {
    MockMvc mockMvc = mvc(new LobbyController(lobbyService, eventService, currentUserProvider));
    when(eventService.findFreeSlots(LOBBY_ID, FROM, TO, USER_ID))
        .thenReturn(List.of(new FreeSlotDto(FROM, TO)));

    MockHttpServletRequestBuilder request = get("/api/lobbies/101/free-slots")
        .param("from", FROM.toString())
        .param("to", TO.toString());
    assertDisabled(mockMvc, request, FeatureFlagKey.CALENDARS);
    verifyNoInteractions(lobbyService, eventService);

    when(featureFlagService.isEnabled(FeatureFlagKey.CALENDARS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].start").exists())
        .andExpect(jsonPath("$[0].end").exists());

    verify(eventService).findFreeSlots(LOBBY_ID, FROM, TO, USER_ID);
  }

  @Test
  void taskEndpoints_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new TaskController(taskService, currentUserProvider));
    when(taskService.list(null, null, null, USER_ID)).thenReturn(List.of(sampleTask()));

    MockHttpServletRequestBuilder request = get("/api/tasks");
    assertDisabled(mockMvc, request, FeatureFlagKey.TASKS);
    verifyNoInteractions(taskService);

    when(featureFlagService.isEnabled(FeatureFlagKey.TASKS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(555));

    verify(taskService).list(null, null, null, USER_ID);
  }

  @Test
  void notificationEndpoints_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new NotificationController(notificationService, currentUserProvider));
    when(notificationService.getPreferences(USER_ID))
        .thenReturn(new NotificationPreferencesDto(1L, true, true, true, true, true));

    MockHttpServletRequestBuilder request = get("/api/notifications/preferences");
    assertDisabled(mockMvc, request, FeatureFlagKey.NOTIFICATIONS);
    verifyNoInteractions(notificationService);

    when(featureFlagService.isEnabled(FeatureFlagKey.NOTIFICATIONS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.version").value(1));

    verify(notificationService).getPreferences(USER_ID);
  }

  @Test
  void lobbyNotificationPreferences_belongToNotificationsInsteadOfLobbies() throws Exception {
    MockMvc mockMvc = mvc(new LobbyNotificationPreferenceController(
        notificationService, currentUserProvider));
    when(notificationService.getLobbyPreferences(LOBBY_ID, USER_ID))
        .thenReturn(new LobbyNotificationPreferencesDto(LOBBY_ID, 2L, true, true, true));

    MockHttpServletRequestBuilder request = get("/api/lobbies/101/notification-preferences");
    assertDisabled(mockMvc, request, FeatureFlagKey.NOTIFICATIONS);
    verifyNoInteractions(notificationService);

    when(featureFlagService.isEnabled(FeatureFlagKey.NOTIFICATIONS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lobbyId").value(101));

    verify(notificationService).getLobbyPreferences(LOBBY_ID, USER_ID);
  }

  @Test
  void lobbyWrites_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled() throws Exception {
    MockMvc mockMvc = mvc(new LobbyController(lobbyService, eventService, currentUserProvider));
    when(lobbyService.create(any(), eq(USER_ID))).thenReturn(sampleLobby());

    MockHttpServletRequestBuilder request = post("/api/lobbies")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"name":"Our Family","lobbyType":"FAMILY"}
            """);
    assertDisabled(mockMvc, request, FeatureFlagKey.LOBBIES);
    verifyNoInteractions(lobbyService, eventService);

    when(featureFlagService.isEnabled(FeatureFlagKey.LOBBIES.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(101));

    verify(lobbyService).create(any(), eq(USER_ID));
  }

  @Test
  void lobbyInvites_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new LobbyInviteController(lobbyInviteService, currentUserProvider));
    when(lobbyInviteService.pendingForInvitee(USER_ID)).thenReturn(List.of(sampleInvite()));

    MockHttpServletRequestBuilder request = get("/api/lobby-invites/mine");
    assertDisabled(mockMvc, request, FeatureFlagKey.LOBBIES);
    verifyNoInteractions(lobbyInviteService);

    when(featureFlagService.isEnabled(FeatureFlagKey.LOBBIES.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(501));

    verify(lobbyInviteService).pendingForInvitee(USER_ID);
  }

  @Test
  void settingsMutations_stopBeforeControllerWhenDisabled_andReachServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new UserController(userService, accountApplicationService,
        currentUserProvider));
    when(userService.update(eq(1L), any(), eq(0L))).thenReturn(sampleUser());

    MockHttpServletRequestBuilder request = patch("/api/users/1")
        .header("If-Match", "\"0\"")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"email":"new.mail@example.com"}
            """);
    assertDisabled(mockMvc, request, FeatureFlagKey.SETTINGS);
    verifyNoInteractions(userService, accountApplicationService);

    when(featureFlagService.isEnabled(FeatureFlagKey.SETTINGS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1));

    verify(userService).update(eq(1L), any(), eq(0L));
  }

  @Test
  void subscriptionFlow_stopsBeforeBillingControllerWhenDisabled_andReachesServiceWhenEnabled()
      throws Exception {
    MockMvc mockMvc = mvc(new BillingController(billingAccountService, effectivePlanResolver,
        entitlementService, currentUserProvider));
    BillingAccountEntity account = BillingAccountEntity.builder().id(31L).build();
    when(billingAccountService.getByOwnerUserId(USER_ID)).thenReturn(account);
    when(effectivePlanResolver.resolve(eq(31L), any(Instant.class))).thenReturn(PlanCode.FREE);
    when(entitlementService.getEntitlements(PlanCode.FREE))
        .thenReturn(new PlanEntitlements(1, 4, false, true, true));

    MockHttpServletRequestBuilder request = get("/api/billing/me");
    assertDisabled(mockMvc, request, FeatureFlagKey.SUBSCRIPTIONS);
    verifyNoInteractions(billingAccountService, effectivePlanResolver, entitlementService);

    when(featureFlagService.isEnabled(FeatureFlagKey.SUBSCRIPTIONS.value())).thenReturn(true);

    mockMvc.perform(request)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.billingAccountId").value(31));

    verify(billingAccountService).getByOwnerUserId(USER_ID);
    verify(effectivePlanResolver).resolve(eq(31L), any(Instant.class));
    verify(entitlementService).getEntitlements(PlanCode.FREE);
  }

  @Test
  void sharedLobbyReadsRemainAvailableWhenLobbyManagementIsDisabled() throws Exception {
    MockMvc mockMvc = mvc(new LobbyController(lobbyService, eventService, currentUserProvider));
    when(lobbyService.archivedLobbies(USER_ID)).thenReturn(List.of(sampleLobby()));

    mockMvc.perform(get("/api/lobbies")
            .param("lifecycleStatus", "ARCHIVED"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(101));

    verifyNoInteractions(featureFlagService);
    verify(lobbyService).archivedLobbies(USER_ID);
  }

  @Test
  void userReadsRemainAvailableWhenSettingsAreDisabled() throws Exception {
    MockMvc mockMvc = mvc(new UserController(userService, accountApplicationService,
        currentUserProvider));
    when(userService.getById(1L)).thenReturn(sampleUser());

    mockMvc.perform(get("/api/users/1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1));

    verifyNoInteractions(featureFlagService, accountApplicationService);
    verify(userService).getById(1L);
  }

  private MockMvc mvc(Object controller) {
    return MockMvcBuilders.standaloneSetup(controller)
        .addInterceptors(interceptor)
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  private MockHttpServletRequestBuilder calendarEventsRequest() {
    return get("/api/calendar/events")
        .param("lobbyId", "101")
        .param("from", FROM.toString())
        .param("to", TO.toString());
  }

  private void assertDisabled(MockMvc mockMvc, MockHttpServletRequestBuilder request,
                              FeatureFlagKey key) throws Exception {
    when(featureFlagService.isEnabled(key.value())).thenReturn(false);

    mockMvc.perform(request)
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value(FEATURE_DISABLED_TYPE))
        .andExpect(jsonPath("$.detail").value(FEATURE_DISABLED_DETAIL))
        .andExpect(jsonPath("$.feature").value(key.value()));
  }

  private EventDto sampleEvent() {
    return new EventDto(9001L, 0L, "Dinner together", "Whole Foods Market", true,
        EventVisibility.SHARED, FROM, TO, "Europe/Kyiv", 30, LOBBY_ID, USER_ID, FROM);
  }

  private TaskDto sampleTask() {
    return new TaskDto(555L, 0L, "Buy groceries", "Pick up milk and bread", TaskPriority.MEDIUM,
        TaskStatus.TODO, TaskVisibility.SHARED, LOBBY_ID, USER_ID, USER_ID,
        LocalDate.parse("2026-01-02"), FROM);
  }

  private LobbyDto sampleLobby() {
    return new LobbyDto(LOBBY_ID, "Our Family", LobbyTypes.FAMILY, USER_ID, Set.of(USER_ID));
  }

  private LobbyInviteDto sampleInvite() {
    return new LobbyInviteDto(501L, LOBBY_ID, USER_ID, 77L, LobbyInviteStatus.PENDING, FROM, FROM,
        FROM);
  }

  private UserDto sampleUser() {
    return new UserDto(1L, 0L, "alex", "alex@example.com", FROM, Set.of("ROLE_USER"), null, null);
  }
}
