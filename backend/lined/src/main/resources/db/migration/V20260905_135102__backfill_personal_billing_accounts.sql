-- Ensure every existing user has the personal billing account expected by the current billing model.

INSERT INTO billing_accounts (owner_user_id, type, status, created_at, updated_at)
SELECT users.id, 'PERSONAL', 'ACTIVE', NOW(), NOW()
FROM users
WHERE NOT EXISTS (
    SELECT 1
    FROM billing_accounts accounts
    WHERE accounts.owner_user_id = users.id
      AND accounts.type = 'PERSONAL'
);
