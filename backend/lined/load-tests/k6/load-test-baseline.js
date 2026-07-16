import exec from 'k6/execution';
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const DEFAULTS = {
  baseUrl: 'http://localhost:8080',
  baselineDuration: '2m',
  baselineVus: '5',
  seedEventCount: '8',
  seedTaskCount: '12',
  stressMaxVus: '20',
  stressStageDuration: '30s',
  thinkTimeSeconds: '1',
  userCount: '4',
  workload: 'baseline',
};

const WORKLOADS = {
  baseline: 'baseline',
  mixed: 'mixed',
  negativeSmoke: 'negative-smoke',
  readHeavy: 'read-heavy',
  smoke: 'smoke',
  stress: 'stress',
  writeHeavy: 'write-heavy',
};

const STATUSES = {
  inProgress: 'IN_PROGRESS',
};

const LOBBY_TYPES = {
  friends: 'FRIENDS',
};

const EVENT_WINDOW = {
  from: '2026-01-01T00:00:00Z',
  seedDate: '2026-01-02',
  to: '2026-01-08T00:00:00Z',
};

const TASK_DUE_DATE = '2026-01-07';
const TIMEZONE = 'Europe/Kyiv';
const SYNTHETIC_PASSWORD = 'k6-baseline-password';
const RUN_ID = __ENV.RUN_ID || String(Date.now());

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const ENDPOINTS = {
  acceptLobbyInvite: (inviteId) => `/api/lobby-invites/${inviteId}/accept`,
  calendarConflicts: (lobbyId, requesterId) => queryPath('/api/calendar/conflicts', {
    end: EVENT_WINDOW.to,
    lobbyId,
    requesterId,
    start: EVENT_WINDOW.from,
  }),
  calendarEvents: (lobbyId) => queryPath('/api/calendar/events', {
    from: EVENT_WINDOW.from,
    lobbyId,
    to: EVENT_WINDOW.to,
  }),
  createCalendarEvent: '/api/calendar/events',
  createLobbyInvite: (lobbyId, userId) => `/api/lobbies/${lobbyId}/invites?userId=${userId}`,
  event: (eventId) => `/api/calendar/events/${eventId}`,
  lobbies: '/api/lobbies',
  lobby: (lobbyId) => `/api/lobbies/${lobbyId}`,
  myLobbies: '/api/lobbies/mine',
  readiness: '/actuator/health/readiness',
  task: (taskId) => `/api/tasks/${taskId}`,
  tasks: '/api/tasks',
  tasksByAssigneeAnyStatus: (lobbyId, assigneeId) => queryPath('/api/tasks', {
    assigneeId,
    lobbyId,
  }),
  tasksByAssignee: (lobbyId, assigneeId) => queryPath('/api/tasks', {
    assigneeId,
    lobbyId,
    status: STATUSES.inProgress,
  }),
  user: (userId) => `/api/users/${userId}`,
  userConflict: (userId, requesterId) => queryPath('/api/calendar/user-conflict', {
    end: EVENT_WINDOW.to,
    requesterId,
    start: EVENT_WINDOW.from,
    userId,
  }),
  users: '/api/users',
};

const MESSAGES = {
  acceptLobbyInvite: 'accept lobby invite succeeds',
  createEvent: 'create event succeeds',
  createLobby: 'create lobby succeeds',
  createLobbyInvite: 'create lobby invite succeeds',
  createTask: 'create task succeeds',
  createUser: 'create user succeeds',
  deleteEvent: 'delete seeded event succeeds',
  deleteLobby: 'delete seeded lobby succeeds',
  deleteTask: 'delete seeded task succeeds',
  findConflicts: 'find conflicts succeeds',
  findUserConflict: 'find user conflict succeeds',
  getLobby: 'get lobby succeeds',
  getUser: 'get user succeeds',
  listEvents: 'list events succeeds',
  listLobbies: 'list my lobbies succeeds',
  listTasks: 'list tasks succeeds',
  readiness: 'readiness is healthy',
  updateTask: 'update task succeeds',
  validateDuplicateUserConflict: 'duplicate user returns conflict',
  validateInvalidLobbyPayload: 'invalid lobby payload returns bad request',
  validateInvalidUserPayload: 'invalid user payload returns bad request',
  validateMissingUser: 'missing user returns not found',
};

