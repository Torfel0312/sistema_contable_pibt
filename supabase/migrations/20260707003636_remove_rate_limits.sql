-- Remove rate limiting infrastructure (unused; feature dropped).
DROP FUNCTION IF EXISTS check_and_increment_rate_limit(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS prune_rate_limits();
DROP TABLE IF EXISTS rate_limits;
