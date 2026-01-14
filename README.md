# Prism - 基于多维情感智能的 AI 个性化学习系统

![Project Status](https://img.shields.io/badge/Status-Development-blue) ![Go Version](https://img.shields.io/badge/Go-1.25-cyan) ![Python Version](https://img.shields.io/badge/Python-3.14-yellow) ![Next.js](https://img.shields.io/badge/Next.js-16-black)

**Prism** 是一个在线学习平台，旨在通过实时情感计算与动态知识图谱，彻底重塑个性化学习体验。系统能够通过摄像头实时捕捉学生的学习状态（困惑、专注、疲劳），并利用 AI 动态调整题目难度与学习路径。

## 🌟 核心特性

- **🤨 实时情绪感知**: 利用视觉 AI 实时分析面部表情，精准识别困惑、疲劳或专注状态。
- **🧠 动态知识图谱**: 基于向量数据库 (Vector DB) 构建知识网络，支持复杂的知识点依赖关系管理。
- **🗺️ 个性化路径推荐**: 结合学生当下的情绪状态与能力雷达，利用 LangChain 编排最优学习路径。
- **⚡ 极简高效架构**: 采用 Next.js + Go + Python 微服务架构，各司其职，性能卓越。

## 🏗️ 系统架构

本项目采用 Monorepo 结构，包含三个核心微服务：

| 服务 | 目录 | 技术栈 | 职责 |
| :--- | :--- | :--- | :--- |
| **Web Client** | `/web` | Next.js 16, React, Tailwind, Shadcn | 用户交互, WebRTC 视频流采集, 数据可视化 |
| **Api Gateway** | `/server` | Go 1.25, Gin, Melody, GORM | 业务逻辑编排, WebSocket 连接管理, 鉴权 |
| **AI Engine** | `/ai` | Python 3.14, FastAPI, LangChain | 视觉推理, Embedding 生成, 智能决策 |

### 基础设施
- **Database**: Supabase (PostgreSQL 17 + pgvector)
- **Auth**: Supabase Auth (后端本地 JWT 校验)
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
│   ├── components/      # React 组件 (Shadcn UI)
│   └── lib/             # Supabase Client 工具
├── server/              # Golang 后端
│   ├── internal/        # 业务逻辑
│   ├── models/          # GORM 实体定义
│   └── ws/              # WebSocket 处理器
├── ai/                  # Python AI 服务
│   ├── app/             # FastAPI 路由
│   └── chains/          # LangChain 逻辑链
├── docker-compose.yml   # 编排文件
└── README.md            # 项目说明文档
```

## 🛡️ 许可证

MIT License © 2026 A_Words
