# Copilot Instructions - Project Prism

You are an expert Full Stack Developer assisting in the development of **Prism**, an AI-powered adaptive learning ecosystem that provides comprehensive learning support including path planning, intelligent tutoring, note-taking, and health management.

**Current Date**: 2026-01-15
**Tone**: Professional, technical, concise.
**Language for Comments**: Chinese (中文).

---

## 0. Core Functional Modules

Always keep these modules in mind when developing features:

| Module | Core Responsibilities | Key Technologies |
|--------|----------------------|------------------|
| **1. Learning Path Planning** | Knowledge tracing, path optimization, ability assessment, homework grading | LangChain, pgvector, Vision API (OCR) |
| **2. Emotion Intervention** | Expression/voice/behavior analysis, attention monitoring, intervention strategies | Vision API, Whisper API, WebSocket |
| **3. Virtual Tutor** | Multi-turn dialogue, knowledge graph Q&A, empathetic responses | LangChain RAG, pgvector |
| **4. Smart Notes** | Speech transcription, OCR, knowledge structuring, semantic search | Whisper API, Vision API, pgvector |
| **5. Health Management** | Focus tracking, fatigue detection, posture analysis, break suggestions | Vision API (Pose), WebSocket |
| **6. Cross-Scene Adaptation** | Scene recognition, scene-specific strategies, data sync | Frontend state machine, Context API |

---

## 1. Project Architecture & Technology Stack

The project is a Monorepo with three distinct services. Always respect the boundaries between these services.

### 📂 /web (Frontend)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript, React
- **Styling**: Tailwind CSS (Utility-first), Shadcn/UI (Components), Lucide Icons. **NO** .css files allowed except global.css.
- **State/Auth**: Supabase Auth (SSR supported), React Context for local state.
- **Visualization**: ECharts for radar charts/graphs.
- **Media Capture**: WebRTC for video/audio stream capture.
- **Key Responsibility**: User interface, WebRTC video stream capture, WebSocket communication, scene state management.

### 📂 /server (Backend Core)
- **Language**: Go 1.25
- **Framework**: Gin (Web), Melody (WebSocket).
- **ORM**: GORM (PostgreSQL driver).
- **Auth Strategy**: **Local JWT Validation**. The server holds the Supabase JWT Secret and validates tokens locally to minimize latency. Do NOT call Supabase Auth API for every request.
- **Key Responsibility**: API Gateway, business logic orchestration, WebSocket connection pool management, chat session management, coordinating between Web and AI services.

### 📂 /ai (Intelligence Microservice)
- **Language**: Python 3.14
- **Framework**: FastAPI
- **AI Logic**: **LangChain** (Primary Framework for RAG, Chains, Agents).
- **Strategy**: **API First + Provider Agnostic**. 
  - Use **OpenRouter** as the default API gateway (supports OpenAI, Anthropic, Google, etc.)
  - Design all AI calls to be **provider-switchable** via environment variables
  - No local model inference; all reasoning via external APIs
- **Key Responsibility**: 
  - Emotion analysis (multimodal: image + audio)
  - Virtual assistant (RAG-based Q&A with memory)
  - Speech-to-text transcription
  - OCR and pose estimation
  - Knowledge vector embedding and semantic search

### ☁️ Infrastructure
- **DB**: Supabase (PostgreSQL 17+) with `vector` extension enabled.
- **AI Gateway**: OpenRouter (default) or direct provider APIs (OpenAI, Anthropic, etc.)
- **Env**: Docker Compose for local orchestration.

### 🔑 Environment Variables (AI Provider Config)
```bash
# Provider selection: "openrouter" | "openai" | "anthropic"
AI_PROVIDER=openrouter

# OpenRouter (recommended - access to multiple models)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_DEFAULT_MODEL=anthropic/claude-sonnet-4  # or openai/gpt-4o, google/gemini-pro, etc.

# Direct OpenAI (fallback)
OPENAI_API_KEY=sk-...

# Model assignments (can override per-task)
MODEL_CHAT=anthropic/claude-sonnet-4
MODEL_VISION=openai/gpt-4o
MODEL_EMBEDDING=openai/text-embedding-3-small

# Whisper (speech-to-text, OpenAI only for now)
WHISPER_PROVIDER=openai
```

