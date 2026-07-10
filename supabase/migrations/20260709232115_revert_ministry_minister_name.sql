-- Revert stage-1 free-text minister name. Ministers must have a real
-- account via ministry_assignments before being associated with a ministry.
ALTER TABLE ministries DROP COLUMN IF EXISTS minister_name;
