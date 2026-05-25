import exec from 'k6/execution';
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const WORKLOAD = parseWorkload(__ENV.WORKLOAD || 'baseline');
const RUN_ID = __ENV.RUN_ID || String(Date.now());
const USER_COUNT = parseIntegerEnv('USER_COUNT', '4', 2);
const BASELINE_VUS = parseIntegerEnv('VUS', '5', 1);
const BASELINE_DURATION = __ENV.DURATION || '2m';
const THINK_TIME_SECONDS = parseFloatEnv('THINK_TIME_SECONDS', '1', 0);
const SEED_TASK_COUNT = parseIntegerEnv('SEED_TASK_COUNT', '12', 2);
const SEED_EVENT_COUNT = parseIntegerEnv('SEED_EVENT_COUNT', '8', 2);
const ALLOW_REMOTE_BASE_URL = __ENV.ALLOW_REMOTE_BASE_URL === 'true';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export const options = {
  scenarios: {
    lined_workflow: WORKLOAD === 'smoke' ? {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
    } : {
      executor: 'constant-vus',
      vus: BASELINE_VUS,
      duration: BASELINE_DURATION,
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

export function setup() {
  assertLocalBaseUrl();
  expectStatus(
      http.get(`${BASE_URL}/actuator/health/readiness`, tags('actuator', 'readiness')),
      'readiness is healthy',
      [200]);

  const users = [];
  for (let i = 0; i < USER_COUNT; i++) {
    users.push(createUser(i));
  }

  const owner = users[0];
  const lobby = createLobby(owner.id);
  for (const user of users.slice(1)) {
    addMember(lobby.id, owner.id, user.id);
  }

  const tasks = seedTasks(owner.id, lobby.id, users);
  const events = seedEvents(owner.id, lobby.id);

  return {
    events,
    lobby,
    runId: RUN_ID,
    tasks,
    users,
  };
}

export default function (data) {
  const user = data.users[exec.vu.idInTest % data.users.length];
  const assignee = data.users[(exec.vu.idInTest + 1) % data.users.length];
  const iterationLabel = `${data.runId}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;
  const task = data.tasks[exec.scenario.iterationInTest % data.tasks.length];

  group('users', () => {
    expectStatus(
        http.get(`${BASE_URL}/api/users/${user.id}`, tags('users', 'get')),
        'get user succeeds',
        [200]);
  });

  group('lobbies', () => {
    expectStatus(
        http.get(`${BASE_URL}/api/lobbies/mine`, withUser(user.id, tags('lobbies', 'mine'))),
        'list my lobbies succeeds',
        [200]);
    expectStatus(
        http.get(`${BASE_URL}/api/lobbies/${data.lobby.id}`, tags('lobbies', 'get')),
        'get lobby succeeds',
        [200]);
  });

  group('tasks', () => {
    expectStatus(
        http.patch(
            `${BASE_URL}/api/tasks/${task.id}`,
            JSON.stringify({ status: 'IN_PROGRESS', title: `Updated ${iterationLabel}` }),
            withUser(user.id, tags('tasks', 'update'))),
        'update task succeeds',
        [200]);
    expectStatus(
        http.get(`${BASE_URL}/api/tasks?lobbyId=${data.lobby.id}&assigneeId=${assignee.id}`
            + '&status=IN_PROGRESS',
            tags('tasks', 'list')),
        'list tasks succeeds',
        [200]);
  });

  group('calendar', () => {
    const windowStart = encodeURIComponent('2026-01-01T00:00:00Z');
    const windowEnd = encodeURIComponent('2026-01-08T00:00:00Z');
    expectStatus(
        http.get(
            `${BASE_URL}/api/calendar/events?lobbyId=${data.lobby.id}&from=${windowStart}&to=${windowEnd}`,
            withUser(user.id, tags('calendar', 'list-events'))),
        'list events succeeds',
        [200]);
    expectStatus(
        http.get(
            `${BASE_URL}/api/calendar/conflicts?lobbyId=${data.lobby.id}&start=${windowStart}`
            + `&end=${windowEnd}&requesterId=${user.id}`,
            tags('calendar', 'conflicts')),
        'find conflicts succeeds',
        [200]);
    expectStatus(
        http.get(
            `${BASE_URL}/api/calendar/user-conflict?userId=${user.id}&start=${windowStart}`
            + `&end=${windowEnd}&requesterId=${user.id}`,
            tags('calendar', 'user-conflict')),
        'find user conflict succeeds',
        [200]);
  });

  sleep(THINK_TIME_SECONDS);
}

export function teardown(data) {
  if (!data || !data.lobby || !data.users || data.users.length === 0) {
    return;
  }
  expectStatus(
      http.del(
          `${BASE_URL}/api/lobbies/${data.lobby.id}`,
          null,
          withUser(data.users[0].id, tags('lobbies', 'delete'))),
      'delete seeded lobby succeeds',
      [200]);
  console.warn(
      `Seeded lobby ${data.lobby.id} was deleted. Synthetic users with username prefix `
      + `k6_${data.runId}_ remain because the backend exposes no user delete endpoint; `
      + 'reset the local experiment database when retained users are no longer needed.');
}

function assertLocalBaseUrl() {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(BASE_URL);
  if (!isLocal && !ALLOW_REMOTE_BASE_URL) {
    exec.test.abort(
        'BASE_URL must point to localhost, 127.0.0.1, or [::1]. '
        + 'Set ALLOW_REMOTE_BASE_URL=true only for an intentional local Docker or remote target.');
  }
}

function createUser(index) {
  const payload = {
    email: `k6_${RUN_ID}_${index}@example.test`,
    password: 'k6-baseline-password',
    username: `k6_${RUN_ID}_${index}`.slice(0, 64),
  };
  const res = http.post(`${BASE_URL}/api/users`, JSON.stringify(payload), tags('users', 'create'));
  expectStatus(res, 'create user succeeds', [200]);
  return responseJson(res, 'create user');
}

function createLobby(ownerId) {
  const payload = {
    lobbyType: 'FRIENDS',
    name: `k6 baseline ${RUN_ID}`.slice(0, 64),
  };
  const res = http.post(
      `${BASE_URL}/api/lobbies`,
      JSON.stringify(payload),
      withUser(ownerId, tags('lobbies', 'create')));
  expectStatus(res, 'create lobby succeeds', [200]);
  return responseJson(res, 'create lobby');
}

function addMember(lobbyId, ownerId, memberId) {
  const res = http.post(
      `${BASE_URL}/api/lobbies/${lobbyId}/members?userId=${memberId}`,
      null,
      withUser(ownerId, tags('lobbies', 'add-member')));
  expectStatus(res, 'add lobby member succeeds', [200]);
}

function seedTasks(ownerId, lobbyId, users) {
  const tasks = [];
  for (let i = 0; i < SEED_TASK_COUNT; i++) {
    const assignee = users[(i + 1) % users.length];
    const task = createTask(ownerId, lobbyId, assignee.id, `Seed task ${RUN_ID}-${i}`);
    tasks.push(task);
  }
  return tasks;
}

function createTask(currentUserId, lobbyId, assigneeId, title) {
  const payload = {
    assigneeId,
    dueDate: '2026-01-07',
    lobbyId,
    title,
  };
  const res = http.post(
      `${BASE_URL}/api/tasks`,
      JSON.stringify(payload),
      withUser(currentUserId, tags('tasks', 'create')));
  expectStatus(res, 'create task succeeds', [200]);
  return responseJson(res, 'create task');
}

function seedEvents(ownerId, lobbyId) {
  const events = [];
  for (let i = 0; i < SEED_EVENT_COUNT; i++) {
    events.push(createEvent(ownerId, lobbyId, `Seed event ${RUN_ID}-${i}`, i));
  }
  return events;
}

function createEvent(currentUserId, lobbyId, title, offsetHours) {
  const startHour = 9 + (offsetHours % 8);
  const endHour = startHour + 1;
  const payload = {
    endAt: `2026-01-02T${String(endHour).padStart(2, '0')}:00:00Z`,
    lobbyId,
    shared: true,
    startAt: `2026-01-02T${String(startHour).padStart(2, '0')}:00:00Z`,
    timezone: 'Europe/Kyiv',
    title,
  };
  const res = http.post(
      `${BASE_URL}/api/calendar/events`,
      JSON.stringify(payload),
      withUser(currentUserId, tags('calendar', 'create-event')));
  expectStatus(res, 'create event succeeds', [200]);
  return responseJson(res, 'create event');
}

function responseJson(res, label) {
  if (!res.body) {
    exec.test.abort(`${label} response body was empty`);
  }
  return res.json();
}

function expectStatus(res, label, acceptedStatuses) {
  const ok = check(res, {
    [label]: (response) => acceptedStatuses.includes(response.status),
  });
  if (!ok) {
    exec.test.abort(`${label}: expected ${acceptedStatuses.join(', ')}, got ${res.status}`);
  }
}

function tags(domain, endpoint) {
  return {
    headers: JSON_HEADERS,
    tags: {
      domain,
      endpoint,
      workload: WORKLOAD,
    },
  };
}

function withUser(userId, params) {
  return {
    ...params,
    headers: {
      ...params.headers,
      'X-User-Id': String(userId),
    },
  };
}

function parseIntegerEnv(name, fallback, minimum) {
  const raw = __ENV[name] || fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  const parsed = Number.parseInt(raw, 10);
  if (parsed < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function parseFloatEnv(name, fallback, minimum) {
  const raw = __ENV[name] || fallback;
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`${name} must be a number >= ${minimum}`);
  }
  const parsed = Number.parseFloat(raw);
  if (parsed < minimum) {
    throw new Error(`${name} must be a number >= ${minimum}`);
  }
  return parsed;
}

function parseWorkload(raw) {
  if (raw !== 'smoke' && raw !== 'baseline') {
    throw new Error('WORKLOAD must be either smoke or baseline');
  }
  return raw;
}
