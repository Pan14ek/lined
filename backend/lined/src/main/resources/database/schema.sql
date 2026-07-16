CREATE TABLE IF NOT EXISTS users
(
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(64)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles
(
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles
(
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS plans
(
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(50)    NOT NULL UNIQUE, -- FREE, PRO, FAMILY
    price_usd     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duration_days INT            NOT NULL DEFAULT 30,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CHECK (price_usd >= 0),
    CHECK (duration_days >= 0)                    -- 0 for FREE, otherwise 30
);

CREATE TABLE IF NOT EXISTS user_subscriptions
(
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_id    BIGINT      NOT NULL REFERENCES plans (id),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date   TIMESTAMPTZ,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_nocase ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_nocase ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_name_nocase ON roles (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_name_nocase ON plans (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_user_sub_user_active ON user_subscriptions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sub_dates ON user_subscriptions (user_id, start_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_sub
    ON user_subscriptions (user_id)
    WHERE is_active;

INSERT INTO roles (name)
SELECT 'ROLE_USER'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE LOWER(name) = LOWER('ROLE_USER')
);

INSERT INTO roles (name)
SELECT 'ROLE_ADMIN'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE LOWER(name) = LOWER('ROLE_ADMIN')
);

INSERT INTO plans (name, price_usd, duration_days, created_at)
SELECT seed.name, seed.price_usd, seed.duration_days, NOW()
FROM (
    VALUES ('FREE', 0.00, 0),
           ('PRO', 9.99, 30),
           ('FAMILY', 19.99, 30)
) AS seed(name, price_usd, duration_days)
WHERE NOT EXISTS (
    SELECT 1 FROM plans existing WHERE LOWER(existing.name) = LOWER(seed.name)
);

CREATE TABLE IF NOT EXISTS lobbies
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(64) NOT NULL,
    lobby_type VARCHAR(16) NOT NULL CHECK (lobby_type IN ('COUPLE', 'FAMILY', 'FRIENDS', 'WORK')),
    owner_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lobby_members
(
    lobby_id BIGINT NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (lobby_id, user_id)
);

CREATE TABLE IF NOT EXISTS lobby_invites
(
    id         BIGSERIAL PRIMARY KEY,
    lobby_id   BIGINT      NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    inviter_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invitee_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status     VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobby_invites_lobby_pending
    ON lobby_invites (lobby_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_invites_invitee_pending
    ON lobby_invites (invitee_id, status, sent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lobby_pending_invite
    ON lobby_invites (lobby_id, invitee_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS tasks
(
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(160) NOT NULL,
    description VARCHAR(1000),
    priority    VARCHAR(16)  NOT NULL DEFAULT 'MEDIUM',
    status      VARCHAR(16)  NOT NULL,
    lobby_id    BIGINT       NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    creator_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assignee_id BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    due_date    DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM';

CREATE INDEX IF NOT EXISTS idx_tasks_lobby ON tasks (lobby_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

CREATE TABLE IF NOT EXISTS events
(
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(160) NOT NULL,
    location   VARCHAR(255),
    shared     BOOLEAN      NOT NULL,
    start_at   TIMESTAMPTZ  NOT NULL,
    end_at     TIMESTAMPTZ  NOT NULL,
    timezone   VARCHAR(64)  NOT NULL,
    lobby_id   BIGINT       NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    owner_id   BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_lobby ON events (lobby_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events (lobby_id, start_at, end_at);

CREATE TABLE IF NOT EXISTS user_notification_preferences
(
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT  NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    shared_events_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    task_assigned_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    free_slots_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_digests_enabled   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS lobby_notification_preferences
(
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lobby_id             BIGINT  NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    new_events_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    task_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    free_slots_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (user_id, lobby_id)
);

CREATE TABLE IF NOT EXISTS notifications
(
    id           BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lobby_id     BIGINT       REFERENCES lobbies (id) ON DELETE CASCADE,
    type         VARCHAR(32)  NOT NULL,
    title        VARCHAR(160) NOT NULL,
    message      VARCHAR(500) NOT NULL,
    task_id      BIGINT,
    event_id     BIGINT,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries
(
    id              BIGSERIAL PRIMARY KEY,
    notification_id BIGINT      NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    channel         VARCHAR(16) NOT NULL,
    status          VARCHAR(16) NOT NULL,
    queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications (recipient_id, created_at DESC);
