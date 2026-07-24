CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(64) NOT NULL
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL
);

CREATE TABLE lobbies (
    id BIGINT PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE lobby_members (
    lobby_id BIGINT NOT NULL REFERENCES lobbies (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE lobby_invites (
    id BIGINT PRIMARY KEY,
    inviter_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invitee_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id BIGINT PRIMARY KEY,
    creator_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assignee_id BIGINT REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE events (
    id BIGINT PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE user_notification_preferences (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE lobby_notification_preferences (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id BIGINT PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE notification_deliveries (
    id BIGINT PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE
);
