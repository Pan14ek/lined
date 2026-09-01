CREATE TABLE IF NOT EXISTS users
(
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(64)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    version    BIGINT       NOT NULL DEFAULT 0,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_nocase ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_nocase ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_name_nocase ON roles (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
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

CREATE TABLE IF NOT EXISTS lobbies
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(64) NOT NULL,
    lobby_type VARCHAR(16) NOT NULL CHECK (lobby_type IN ('COUPLE', 'FAMILY', 'FRIENDS', 'WORK')),
    owner_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE
    ,version   BIGINT      NOT NULL DEFAULT 0
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
    ,version    BIGINT       NOT NULL DEFAULT 0
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR(1000);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'SHARED';
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_visibility;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_visibility CHECK (visibility IN ('PRIVATE', 'SHARED'));

CREATE INDEX IF NOT EXISTS idx_tasks_lobby ON tasks (lobby_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_lobby_visibility_creator
    ON tasks (lobby_id, visibility, creator_id);

CREATE TABLE IF NOT EXISTS events
(
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(160) NOT NULL,
    location   VARCHAR(255),
    shared     BOOLEAN      NOT NULL,
    start_at   TIMESTAMPTZ  NOT NULL,
    end_at     TIMESTAMPTZ  NOT NULL,
    timezone   VARCHAR(64)  NOT NULL,
    ics_uid    VARCHAR(255),
    lobby_id   BIGINT       NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    owner_id   BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    ,version   BIGINT       NOT NULL DEFAULT 0
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS ics_uid VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility VARCHAR(16);
UPDATE events SET visibility = CASE WHEN shared THEN 'SHARED' ELSE 'PRIVATE' END
    WHERE visibility IS NULL;
ALTER TABLE events ALTER COLUMN visibility SET DEFAULT 'SHARED';
ALTER TABLE events ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_visibility;
ALTER TABLE events ADD CONSTRAINT chk_events_visibility
    CHECK (visibility IN ('PRIVATE', 'SHARED'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_reminder_sent_for_date DATE;

CREATE INDEX IF NOT EXISTS idx_events_lobby ON events (lobby_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events (lobby_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_events_lobby_visibility_owner_time
    ON events (lobby_id, visibility, owner_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_events_ics_uid ON events (ics_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_owner_lobby_ics_uid
    ON events (owner_id, lobby_id, ics_uid);

CREATE TABLE IF NOT EXISTS calendar_feed_tokens
(
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64)  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_feed_tokens_user_active
    ON calendar_feed_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS user_notification_preferences
(
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT  NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    shared_events_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    task_assigned_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    free_slots_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_digests_enabled   BOOLEAN NOT NULL DEFAULT TRUE
    ,version                BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lobby_notification_preferences
(
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lobby_id             BIGINT  NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    new_events_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    task_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    free_slots_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    version              BIGINT  NOT NULL DEFAULT 0,
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
    business_key VARCHAR(255),
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS business_key VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_business_key
    ON notifications (business_key) WHERE business_key IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS idempotency_requests
(
    id              BIGSERIAL PRIMARY KEY,
    requester_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    operation       VARCHAR(32)  NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    payload_hash    VARCHAR(64)  NOT NULL,
    resource_id     BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, operation, idempotency_key)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS access_mode VARCHAR(16) NOT NULL DEFAULT 'READ_WRITE';
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS restriction_reason VARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS archive_at TIMESTAMPTZ NULL;
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS selected_as_free_at TIMESTAMPTZ NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE user_notification_preferences ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE lobby_notification_preferences ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS password_reset_tokens
(
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_tokens_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS billing_accounts
(
    id            BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type          VARCHAR(16) NOT NULL,
    status        VARCHAR(16) NOT NULL,
    version       BIGINT      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_billing_accounts_owner_type UNIQUE (owner_user_id, type)
);

INSERT INTO billing_accounts (owner_user_id, type, status, created_at, updated_at)
SELECT users.id, 'PERSONAL', 'ACTIVE', NOW(), NOW()
FROM users
WHERE NOT EXISTS (
    SELECT 1
    FROM billing_accounts accounts
    WHERE accounts.owner_user_id = users.id
      AND accounts.type = 'PERSONAL'
);

DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS plans;

CREATE TABLE IF NOT EXISTS billing_plans
(
    code         VARCHAR(16) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_prices
(
    code              VARCHAR(32)  PRIMARY KEY,
    plan_code         VARCHAR(16)  NOT NULL REFERENCES billing_plans (code),
    billing_interval  VARCHAR(8)   NOT NULL CHECK (billing_interval IN ('MONTH', 'YEAR')),
    provider          VARCHAR(32)  NOT NULL,
    provider_price_id VARCHAR(128) NOT NULL,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO billing_plans (code, display_name, active, created_at, updated_at)
VALUES ('FREE', 'Free', TRUE, NOW(), NOW()),
       ('PRO', 'Pro', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO billing_prices (
    code, plan_code, billing_interval, provider, provider_price_id, active, created_at, updated_at)
VALUES ('PRO_MONTHLY', 'PRO', 'MONTH', 'sandbox', 'sandbox-pro-monthly', TRUE, NOW(), NOW()),
       ('PRO_YEARLY', 'PRO', 'YEAR', 'sandbox', 'sandbox-pro-yearly', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS billing_provider_customers
(
    id                   BIGSERIAL PRIMARY KEY,
    billing_account_id   BIGINT       NOT NULL REFERENCES billing_accounts (id) ON DELETE CASCADE,
    provider             VARCHAR(32)  NOT NULL,
    provider_customer_id VARCHAR(128) NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_billing_provider_customers_account_provider
        UNIQUE (billing_account_id, provider),
    CONSTRAINT uq_billing_provider_customers_provider_customer
        UNIQUE (provider_customer_id)
);

CREATE TABLE IF NOT EXISTS billing_subscriptions
(
    id                       BIGSERIAL PRIMARY KEY,
    billing_account_id       BIGINT       NOT NULL REFERENCES billing_accounts (id) ON DELETE CASCADE,
    provider                 VARCHAR(32)  NOT NULL,
    provider_subscription_id VARCHAR(128) NOT NULL,
    plan_code                VARCHAR(16)  NOT NULL REFERENCES billing_plans (code),
    current_price_code       VARCHAR(32)  NOT NULL REFERENCES billing_prices (code),
    status                   VARCHAR(16)  NOT NULL,
    current_period_start     TIMESTAMPTZ  NOT NULL,
    current_period_end       TIMESTAMPTZ  NOT NULL,
    cancel_at_period_end     BOOLEAN      NOT NULL DEFAULT FALSE,
    scheduled_price_code     VARCHAR(32)  REFERENCES billing_prices (code),
    scheduled_change_at      TIMESTAMPTZ,
    past_due_since           TIMESTAMPTZ,
    grace_ends_at            TIMESTAMPTZ,
    provider_updated_at      TIMESTAMPTZ  NOT NULL,
    last_synced_at           TIMESTAMPTZ,
    version                  BIGINT       NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_billing_subscriptions_provider_subscription
        UNIQUE (provider_subscription_id),
    CONSTRAINT chk_billing_subscriptions_status
        CHECK (status IN ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED')),
    CONSTRAINT chk_billing_subscriptions_period
        CHECK (current_period_end >= current_period_start),
    CONSTRAINT chk_billing_subscriptions_scheduled_change
        CHECK ((scheduled_price_code IS NULL AND scheduled_change_at IS NULL)
            OR (scheduled_price_code IS NOT NULL AND scheduled_change_at IS NOT NULL)),
    CONSTRAINT chk_billing_subscriptions_past_due_grace
        CHECK (status = 'PAST_DUE' OR (past_due_since IS NULL AND grace_ends_at IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_subscriptions_active
    ON billing_subscriptions (billing_account_id)
    WHERE status IN ('PENDING', 'ACTIVE', 'PAST_DUE');

CREATE TABLE IF NOT EXISTS feature_flags
(
    id          BIGSERIAL PRIMARY KEY,
    version     BIGINT       NOT NULL DEFAULT 0,
    flag_key    VARCHAR(64)  NOT NULL,
    environment VARCHAR(16)  NOT NULL CHECK (environment IN ('LOCAL', 'TEST', 'STAGING', 'PRODUCTION')),
    enabled     BOOLEAN      NOT NULL,
    description VARCHAR(255) NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by  VARCHAR(255) NOT NULL DEFAULT 'system',
    CONSTRAINT uq_feature_flags_key_environment UNIQUE (flag_key, environment)
);

INSERT INTO feature_flags (version, flag_key, environment, enabled, description, updated_at, updated_by)
VALUES (0, 'dashboard.feature.enabled', 'LOCAL', TRUE, 'Authenticated dashboard content', NOW(), 'system'),
       (0, 'lobbies.feature.enabled', 'LOCAL', TRUE, 'Lobby management and membership', NOW(), 'system'),
       (0, 'calendars.feature.enabled', 'LOCAL', TRUE, 'Calendar and availability flows', NOW(), 'system'),
       (0, 'tasks.feature.enabled', 'LOCAL', TRUE, 'Task management flows', NOW(), 'system'),
       (0, 'notifications.feature.enabled', 'LOCAL', TRUE, 'Notification inbox and preferences', NOW(), 'system'),
       (0, 'settings.feature.enabled', 'LOCAL', TRUE, 'User settings and account management', NOW(), 'system'),
       (0, 'subscriptions.feature.enabled', 'LOCAL', TRUE, 'Subscription and plan flows', NOW(), 'system'),
       (0, 'dashboard.feature.enabled', 'TEST', TRUE, 'Authenticated dashboard content', NOW(), 'system'),
       (0, 'lobbies.feature.enabled', 'TEST', TRUE, 'Lobby management and membership', NOW(), 'system'),
       (0, 'calendars.feature.enabled', 'TEST', TRUE, 'Calendar and availability flows', NOW(), 'system'),
       (0, 'tasks.feature.enabled', 'TEST', TRUE, 'Task management flows', NOW(), 'system'),
       (0, 'notifications.feature.enabled', 'TEST', TRUE, 'Notification inbox and preferences', NOW(), 'system'),
       (0, 'settings.feature.enabled', 'TEST', TRUE, 'User settings and account management', NOW(), 'system'),
       (0, 'subscriptions.feature.enabled', 'TEST', TRUE, 'Subscription and plan flows', NOW(), 'system'),
       (0, 'dashboard.feature.enabled', 'STAGING', TRUE, 'Authenticated dashboard content', NOW(), 'system'),
       (0, 'lobbies.feature.enabled', 'STAGING', TRUE, 'Lobby management and membership', NOW(), 'system'),
       (0, 'calendars.feature.enabled', 'STAGING', TRUE, 'Calendar and availability flows', NOW(), 'system'),
       (0, 'tasks.feature.enabled', 'STAGING', TRUE, 'Task management flows', NOW(), 'system'),
       (0, 'notifications.feature.enabled', 'STAGING', TRUE, 'Notification inbox and preferences', NOW(), 'system'),
       (0, 'settings.feature.enabled', 'STAGING', TRUE, 'User settings and account management', NOW(), 'system'),
       (0, 'subscriptions.feature.enabled', 'STAGING', TRUE, 'Subscription and plan flows', NOW(), 'system'),
       (0, 'dashboard.feature.enabled', 'PRODUCTION', TRUE, 'Authenticated dashboard content', NOW(), 'system'),
       (0, 'lobbies.feature.enabled', 'PRODUCTION', TRUE, 'Lobby management and membership', NOW(), 'system'),
       (0, 'calendars.feature.enabled', 'PRODUCTION', TRUE, 'Calendar and availability flows', NOW(), 'system'),
       (0, 'tasks.feature.enabled', 'PRODUCTION', TRUE, 'Task management flows', NOW(), 'system'),
       (0, 'notifications.feature.enabled', 'PRODUCTION', TRUE, 'Notification inbox and preferences', NOW(), 'system'),
       (0, 'settings.feature.enabled', 'PRODUCTION', TRUE, 'User settings and account management', NOW(), 'system'),
       (0, 'subscriptions.feature.enabled', 'PRODUCTION', TRUE, 'Subscription and plan flows', NOW(), 'system')
ON CONFLICT (flag_key, environment) DO NOTHING;
