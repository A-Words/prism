CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject varchar(64) NOT NULL,
    goal_knowledge_ids int[] NOT NULL,
    target_date date NOT NULL,
    question_ids int[] NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'ongoing',
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.question_attempts (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id int REFERENCES public.questions(id) ON DELETE SET NULL,
    knowledge_id int NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
    source varchar(24) NOT NULL,
    answer text NOT NULL,
    is_correct boolean NOT NULL,
    duration_sec int NOT NULL,
    answered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homework_uploads (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject varchar(64) NOT NULL,
    storage_path text NOT NULL,
    storage_public_url text NOT NULL,
    ocr_text text,
    ocr_structured jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.path_adjustment_events (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    path_id int NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    event_type varchar(32) NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_path_states (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    path_id int NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    correct_streak int NOT NULL DEFAULT 0,
    wrong_streak int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, path_id)
);

ALTER TABLE public.assignments
    ADD COLUMN IF NOT EXISTS upload_id int REFERENCES public.homework_uploads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS knowledge_ids int[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS confidence double precision,
    ADD COLUMN IF NOT EXISTS grading_source varchar(32) DEFAULT 'ai';

CREATE INDEX IF NOT EXISTS idx_question_attempts_user_answered_at
    ON public.question_attempts(user_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user_knowledge
    ON public.knowledge_mastery(user_id, knowledge_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_points_subject
    ON public.knowledge_points(subject);

CREATE INDEX IF NOT EXISTS idx_questions_knowledge_difficulty
    ON public.questions(knowledge_point_id, difficulty);
