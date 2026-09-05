-- Seed immutable/reference rows required by the application.
-- Inserts are intentionally insert-only so operator-edited mutable state is preserved.

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

INSERT INTO billing_plans (code, display_name, active, created_at, updated_at)
VALUES ('FREE', 'Free', TRUE, NOW(), NOW()),
       ('PRO', 'Pro', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO billing_prices (
    code, plan_code, billing_interval, provider, provider_price_id, active, created_at, updated_at)
VALUES ('PRO_MONTHLY', 'PRO', 'MONTH', 'sandbox', 'sandbox-pro-monthly', TRUE, NOW(), NOW()),
       ('PRO_YEARLY', 'PRO', 'YEAR', 'sandbox', 'sandbox-pro-yearly', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO feature_flags (
    version, flag_key, environment, enabled, description, updated_at, updated_by)
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
