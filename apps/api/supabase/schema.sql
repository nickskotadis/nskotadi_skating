-- ============================================================
-- SkateTrack – Skating School Management System
-- Full schema (drop & recreate for fresh deployment)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------
-- Drop old tables / types from community-classes template
-- ----------------------------------------------------------
DROP TABLE IF EXISTS public.class_registrations CASCADE;
DROP TABLE IF EXISTS public.community_classes CASCADE;
DROP TABLE IF EXISTS public.makeup_requests CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.class_dates CASCADE;
DROP TABLE IF EXISTS public.session_instructors CASCADE;
DROP TABLE IF EXISTS public.skating_sessions CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.skating_levels CASCADE;
DROP TABLE IF EXISTS public.rink_locations CASCADE;
DROP TABLE IF EXISTS public.parent_student_links CASCADE;
DROP TABLE IF EXISTS public.skill_assessments CASCADE;
DROP TABLE IF EXISTS public.feedback_cards CASCADE;
DROP TABLE IF EXISTS public.instructor_ratings CASCADE;
DROP TABLE IF EXISTS public.ice_show_practices CASCADE;
DROP TABLE IF EXISTS public.ice_show_group_sessions CASCADE;
DROP TABLE IF EXISTS public.ice_show_groups CASCADE;
DROP TABLE IF EXISTS public.ice_shows CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.day_of_week CASCADE;
DROP TYPE IF EXISTS public.skill_status CASCADE;
DROP TYPE IF EXISTS public.attendance_status CASCADE;
DROP TYPE IF EXISTS public.makeup_status CASCADE;
DROP TYPE IF EXISTS public.rating_status CASCADE;
DROP TYPE IF EXISTS public.sticker_type CASCADE;

-- ----------------------------------------------------------
-- Enums
-- ----------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'instructor', 'parent', 'student');

CREATE TYPE public.day_of_week AS ENUM (
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
);

CREATE TYPE public.skill_status AS ENUM (
  'not_started','in_progress','passed','not_applicable'
);

CREATE TYPE public.attendance_status AS ENUM ('present','absent','makeup');

CREATE TYPE public.makeup_status AS ENUM (
  'pending','scheduled','completed','waived'
);

CREATE TYPE public.rating_status AS ENUM ('pending','approved','rejected');

CREATE TYPE public.sticker_type AS ENUM (
  'star','heart','trophy','snowflake','crown','rainbow','lightning'
);

-- ----------------------------------------------------------
-- Users
-- ----------------------------------------------------------
CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           public.user_role NOT NULL DEFAULT 'parent',
  first_name     text,
  last_name      text,
  phone          text,
  calendar_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- Parent ↔ Student links
-- ----------------------------------------------------------
CREATE TABLE public.parent_student_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- ----------------------------------------------------------
-- Rink zones
-- ----------------------------------------------------------
CREATE TABLE public.rink_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  svg_path    text,
  color_hex   text NOT NULL DEFAULT '#93c5fd',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- Skating levels & skills catalog
-- ----------------------------------------------------------
CREATE TABLE public.skating_levels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  sort_order  integer NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id    uuid NOT NULL REFERENCES public.skating_levels(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level_id, name)
);

-- ----------------------------------------------------------
-- Sessions (recurring class slots)
-- ----------------------------------------------------------
CREATE TABLE public.skating_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  level_id     uuid NOT NULL REFERENCES public.skating_levels(id),
  location_id  uuid REFERENCES public.rink_locations(id),
  day_of_week  public.day_of_week NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  season_start date NOT NULL,
  season_end   date NOT NULL,
  capacity     integer NOT NULL CHECK (capacity > 0),
  created_by   uuid NOT NULL REFERENCES public.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session_instructors (
  session_id    uuid NOT NULL REFERENCES public.skating_sessions(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_primary    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (session_id, instructor_id)
);

-- Individual class meetings (auto-generated from session schedule)
CREATE TABLE public.class_dates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.skating_sessions(id) ON DELETE CASCADE,
  class_date   date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  is_cancelled boolean NOT NULL DEFAULT false,
  cancel_note  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, class_date)
);

-- ----------------------------------------------------------
-- Enrollment
-- ----------------------------------------------------------
CREATE TABLE public.enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.skating_sessions(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  dropped_at  timestamptz,
  UNIQUE (session_id, student_id)
);