const parseIntegerEnv = (name, fallback, minimum) => {
  const raw = __ENV[name] || fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }

  const parsed = Number.parseInt(raw, 10);
  if (parsed < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return parsed;
};

const parseFloatEnv = (name, fallback, minimum) => {
  const raw = __ENV[name] || fallback;
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`${name} must be a number >= ${minimum}`);
  }

  const parsed = Number.parseFloat(raw);
  if (parsed < minimum) {
    throw new Error(`${name} must be a number >= ${minimum}`);
  }
  return parsed;
};

const parseWorkload = (raw) => {
  if (!Object.values(WORKLOADS).includes(raw)) {
    throw new Error(`WORKLOAD must be one of: ${Object.values(WORKLOADS).join(', ')}`);
  }
  return raw;
};

const BASE_URL = (__ENV.BASE_URL || DEFAULTS.baseUrl).replace(/\/$/, '');
const WORKLOAD = parseWorkload(__ENV.WORKLOAD || DEFAULTS.workload);
const USER_COUNT = parseIntegerEnv('USER_COUNT', DEFAULTS.userCount, 2);
const BASELINE_VUS = parseIntegerEnv('VUS', DEFAULTS.baselineVus, 1);
const BASELINE_DURATION = __ENV.DURATION || DEFAULTS.baselineDuration;
const MISSING_USER_ID = -1;
const STRESS_MAX_VUS = parseIntegerEnv('STRESS_MAX_VUS', DEFAULTS.stressMaxVus, 2);
const STRESS_STAGE_DURATION = __ENV.STRESS_STAGE_DURATION || DEFAULTS.stressStageDuration;
const THINK_TIME_SECONDS = parseFloatEnv(
    'THINK_TIME_SECONDS',
    DEFAULTS.thinkTimeSeconds,
    0);
const SEED_TASK_COUNT = parseIntegerEnv('SEED_TASK_COUNT', DEFAULTS.seedTaskCount, 2);
const SEED_EVENT_COUNT = parseIntegerEnv('SEED_EVENT_COUNT', DEFAULTS.seedEventCount, 2);
const ALLOW_REMOTE_BASE_URL = __ENV.ALLOW_REMOTE_BASE_URL === 'true';

const workloadScenario = () => {
  if (WORKLOAD === WORKLOADS.smoke) {
    return {
      exec: 'baselineWorkflow',
      executor: 'shared-iterations',
      iterations: 1,
      maxDuration: '1m',
      vus: 1,
    };
  }
  if (WORKLOAD === WORKLOADS.readHeavy) {
    return {
      duration: BASELINE_DURATION,
      exec: 'readHeavyWorkflow',
      executor: 'constant-vus',
      vus: BASELINE_VUS,
    };
  }
  if (WORKLOAD === WORKLOADS.writeHeavy) {
    return {
      duration: BASELINE_DURATION,
      exec: 'writeHeavyWorkflow',
      executor: 'constant-vus',
      vus: BASELINE_VUS,
    };
  }
  if (WORKLOAD === WORKLOADS.mixed) {
    return {
      duration: BASELINE_DURATION,
      exec: 'mixedWorkflow',
      executor: 'constant-vus',
      vus: BASELINE_VUS,
    };
  }
  if (WORKLOAD === WORKLOADS.stress) {
    return {
      exec: 'baselineWorkflow',
      executor: 'ramping-vus',
      stages: [
        { duration: STRESS_STAGE_DURATION, target: Math.ceil(STRESS_MAX_VUS / 2) },
        { duration: STRESS_STAGE_DURATION, target: STRESS_MAX_VUS },
        { duration: STRESS_STAGE_DURATION, target: 0 },
      ],
    };
  }
  if (WORKLOAD === WORKLOADS.negativeSmoke) {
    return {
      exec: 'negativeValidationSmoke',
      executor: 'shared-iterations',
      iterations: 1,
      maxDuration: '1m',
      vus: 1,
    };
  }
  return {
    duration: BASELINE_DURATION,
    exec: 'baselineWorkflow',
    executor: 'constant-vus',
    vus: BASELINE_VUS,
  };
};

