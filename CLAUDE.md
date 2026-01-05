# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

Aptabase 是一个开源的、隐私优先的应用分析平台，适用于移动端、桌面端和 Web 应用，是 Firebase/Google Analytics 的替代方案。

## 技术栈

- **后端**: ASP.NET Core 8.0 (C#)
- **前端**: React 18 + TypeScript + Vite
- **数据库**: PostgreSQL（用户数据）+ ClickHouse（分析事件）
- **样式**: TailwindCSS
- **状态管理**: Jotai
- **测试框架**: xUnit

## 开发命令

```bash
# 启动依赖服务（PostgreSQL、ClickHouse、Mailcatcher）
docker compose up -d

# 安装依赖
cd src && npm install && dotnet restore

# 运行开发环境（需要两个终端）
# 终端 1 - 后端:
cd src && dotnet watch

# 终端 2 - 前端:
cd src && npm run dev

# 或使用 Makefile（同时运行两者）:
make dev

# 运行测试
dotnet test --project tests/UnitTests
dotnet test --project tests/IntegrationTests

# 构建前端生产版本
cd src && npm run build
```

## 架构

### 后端结构 (`src/Features/`)

采用基于功能的模块化组织，每个领域拥有独立的控制器、查询和服务：

- **Ingestion**: 事件采集管道，带缓冲机制（`InMemoryEventBuffer` → `ClickHouseIngestionClient`）
- **Stats**: 分析查询和聚合
- **Authentication**: OAuth 认证（GitHub、Google），基于 Cookie 的会话管理
- **Billing**: LemonSqueezy 订阅集成
- **GeoIP**: MaxMind 数据库或云端地理定位
- **Notification**: 通过 SES、SMTP 或 Mailcatcher（开发环境）发送邮件

### 前端结构 (`src/webapp/`)

- **features/**: 领域特定的页面和组件（analytics、apps、billing、auth）
- **components/**: 共享 UI 组件
- **hooks/**: 自定义 React Hooks
- **atoms/**: Jotai 状态原子
- **fns/**: 工具函数

### 路径别名（TypeScript）

```typescript
@components → ./webapp/components
@features   → ./webapp/features
@hooks      → ./webapp/hooks
@fns        → ./webapp/fns
```

### API 代理配置

前端开发服务器（端口 3000）代理到后端（端口 5251）：
- `/api/*` → 后端 API 端点
- `/uploads/*` → Blob 存储
- `/webhook/*` → Webhook 处理器

## 数据库访问

开发环境凭据（docker-compose）：
- **PostgreSQL**: `aptabase:aptabase_pw`，端口 5432
- **ClickHouse**: `aptabase:aptabase_pw`，端口 8123
- **Mailcatcher UI**: http://localhost:1080

## 关键模式

- **双数据库架构**: PostgreSQL 存储用户/应用元数据，ClickHouse 存储高吞吐量事件分析数据
- **FluentMigrator**: 数据库迁移位于 `src/Data/Migrations/`
- **Dapper**: SQL 查询，启用 `MatchNamesWithUnderscores`
- **速率限制**: 内置策略用于 SignUp、Stats、EventIngestion、FeatureFlags 端点
- **CORS**: 仪表盘采用限制性策略（`AllowAptabaseCom`），SDK 采集采用宽松策略（`AllowAny`）

## 配置

首次运行前，将 `src/Properties/launchSettings.example.json` 复制为 `launchSettings.json`。环境特定配置位于 `appsettings.{Environment}.json`。

## CI/CD

GitHub Actions 工作流（`.github/workflows/ci.yml`）：
- 运行单元测试和集成测试
- 构建多架构 Docker 镜像（amd64/arm64）
- main 分支推送时发布到 GitHub Container Registry