-- ----------------------------------------------------------
-- Attendance
-- ----------------------------------------------------------
CREATE TABLE public.attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_date_id   uuid NOT NULL REFERENCES public.class_dates(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          public.attendance_status NOT NULL DEFAULT 'present',
  marked_by       uuid REFERENCES public.users(id),
  marked_at       timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_date_id, student_id)
);

CREATE TABLE public.makeup_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id     uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  missed_date_id    uuid NOT NULL REFERENCES public.class_dates(id),
  status            public.makeup_status NOT NULL DEFAULT 'pending',
  makeup_date_id    uuid REFERENCES public.class_dates(id),
  makeup_session_id uuid REFERENCES public.skating_sessions(id),
  requested_by      uuid NOT NULL REFERENCES public.users(id),
  resolved_by       uuid REFERENCES public.users(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- Skill assessments & feedback cards
-- ----------------------------------------------------------
CREATE TABLE public.skill_assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  skill_id      uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  status        public.skill_status NOT NULL DEFAULT 'not_started',
  assessed_by   uuid REFERENCES public.users(id),
  assessed_at   timestamptz,
  class_date_id uuid REFERENCES public.class_dates(id),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, skill_id)
);

CREATE TABLE public.feedback_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  personal_note text,
  sticker       public.sticker_type,
  published_at  timestamptz,
  created_by    uuid NOT NULL REFERENCES public.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- Instructor ratings
-- ----------------------------------------------------------
CREATE TABLE public.instructor_ratings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES public.skating_sessions(id) ON DELETE CASCADE,
  parent_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating        integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       text,
  status        public.rating_status NOT NULL DEFAULT 'pending',
  moderated_by  uuid REFERENCES public.users(id),
  moderated_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, parent_id, instructor_id)
);