export const options = {
  scenarios: {
    lined_workflow: workloadScenario(),
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export const setup = () => {
  assertLocalBaseUrl();
  expectStatus(get(ENDPOINTS.readiness, 'actuator', 'readiness'), MESSAGES.readiness);

  const users = range(USER_COUNT).map(createUser);
  const [owner] = users;
  const lobby = createLobby(owner.id);

  users.slice(1).forEach((user) => inviteAndAcceptMember(lobby.id, owner.id, user.id));

  return {
    events: seedEvents(owner.id, lobby.id),
    lobby,
    runId: RUN_ID,
    tasks: seedTasks(owner.id, lobby.id, users),
    users,
  };
};

export const baselineWorkflow = (data) => {
  const user = data.users[exec.vu.idInTest % data.users.length];
  const assignee = data.users[(exec.vu.idInTest + 1) % data.users.length];
  const iterationLabel = `${data.runId}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;
  const task = data.tasks[exec.scenario.iterationInTest % data.tasks.length];

  group('users', () => {
    expectStatus(get(ENDPOINTS.user(user.id), 'users', 'get'), MESSAGES.getUser);
  });

  group('lobbies', () => {
    expectStatus(
        getForUser(ENDPOINTS.myLobbies, user.id, 'lobbies', 'mine'),
        MESSAGES.listLobbies);
    expectStatus(get(ENDPOINTS.lobby(data.lobby.id), 'lobbies', 'get'), MESSAGES.getLobby);
  });

  group('tasks', () => {
    expectStatus(
        patchJsonForUser(
            ENDPOINTS.task(task.id),
            { status: STATUSES.inProgress, title: `Updated ${iterationLabel}` },
            user.id,
            'tasks',
            'update'),
        MESSAGES.updateTask);
    expectStatus(
        get(ENDPOINTS.tasksByAssignee(data.lobby.id, assignee.id), 'tasks', 'list'),
        MESSAGES.listTasks);
  });

  group('calendar', () => {
    expectStatus(
        getForUser(ENDPOINTS.calendarEvents(data.lobby.id), user.id, 'calendar', 'list-events'),
        MESSAGES.listEvents);
    expectStatus(
        getForUser(
            ENDPOINTS.calendarConflicts(data.lobby.id, user.id),
            user.id,
            'calendar',
            'conflicts'),
        MESSAGES.findConflicts);
    expectStatus(
        getForUser(
            ENDPOINTS.userConflict(user.id, user.id),
            user.id,
            'calendar',
            'user-conflict'),
        MESSAGES.findUserConflict);
  });

  sleep(THINK_TIME_SECONDS);
};

export const readHeavyWorkflow = (data) => {
  const user = data.users[exec.vu.idInTest % data.users.length];
  const assignee = data.users[(exec.vu.idInTest + 1) % data.users.length];

  group('read-heavy users', () => {
    expectStatus(get(ENDPOINTS.user(user.id), 'users', 'get'), MESSAGES.getUser);
  });

  group('read-heavy lobbies', () => {
    expectStatus(
        getForUser(ENDPOINTS.myLobbies, user.id, 'lobbies', 'mine'),
        MESSAGES.listLobbies);
    expectStatus(get(ENDPOINTS.lobby(data.lobby.id), 'lobbies', 'get'), MESSAGES.getLobby);
  });

  group('read-heavy tasks', () => {
    expectStatus(
        get(ENDPOINTS.tasksByAssigneeAnyStatus(data.lobby.id, assignee.id), 'tasks', 'list'),
        MESSAGES.listTasks);
  });

  group('read-heavy calendar', () => {
    expectStatus(
        getForUser(ENDPOINTS.calendarEvents(data.lobby.id), user.id, 'calendar', 'list-events'),
        MESSAGES.listEvents);
    expectStatus(
        getForUser(
            ENDPOINTS.calendarConflicts(data.lobby.id, user.id),
            user.id,
            'calendar',
            'conflicts'),
        MESSAGES.findConflicts);
    expectStatus(
        getForUser(
            ENDPOINTS.userConflict(user.id, user.id),
            user.id,
            'calendar',
            'user-conflict'),
        MESSAGES.findUserConflict);
  });

  sleep(THINK_TIME_SECONDS);
};

export const writeHeavyWorkflow = (data) => {
  const user = data.users[exec.vu.idInTest % data.users.length];
  const assignee = data.users[(exec.vu.idInTest + 1) % data.users.length];
  const iterationLabel = `${data.runId}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;

  group('write-heavy tasks', () => {
    let task = null;
    try {
      task = createTask(user.id, data.lobby.id, assignee.id, `Write task ${iterationLabel}`);
      expectStatus(
          patchJsonForUser(
              ENDPOINTS.task(task.id),
              { status: STATUSES.inProgress, title: `Write updated ${iterationLabel}` },
              user.id,
              'tasks',
              'update'),
          MESSAGES.updateTask);
    } finally {
      deleteCreatedTask(task, user.id);
    }
  });

  group('write-heavy calendar', () => {
    let event = null;
    try {
      event = createEvent(user.id, data.lobby.id, `Write event ${iterationLabel}`, 0);
    } finally {
      deleteCreatedEvent(event, user.id);
    }
  });

  sleep(THINK_TIME_SECONDS);
};

export const mixedWorkflow = (data) => {
  const user = data.users[exec.vu.idInTest % data.users.length];
  const assignee = data.users[(exec.vu.idInTest + 1) % data.users.length];
  const task = data.tasks[exec.scenario.iterationInTest % data.tasks.length];
  const iterationLabel = `${data.runId}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;

  group('mixed reads', () => {
    expectStatus(get(ENDPOINTS.user(user.id), 'users', 'get'), MESSAGES.getUser);
    expectStatus(
        getForUser(ENDPOINTS.myLobbies, user.id, 'lobbies', 'mine'),
        MESSAGES.listLobbies);
    expectStatus(
        getForUser(ENDPOINTS.calendarEvents(data.lobby.id), user.id, 'calendar', 'list-events'),
        MESSAGES.listEvents);
  });

  group('mixed updates', () => {
    expectStatus(
        patchJsonForUser(
            ENDPOINTS.task(task.id),
            { status: STATUSES.inProgress, title: `Mixed updated ${iterationLabel}` },
            user.id,
            'tasks',
            'update'),
        MESSAGES.updateTask);
  });

  group('mixed writes', () => {
    const createdTask = createTask(
        user.id,
        data.lobby.id,
        assignee.id,
        `Mixed task ${iterationLabel}`);
    expectStatus(
        delForUser(ENDPOINTS.task(createdTask.id), user.id, 'tasks', 'delete'),
        MESSAGES.deleteTask);
  });

  sleep(THINK_TIME_SECONDS);
};

export const negativeValidationSmoke = (data) => {
  group('negative validation', () => {
    expectStatus(
        postJson(ENDPOINTS.users, {
          email: 'not-an-email',
          password: SYNTHETIC_PASSWORD,
          username: `bad_${data.runId}`,
        }, 'users', 'invalid-create', [400]),
        MESSAGES.validateInvalidUserPayload,
        [400]);
    expectStatus(
        postJson(ENDPOINTS.users, {
          email: data.users[0].email,
          password: SYNTHETIC_PASSWORD,
          username: data.users[0].username,
        }, 'users', 'duplicate-create', [409]),
        MESSAGES.validateDuplicateUserConflict,
        [409]);
    expectStatus(
        get(ENDPOINTS.user(MISSING_USER_ID), 'users', 'missing-get', [404]),
        MESSAGES.validateMissingUser,
        [404]);
    expectStatus(
        postJsonForUser(ENDPOINTS.lobbies, {
          name: `invalid lobby ${data.runId}`,
        }, data.users[0].id, 'lobbies', 'invalid-create', [400]),
        MESSAGES.validateInvalidLobbyPayload,
        [400]);
  });
};

export default baselineWorkflow;

export const teardown = (data) => {
  if (!data || !data.lobby || !data.users || data.users.length === 0) {
    return;
  }

  data.events.forEach((event) => {
    expectStatus(
        delForUser(ENDPOINTS.event(event.id), data.users[0].id, 'calendar', 'delete-event'),
        MESSAGES.deleteEvent);
  });
  data.tasks.forEach((task) => {
    expectStatus(
        delForUser(ENDPOINTS.task(task.id), data.users[0].id, 'tasks', 'delete'),
        MESSAGES.deleteTask);
  });
  expectStatus(
      delForUser(ENDPOINTS.lobby(data.lobby.id), data.users[0].id, 'lobbies', 'delete'),
      MESSAGES.deleteLobby);
  console.warn(
      `Seeded tasks, events, and lobby ${data.lobby.id} were deleted. `
      + `Synthetic users with username prefix `
      + `k6_${data.runId}_ remain because the backend exposes no user delete endpoint; `
      + 'reset the local experiment database when retained users are no longer needed.');
};

const assertLocalBaseUrl = () => {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(BASE_URL);
  if (!isLocal && !ALLOW_REMOTE_BASE_URL) {
    exec.test.abort(
        'BASE_URL must point to localhost, 127.0.0.1, or [::1]. '
        + 'Set ALLOW_REMOTE_BASE_URL=true only for an intentional local Docker or remote target.');
  }
};

const createUser = (index) => {
  const payload = {
    email: `k6_${RUN_ID}_${index}@example.test`,
    password: SYNTHETIC_PASSWORD,
    username: `k6_${RUN_ID}_${index}`.slice(0, 64),
  };
  const res = postJson(ENDPOINTS.users, payload, 'users', 'create');
  expectStatus(res, MESSAGES.createUser);
  return responseJson(res, 'create user');
};

const createLobby = (ownerId) => {
  const payload = {
    lobbyType: LOBBY_TYPES.friends,
    name: `k6 baseline ${RUN_ID}`.slice(0, 64),
  };
  const res = postJsonForUser(ENDPOINTS.lobbies, payload, ownerId, 'lobbies', 'create');
  expectStatus(res, MESSAGES.createLobby);
  return responseJson(res, 'create lobby');
};

const inviteAndAcceptMember = (lobbyId, ownerId, memberId) => {
  const inviteRes = postForUser(
      ENDPOINTS.createLobbyInvite(lobbyId, memberId),
      null,
      ownerId,
      'lobby-invites',
      'create');
  expectStatus(inviteRes, MESSAGES.createLobbyInvite);
  const invite = responseJson(inviteRes, 'create lobby invite');
  const acceptRes = postForUser(
      ENDPOINTS.acceptLobbyInvite(invite.id),
      null,
      memberId,
      'lobby-invites',
      'accept');
  expectStatus(acceptRes, MESSAGES.acceptLobbyInvite);
};

const seedTasks = (ownerId, lobbyId, users) => range(SEED_TASK_COUNT).map((index) => {
  const assignee = users[(index + 1) % users.length];
  return createTask(ownerId, lobbyId, assignee.id, `Seed task ${RUN_ID}-${index}`);
});

const createTask = (currentUserId, lobbyId, assigneeId, title) => {
  const payload = {
    assigneeId,
    dueDate: TASK_DUE_DATE,
    lobbyId,
    title,
  };
  const res = postJsonForUser(ENDPOINTS.tasks, payload, currentUserId, 'tasks', 'create');
  expectStatus(res, MESSAGES.createTask);
  return responseJson(res, 'create task');
};

const seedEvents = (ownerId, lobbyId) => range(SEED_EVENT_COUNT)
    .map((index) => createEvent(ownerId, lobbyId, `Seed event ${RUN_ID}-${index}`, index));

const createEvent = (currentUserId, lobbyId, title, offsetHours) => {
  const startHour = 9 + (offsetHours % 8);
  const endHour = startHour + 1;
  const payload = {
    endAt: eventTime(endHour),
    lobbyId,
    shared: true,
    startAt: eventTime(startHour),
    timezone: TIMEZONE,
    title,
  };
  const res = postJsonForUser(
      ENDPOINTS.createCalendarEvent,
      payload,
      currentUserId,
      'calendar',
      'create-event');
  expectStatus(res, MESSAGES.createEvent);
  return responseJson(res, 'create event');
};

const deleteCreatedTask = (task, userId) => {
  if (!task) {
    return;
  }
  expectStatus(
      delForUser(ENDPOINTS.task(task.id), userId, 'tasks', 'delete'),
      MESSAGES.deleteTask);
};

const deleteCreatedEvent = (event, userId) => {
  if (!event) {
    return;
  }
  expectStatus(
      delForUser(ENDPOINTS.event(event.id), userId, 'calendar', 'delete-event'),
      MESSAGES.deleteEvent);
};

const get = (path, domain, endpoint, expectedStatuses = [200]) => http.get(
    url(path),
    requestParams(domain, endpoint, null, expectedStatuses));

const getForUser = (path, userId, domain, endpoint, expectedStatuses = [200]) => http.get(
    url(path),
    requestParams(domain, endpoint, userId, expectedStatuses));

const postForUser = (path, body, userId, domain, endpoint, expectedStatuses = [200]) => http.post(
    url(path),
    body,
    requestParams(domain, endpoint, userId, expectedStatuses));

const postJson = (path, payload, domain, endpoint, expectedStatuses = [200]) => http.post(
    url(path),
    JSON.stringify(payload),
    requestParams(domain, endpoint, null, expectedStatuses));

const postJsonForUser = (
    path,
    payload,
    userId,
    domain,
    endpoint,
    expectedStatuses = [200]) => http.post(
    url(path),
    JSON.stringify(payload),
    requestParams(domain, endpoint, userId, expectedStatuses));

const patchJsonForUser = (path, payload, userId, domain, endpoint) => http.patch(
    url(path),
    JSON.stringify(payload),
    requestParams(domain, endpoint, userId));

const delForUser = (path, userId, domain, endpoint) => http.del(
    url(path),
    null,
    requestParams(domain, endpoint, userId));

const requestParams = (domain, endpoint, userId = null, expectedStatuses = [200]) => ({
  headers: userId === null ? JSON_HEADERS : {
    ...JSON_HEADERS,
    'X-User-Id': String(userId),
  },
  responseCallback: http.expectedStatuses(...expectedStatuses),
  tags: {
    domain,
    endpoint,
    workload: WORKLOAD,
  },
});

const responseJson = (res, label) => {
  if (!res.body) {
    exec.test.abort(`${label} response body was empty`);
  }
  return res.json();
};

const expectStatus = (res, label, acceptedStatuses = [200]) => {
  const ok = check(res, {
    [label]: (response) => acceptedStatuses.includes(response.status),
  });
  if (!ok) {
    exec.test.abort(`${label}: expected ${acceptedStatuses.join(', ')}, got ${res.status}`);
  }
};

const eventTime = (hour) => `${EVENT_WINDOW.seedDate}T${String(hour).padStart(2, '0')}:00:00Z`;

const queryPath = (path, params) => {
  const query = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  return `${path}?${query}`;
};

const range = (count) => Array.from({ length: count }, (_, index) => index);

const url = (path) => `${BASE_URL}${path}`;
