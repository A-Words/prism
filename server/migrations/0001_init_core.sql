CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text,
    avatar_url text,
    current_scene varchar(32)
);

CREATE TABLE IF NOT EXISTS public.knowledge_points (
    id serial PRIMARY KEY,
    subject varchar(64) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    embedding vector(1536)
);

CREATE TABLE IF NOT EXISTS public.knowledge_dependencies (
    id serial PRIMARY KEY,
    knowledge_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    prerequisite_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    UNIQUE (knowledge_id, prerequisite_id)
);

CREATE TABLE IF NOT EXISTS public.knowledge_mastery (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    knowledge_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    mastery_level double precision NOT NULL DEFAULT 0,
    last_practiced_at timestamptz,
    UNIQUE (user_id, knowledge_id)
);

CREATE TABLE IF NOT EXISTS public.questions (
    id serial PRIMARY KEY,
    knowledge_point_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    difficulty double precision NOT NULL,
    content jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.learning_paths (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    knowledge_sequence int[] NOT NULL DEFAULT '{}',
    current_index int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id int REFERENCES public.questions(id) ON DELETE SET NULL,
    answer_content text NOT NULL,
    is_correct boolean,
    ai_feedback text,
    submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_logs (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scene varchar(32),
    emotion varchar(32),
    focus_score double precision,
    fatigue_level double precision,
    posture_status varchar(32),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.health_alerts (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    alert_type varchar(32) NOT NULL,
    message text NOT NULL,
    acknowledged boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id serial PRIMARY KEY,
    session_id int NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role varchar(16) NOT NULL,
    content text NOT NULL,
    related_knowledge_ids int[],
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    source_type varchar(32) NOT NULL,
    embedding vector(1536),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_knowledge_links (
    id serial PRIMARY KEY,
    note_id int NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    knowledge_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    relevance_score double precision NOT NULL DEFAULT 0,
    UNIQUE (note_id, knowledge_id)
);