-- ----------------------------------------------------------
-- Ice shows
-- ----------------------------------------------------------
CREATE TABLE public.ice_shows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  show_date  date NOT NULL,
  venue      text,
  notes      text,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ice_show_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id    uuid NOT NULL REFERENCES public.ice_shows(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ice_show_group_sessions (
  group_id   uuid NOT NULL REFERENCES public.ice_show_groups(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.skating_sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, session_id)
);

CREATE TABLE public.ice_show_practices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES public.ice_show_groups(id) ON DELETE CASCADE,
  practice_date date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  location_id   uuid REFERENCES public.rink_locations(id),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------
CREATE INDEX ON public.enrollments (session_id, dropped_at);
CREATE INDEX ON public.enrollments (student_id);
CREATE INDEX ON public.attendance (class_date_id);
CREATE INDEX ON public.attendance (student_id);
CREATE INDEX ON public.skill_assessments (enrollment_id);
CREATE INDEX ON public.class_dates (session_id, class_date);
CREATE INDEX ON public.makeup_requests (enrollment_id, status);
CREATE INDEX ON public.instructor_ratings (instructor_id, status);
CREATE INDEX ON public.ice_show_practices (group_id);
CREATE INDEX ON public.parent_student_links (parent_id);
CREATE INDEX ON public.parent_student_links (student_id);

-- ----------------------------------------------------------
-- Row Level Security
-- (Service-role client bypasses RLS; these are defense-in-depth)
-- ----------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skating_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rink_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skating_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_show_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_show_group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_show_practices ENABLE ROW LEVEL SECURITY;

-- Users: read own row; insert own row
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Levels/skills/locations/sessions: authenticated can read
CREATE POLICY "auth_read_levels" ON public.skating_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_skills" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_locations" ON public.rink_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_sessions" ON public.skating_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_class_dates" ON public.class_dates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_session_instructors" ON public.session_instructors FOR SELECT TO authenticated USING (true);

-- Enrollments: student reads own; parent reads children's
CREATE POLICY "student_read_own_enrollment"
  ON public.enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Makeup requests: authenticated can read
CREATE POLICY "auth_read_makeup_requests" ON public.makeup_requests FOR SELECT TO authenticated USING (true);

-- Ice show: authenticated can read
CREATE POLICY "auth_read_ice_shows" ON public.ice_shows FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_ice_show_groups" ON public.ice_show_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_ice_show_group_sessions" ON public.ice_show_group_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_ice_show_practices" ON public.ice_show_practices FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------
-- Seed data: Skating levels and skills (US Figure Skating Basic Skills)
-- ----------------------------------------------------------
DO $$
DECLARE
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  l5 uuid; l6 uuid; l7 uuid; l8 uuid;
BEGIN
  INSERT INTO public.skating_levels (name, sort_order, description) VALUES
    ('Basic 1', 1, 'Introduction to skating: balance, gliding, and falling safely'),
    ('Basic 2', 2, 'One-foot skills and backward movement'),
    ('Basic 3', 3, 'Swizzles and beginning edges'),
    ('Basic 4', 4, 'Forward crossovers and stopping'),
    ('Basic 5', 5, 'Backward crossovers and stroking'),
    ('Basic 6', 6, 'Outside edges and three-turns'),
    ('Basic 7', 7, 'Introductory jumps and spins'),
    ('Basic 8', 8, 'Single jumps and scratch spin');

  SELECT id INTO l1 FROM public.skating_levels WHERE name = 'Basic 1';
  SELECT id INTO l2 FROM public.skating_levels WHERE name = 'Basic 2';
  SELECT id INTO l3 FROM public.skating_levels WHERE name = 'Basic 3';
  SELECT id INTO l4 FROM public.skating_levels WHERE name = 'Basic 4';
  SELECT id INTO l5 FROM public.skating_levels WHERE name = 'Basic 5';
  SELECT id INTO l6 FROM public.skating_levels WHERE name = 'Basic 6';
  SELECT id INTO l7 FROM public.skating_levels WHERE name = 'Basic 7';
  SELECT id INTO l8 FROM public.skating_levels WHERE name = 'Basic 8';

  -- Basic 1 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l1, 'March in place on ice', 1),
    (l1, 'Forward two-foot glide', 2),
    (l1, 'Dip (two-foot knee bend)', 3),
    (l1, 'Forward two-foot swizzles (2–6 consecutive)', 4),
    (l1, 'Snowplow stop (one or two feet)', 5),
    (l1, 'Falling and getting up safely', 6);

  -- Basic 2 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l2, 'Forward one-foot glide (right foot)', 1),
    (l2, 'Forward one-foot glide (left foot)', 2),
    (l2, 'Backward two-foot swizzles (2–6 consecutive)', 3),
    (l2, 'Backward two-foot glide', 4),
    (l2, 'Moving snowplow stop', 5);

  -- Basic 3 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l3, 'Forward stroking (right and left)', 1),
    (l3, 'Forward outside edge on a circle', 2),
    (l3, 'Forward inside edge on a circle', 3),
    (l3, 'Backward one-foot glide', 4),
    (l3, 'Two-foot turn in place (front to back)', 5);

  -- Basic 4 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l4, 'Forward crossovers (clockwise)', 1),
    (l4, 'Forward crossovers (counterclockwise)', 2),
    (l4, 'Hockey stop (both feet)', 3),
    (l4, 'Backward outside edge on a circle', 4),
    (l4, 'Beginning two-foot spin (3 revolutions)', 5);

  -- Basic 5 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l5, 'Advanced forward stroking', 1),
    (l5, 'Backward crossovers (clockwise)', 2),
    (l5, 'Backward crossovers (counterclockwise)', 3),
    (l5, 'T-stop', 4),
    (l5, 'Beginning one-foot spin (3 revolutions)', 5);

  -- Basic 6 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l6, 'Forward outside three-turn (right)', 1),
    (l6, 'Forward outside three-turn (left)', 2),
    (l6, 'Backward outside edge (right)', 3),
    (l6, 'Backward outside edge (left)', 4),
    (l6, 'Bunny hop', 5),
    (l6, 'One-foot spin (3+ revolutions)', 6);

  -- Basic 7 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l7, 'Waltz jump', 1),
    (l7, 'Ballet jump', 2),
    (l7, 'Forward inside mohawk', 3),
    (l7, 'Lunge', 4),
    (l7, 'One-foot spin with entry (3+ revolutions)', 5);

  -- Basic 8 skills
  INSERT INTO public.skills (level_id, name, sort_order) VALUES
    (l8, 'Toe loop jump', 1),
    (l8, 'Salchow jump', 2),
    (l8, 'Scratch spin (6+ revolutions)', 3),
    (l8, 'Back outside edge', 4),
    (l8, 'Forward inside three-turn', 5);

END $$;
