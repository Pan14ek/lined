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
VALUES ('ROLE_USER')
ON CONFLICT (LOWER(name)) DO NOTHING;

INSERT INTO roles (name)
VALUES ('ROLE_ADMIN')
ON CONFLICT (LOWER(name)) DO NOTHING;


INSERT INTO plans (name, price_usd, duration_days)
VALUES ('FREE', 0.00, 0),
       ('PRO', 9.99, 30),
       ('FAMILY', 19.99, 30)
ON CONFLICT (LOWER(name)) DO NOTHING;

CREATE TABLE IF NOT EXISTS lobbies
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(64) NOT NULL,
    lobby_type VARCHAR(16) NOT NULL CHECK (lobby_type IN ('COUPLE', 'FAMILY', 'FRIENDS', 'WORK')),
    owner_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE lobby_members
(
    lobby_id BIGINT NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (lobby_id, user_id)
);

CREATE TABLE tasks
(
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(160) NOT NULL,
    status      VARCHAR(16)  NOT NULL,
    lobby_id    BIGINT       NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    creator_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assignee_id BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    due_date    DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_lobby ON tasks (lobby_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX idx_tasks_status ON tasks (status);

