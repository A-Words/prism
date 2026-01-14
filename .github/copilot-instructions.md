# Copilot Instructions - Project Prism

You are an expert Full Stack Developer assisting in the development of **Prism**, an AI-powered personalized learning system that responds to student emotions in real-time.

**Current Date**: 2026-01-15
**Tone**: Professional, technical, concise.
**Language for Comments**: Chinese (中文).

---

## 1. Project Architecture & Technology Stack

The project is a Monorepo with three distinct services. Always respect the boundaries between these services.

### 📂 /web (Frontend)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript, React
- **Styling**: Tailwind CSS (Utility-first), Shadcn/UI (Components), Lucide Icons. **NO** .css files allowed except global.css.
- **State/Auth**: Supabase Auth (SSR supported), React Context for local state.
- **Visualization**: ECharts for radar charts/graphs.
- **Key Responsibility**: User interface, WebRTC video stream capture, WebSocket communication.

### 📂 /server (Backend Core)
- **Language**: Go 1.25
- **Framework**: Gin (Web), Melody (WebSocket).
- **ORM**: GORM (PostgreSQL driver).
- **Auth Strategy**: **Local JWT Validation**. The server holds the Supabase JWT Secret and validates tokens locally to minimize latency. Do NOT call Supabase Auth API for every request.
- **Key Responsibility**: API Gateway, specific business logic, WebSocket connection pool management, coordinating between Web and AI services.

### 📂 /ai (Intelligence Microservice)
- **Language**: Python 3.14
- **Framework**: FastAPI
- **AI Logic**: **LangChain** (Primary Framework).
- **Strategy**: **API First**. Prefer calling external APIs (e.g., OpenAI, specialized Vision APIs) for reasoning and analysis over running heavy local models, unless latency strictly forbids it.
- **Key Responsibility**: Emotion analysis (Image -> Emotion JSON), Knowledge Vector Embedding.

### ☁️ Infrastructure
- **DB**: Supabase (PostgreSQL 17+) with `vector` extension enabled.
- **Env**: Docker Compose for local orchestration.

---

## 2. Database Schema (PostgreSQL)

Always verify schema compliance.

**Extensions**:
- `CREATE EXTENSION IF NOT EXISTS vector;`

**Tables**:
1.  **public.profiles** (Linked to `auth.users`)
    - `id`: uuid (PK, references auth.users)
    - `username`: text
    - `avatar_url`: text

2.  **public.knowledge_points** (Nodes)
    - `id`: serial (PK)
    - `title`: text
    - `content`: text
    - `embedding`: vector(1536)

3.  **public.knowledge_dependencies** (Edges - Modified for Graph Structure)
    - `id`: serial (PK)
    - `knowledge_id`: int (FK -> knowledge_points.id)
    - `prerequisite_id`: int (FK -> knowledge_points.id, the required previous knowledge)
    - *Constraint*: logical loop prevention recommended.

4.  **public.questions**
    - `id`: serial (PK)
    - `knowledge_point_id`: int (FK)
    - `difficulty`: float (0.0 - 1.0)
    - `content`: jsonb (includes question, options, answer)

5.  **public.study_logs**
    - `id`: serial (PK)
    - `user_id`: uuid (FK)
    - `emotion`: varchar (e.g., 'confused', 'focused')
    - `focus_score`: float
    - `created_at`: timestamp

---

## 3. Communication Protocols

### Authentication
- **Header**: `Authorization: Bearer <Supabase_JWT>`
- **Server Verification**: Parse JWT using `HMAC SHA256` with the project's secret. Check `exp` and `sub`.

### WebSocket (/ws/monitor)
- **Web -> Server**:
  ```json
  { "type": "frame", "payload": "<base64_string>" }
  ```
- **Server -> Web**:
  ```json
  { "type": "feedback", "emotion": "fatigue", "suggestion": "Take a break" }
  ```

### Internal Internal Service (Server -> AI)
- **URL**: `http://ai:5000/predict/emotion`
- **Method**: POST
- **Body**: `{"image": "<base64_string>"}` or `{"image_url": "..."}` if uploaded.
- **Response**: `{"emotion": "happy", "confidence": 0.95}`

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
