-- Stage 1: free-text minister name, no user account required.
-- Coexists with ministry_assignments (user-based). Display precedence:
-- active assignment user > minister_name > none.
ALTER TABLE ministries ADD COLUMN minister_name TEXT;

COMMENT ON COLUMN ministries.minister_name IS
  'Free-text minister name (stage 1, no user account). Superseded by an active ministry_assignments row.';
