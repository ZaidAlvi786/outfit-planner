-- Split the Kids category into Boys and Girls, and clear the old mismatched seed data.
-- The hair_styles table re-seeds itself per category on first request after this runs.

-- 1. Remove existing rows (old names/images did not match; fresh catalog replaces them).
DELETE FROM hair_styles;

-- 2. Replace the gender CHECK constraint: Men/Women/Kids -> Men/Women/Boys/Girls.
ALTER TABLE hair_styles DROP CONSTRAINT IF EXISTS hair_styles_gender_check;
ALTER TABLE hair_styles
  ADD CONSTRAINT hair_styles_gender_check
  CHECK (gender IN ('Men', 'Women', 'Boys', 'Girls'));
