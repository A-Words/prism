# Prism - AI 驱动的全场景智适应学习生态系统

![Project Status](https://img.shields.io/badge/Status-Development-blue) ![Go Version](https://img.shields.io/badge/Go-1.25-cyan) ![Python Version](https://img.shields.io/badge/Python-3.14-yellow) ![Next.js](https://img.shields.io/badge/Next.js-16-black)

**Prism** 是一个基于分布式微服务架构的智能化个性化学习生态系统。通过深度融合 AI 技术与教育场景，为用户提供从学习路径规划、知识辅导、笔记整理到身心健康管理的全方位、自适应学习支持，实现真正的"因材施教"。

## 🌟 六大核心功能模块

### 1. 🗺️ 智能个性化学习路径规划
- **知识追踪与状态建模**: 精准评估学生的知识掌握程度，建立个人能力画像
- **动态路径优化**: 根据学习表现实时调整学习路径与题目难度
- **智能批改与能力评估**: 支持作业自动批改、手写公式识别 (OCR)

### 2. 🎭 情绪智能干预系统
- **多模态情绪识别**: 分析面部表情、语音语调、操作行为，实时判断学习情绪
- **状态监测**: 追踪注意力、认知负荷与疲劳度
- **智能干预**: 自动生成干预策略（调整难度、鼓励互动、建议休息）

### 3. 🤖 智能虚拟助教
- **24小时智能问答**: 自然语言理解，支持多轮对话式答疑
- **知识图谱增强**: 基于知识图谱的精准知识点关联与推荐
- **情感化交互**: 具备情感感知的拟人化应答

### 4. 📝 智能笔记助手
- **多模态输入**: 支持文本、语音实时转写、图像 OCR 识别
- **知识结构化**: 自动生成文档大纲，提取关键知识点，构建知识图谱
- **语义检索**: 基于向量的智能搜索，理解搜索意图而非仅关键词匹配

### 5. 💚 学习健康管理
- **学习强度监测**: 量化专注度与学习时长
- **智能休息建议**: 根据疲劳度推荐最佳休息时间
- **坐姿检测**: 通过摄像头分析坐姿，提供改善建议
- **心理健康关注**: 识别异常行为模式，提供心理支持资源

### 6. 🔄 跨场景智适应
- **场景感知**: 识别课堂、自习、考前复习等不同学习场景
- **场景化支持**: 课堂同步记录 / 自习路径规划 / 考前薄弱点诊断
- **无缝衔接**: 跨场景数据同步，保持学习状态连续性

## 🏗️ 系统架构

本项目采用 Monorepo 结构，包含三个核心微服务：

| 服务 | 目录 | 技术栈 | 职责 |
| :--- | :--- | :--- | :--- |
| **Web Client** | `/web` | Next.js 16, React, Tailwind, Shadcn | 用户交互, WebRTC 视频/音频流采集, 数据可视化 |
| **Api Gateway** | `/server` | Go 1.25, Gin, Melody, GORM | 业务逻辑编排, WebSocket 连接管理, 鉴权, 会话管理 |
| **AI Engine** | `/ai` | Python 3.14, FastAPI, LangChain | 多模态分析, RAG 问答, Embedding 生成, 智能决策 |

### 基础设施
- **Database**: Supabase (PostgreSQL 17 + pgvector)
- **Auth**: Supabase Auth (后端本地 JWT 校验)
- **AI Gateway**: OpenRouter (默认) - 支持切换 OpenAI、Anthropic、Google 等供应商
- **Deployment**: Docker Compose

## 🚀 快速开始

### 前置要求
- Docker & Docker Compose
- Go 1.25+
- Python 3.14+
- Node.js 22+

### 1. 克隆项目 & 环境变量
```bash
git clone https://github.com/A-Words/prism.git
cd prism
# 复制环境变量模板
cp .env.example .env
```
*请参考 `.env.example` 配置 Supabase Credentials 和 OpenAI API Key。*

### 2. 启动开发环境 (Docker Compose)
为了方便调试，推荐使用 Docker 启动数据库服务，应用服务可选择本地运行或 Docker 运行。

```bash
docker-compose up -d db
```

### 3. 本地运行各服务

**Terminal 1: Web**
```bash
cd web
npm install
npm run dev
```

**Terminal 2: Server (Go)**
```bash
cd server
go mod tidy
go run main.go
```

**Terminal 3: AI (Python)**
```bash
cd ai
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

## 📂 目录结构

```text
prism/
├── web/                 # Next.js 前端应用
│   ├── app/             # App Router 页面
│   │   ├── (auth)/      # 认证相关页面
│   │   ├── dashboard/   # 学习仪表盘
│   │   ├── study/       # 学习主界面（情绪监控、答题）
│   │   ├── assistant/   # 虚拟助教对话
│   │   └── notes/       # 智能笔记
│   ├── components/      # React 组件 (Shadcn UI)
│   └── lib/             # Supabase Client, Hooks
├── server/              # Golang 后端
│   ├── internal/        # 业务逻辑
│   │   ├── handler/     # HTTP/WS 处理器
│   │   ├── service/     # 业务服务层
│   │   └── repository/  # 数据访问层
│   ├── models/          # GORM 实体定义
│   └── ws/              # WebSocket 连接管理
├── ai/                  # Python AI 服务
│   ├── app/             # FastAPI 路由
│   │   ├── emotion/     # 情绪分析模块
│   │   ├── chat/        # 虚拟助教 RAG
│   │   ├── speech/      # 语音处理
│   │   └── vision/      # 视觉分析 (OCR, 姿态)
│   └── chains/          # LangChain 逻辑链
├── docker-compose.yml   # 编排文件
└── README.md            # 项目说明文档
```

## 🛡️ 许可证

MIT License © 2026 A_Words