---

## 2. Database Schema (PostgreSQL)

Always verify schema compliance.

**Extensions**:
- `CREATE EXTENSION IF NOT EXISTS vector;`

**Tables**:

### User & Profile
1.  **public.profiles** (Linked to `auth.users`)
    - `id`: uuid (PK, references auth.users)
    - `username`: text
    - `avatar_url`: text
    - `current_scene`: varchar (e.g., 'classroom', 'self-study', 'exam-prep')

### Knowledge Graph
2.  **public.knowledge_points** (Nodes)
    - `id`: serial (PK)
    - `subject`: varchar (e.g., 'math', 'physics')
    - `title`: text
    - `content`: text
    - `embedding`: vector(1536)

3.  **public.knowledge_dependencies** (Edges)
    - `id`: serial (PK)
    - `knowledge_id`: int (FK -> knowledge_points.id)
    - `prerequisite_id`: int (FK -> knowledge_points.id)
    - *Constraint*: logical loop prevention recommended.

4.  **public.knowledge_mastery** (User's mastery per knowledge point)
    - `id`: serial (PK)
    - `user_id`: uuid (FK -> profiles.id)
    - `knowledge_id`: int (FK -> knowledge_points.id)
    - `mastery_level`: float (0.0 - 1.0)
    - `last_practiced_at`: timestamp
    - *Unique*: (user_id, knowledge_id)

### Learning & Questions
5.  **public.questions**
    - `id`: serial (PK)
    - `knowledge_point_id`: int (FK)
    - `difficulty`: float (0.0 - 1.0)
    - `content`: jsonb (includes question, options, answer, explanation)

6.  **public.learning_paths** (User's planned path)
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `knowledge_sequence`: int[] (ordered list of knowledge_point ids)
    - `current_index`: int
    - `created_at`: timestamp
    - `updated_at`: timestamp

7.  **public.assignments** (Homework submissions)
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `question_id`: int (FK)
    - `answer_content`: text (user's answer, could be OCR result)
    - `is_correct`: boolean
    - `ai_feedback`: text
    - `submitted_at`: timestamp

### Emotion & Health Monitoring
8.  **public.study_logs** (Per-session logs)
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `scene`: varchar ('classroom', 'self-study', 'exam-prep')
    - `emotion`: varchar (e.g., 'confused', 'focused', 'anxious')
    - `focus_score`: float (0.0 - 1.0)
    - `fatigue_level`: float (0.0 - 1.0)
    - `posture_status`: varchar ('good', 'slouching', 'too_close')
    - `created_at`: timestamp

9.  **public.health_alerts** (Health warnings)
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `alert_type`: varchar ('fatigue', 'posture', 'break_needed', 'stress')
    - `message`: text
    - `acknowledged`: boolean default false
    - `created_at`: timestamp

### Virtual Assistant
10. **public.chat_sessions**
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `title`: text (auto-generated or user-set)
    - `created_at`: timestamp
    - `updated_at`: timestamp

11. **public.chat_messages**
    - `id`: serial (PK)
    - `session_id`: int (FK -> chat_sessions.id)
    - `role`: varchar ('user', 'assistant')
    - `content`: text
    - `related_knowledge_ids`: int[] (optional, for knowledge linking)
    - `created_at`: timestamp

### Notes System
12. **public.notes**
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `title`: text
    - `content`: text (markdown or structured)
    - `source_type`: varchar ('manual', 'voice', 'ocr', 'auto-generated')
    - `embedding`: vector(1536)
    - `created_at`: timestamp
    - `updated_at`: timestamp

13. **public.note_knowledge_links** (Notes <-> Knowledge association)
    - `id`: serial (PK)
    - `note_id`: int (FK -> notes.id)
    - `knowledge_id`: int (FK -> knowledge_points.id)
    - `relevance_score`: float

---

## 3. Communication Protocols

### Authentication
- **Header**: `Authorization: Bearer <Supabase_JWT>`
- **Server Verification**: Parse JWT using `HMAC SHA256` with the project's secret. Check `exp` and `sub`.

### WebSocket Channels

#### /ws/monitor (Real-time Learning Monitor)
- **Web -> Server** (video frame):
  ```json
  { "type": "frame", "payload": "<base64_image>" }
  ```
- **Web -> Server** (audio chunk for emotion):
  ```json
  { "type": "audio_chunk", "payload": "<base64_audio>" }
  ```
- **Server -> Web** (feedback):
  ```json
  { "type": "feedback", "emotion": "fatigue", "focus_score": 0.4, "posture": "slouching", "suggestion": "建议休息5分钟" }
  ```
  *Note: `suggestion` field contains Chinese text for end-user display.*

#### /ws/assistant (Virtual Assistant Chat)
- **Web -> Server**:
  ```json
  { "type": "message", "session_id": 123, "content": "What is Newton's second law?" }
  ```
- **Server -> Web** (streaming response):
  ```json
  { "type": "stream", "session_id": 123, "chunk": "Newton's second law states..." }
  { "type": "stream_end", "session_id": 123, "related_knowledge": [5, 12] }
  ```

### Internal Service APIs (Server -> AI)

#### Emotion Analysis
- **POST** `http://ai:5000/analyze/emotion`
- **Body**: `{"image": "<base64>", "audio": "<base64_optional>"}`
- **Response**: `{"emotion": "confused", "confidence": 0.87, "focus_score": 0.6}`

#### Pose Estimation
- **POST** `http://ai:5000/analyze/pose`
- **Body**: `{"image": "<base64>"}`
- **Response**: `{"posture": "slouching", "suggestions": ["Adjust screen height"]}`

#### Virtual Assistant (RAG)
- **POST** `http://ai:5000/chat/completions`
- **Body**: 
  ```json
  {
    "session_id": 123,
    "message": "What is photosynthesis?",
    "history": [...],
    "user_context": {"mastery": {...}, "current_scene": "self-study"}
  }
  ```
- **Response** (SSE stream): chunks of text + final metadata

#### Speech to Text
- **POST** `http://ai:5000/speech/transcribe`
- **Body**: `{"audio": "<base64>", "format": "webm"}`
- **Response**: `{"text": "Transcribed text content", "confidence": 0.95}`

#### OCR / Image Understanding
- **POST** `http://ai:5000/vision/ocr`
- **Body**: `{"image": "<base64>", "task": "handwriting" | "document" | "formula"}`
- **Response**: `{"text": "Recognized content", "structured": {...}}`

#### Knowledge Embedding
- **POST** `http://ai:5000/embed`
- **Body**: `{"text": "Text to be embedded"}`
- **Response**: `{"embedding": [0.1, 0.2, ...]}`

#### Semantic Search
- **POST** `http://ai:5000/search`
- **Body**: `{"query": "Search query", "top_k": 5, "filter": {"subject": "math"}}`
- **Response**: `{"results": [{"id": 1, "title": "...", "score": 0.92}, ...]}`

---

## 4. Coding Rules & Best Practices

### Global
- **Comments**: All complex logic explanation must be in **Chinese**.
  - Example: `// 检查用户是否在过去 5 分钟内有过疲劳记录`
- **Formatting**: Adhere to standard linting for each language (gofmt, pysrf, prettier).

### Frontend (Next.js)
- **Components**: Keep components under 200 lines. Use Composition.
- **Data Fetching**: Use Server Actions for mutations where possible, or SWR/TanStack Query for client-side fetching.
- **Supabase**: Use specific client for Server Components vs Client Components.

### Backend (Golang)
- **Error Handling**: Explicit is better than implicit.
  ```go
  if err != nil {
      // 记录错误日志并返回
      log.Printf("Failed to process logic: %v", err)
      c.JSON(500, gin.H{"error": "internal server error"})
      return
  }
  ```
- **Concurrency**: Use Goroutines for forwarding AI requests to avoid blocking the WebSocket read loop.

### AI (Python)
- **LangChain**: Use LangChain schemas (Runnable, Charts) to structure the pipeline.
- **Type Hints**: Mandatory for all FastAPI endpoints.
  ```python
  def analyze_emotion(input: ImageInput) -> EmotionResult:
      ...
  ```

---

## 5. Development Workflow
1.  **Migration**: Manage DB migrations via Supabase CLI or Go migration scripts.
2.  **Testing**: Unit tests for core logic (Go: `testing` package, Py: `pytest`).
