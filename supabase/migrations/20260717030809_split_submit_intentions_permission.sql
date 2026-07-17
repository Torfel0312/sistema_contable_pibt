-- Split SUBMIT_INTENTIONS into CREATE_REQUEST and CREATE_SETTLEMENT.
-- SUBMIT_INTENTIONS gated both "create a fund request" and "create/submit a
-- ministry settlement" behind a single toggle. Ministers need both, but the
-- permissions matrix should let ADMIN control them independently.
--
-- Rename existing SUBMIT_INTENTIONS rows to CREATE_REQUEST, then mirror each
-- one as CREATE_SETTLEMENT so current grants (ADMIN, MINISTER) keep working
-- exactly as before until an ADMIN chooses to differentiate them.

UPDATE role_permissions
SET permission = 'CREATE_REQUEST'
WHERE permission = 'SUBMIT_INTENTIONS';

INSERT INTO role_permissions (role, permission, enabled)
SELECT role, 'CREATE_SETTLEMENT', enabled
FROM role_permissions
WHERE permission = 'CREATE_REQUEST';
