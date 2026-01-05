# Aptabase Event Ingestion API

本文档说明如何通过 HTTP API 向 Aptabase 推送分析事件。

## 修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| v1.0 | 2026-01-05 | 初始版本，包含事件推送 API 说明 | AIMO 开发团队 |

## API 端点

```
POST /api/v0/event
```

## 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| `Content-Type` | 是 | 必须为 `application/json` |
| `App-Key` | 是 | 应用的 App Key，格式如 `A-DEV-7944693530` |

## 请求体

```json
{
  "timestamp": "2026-01-05T08:10:00Z",
  "sessionId": "unique-session-id",
  "eventName": "event_name",
  "systemProps": {
    "osName": "macOS",
    "osVersion": "14.0",
    "locale": "zh-CN",
    "appVersion": "1.0.0",
    "appBuildNumber": "1",
    "sdkVersion": "aptabase-swift@0.3.0"
  },
  "props": {
    "key": "value"
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `timestamp` | string | 否 | ISO 8601 格式的 UTC 时间戳，默认为服务器接收时间 |
| `sessionId` | string | 否 | 会话唯一标识，用于关联同一会话的事件 |
| `eventName` | string | 是 | 事件名称，如 `app_started`、`button_clicked` |
| `systemProps` | object | 是 | 系统属性对象 |
| `props` | object | 否 | 自定义事件属性，键值对形式 |

### systemProps 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `osName` | string | 否 | 操作系统名称，如 `macOS`、`iOS`、`Android`、`Windows` |
| `osVersion` | string | 否 | 操作系统版本，如 `14.0` |
| `locale` | string | 否 | 语言区域设置，如 `zh-CN`、`en-US` |
| `appVersion` | string | 否 | 应用版本号，如 `1.0.0` |
| `appBuildNumber` | string | 否 | 应用构建号，如 `100` |
| `sdkVersion` | string | 是 | SDK 版本标识，格式为 `sdk-name@version` |

## 响应

### 成功响应

- **状态码**: `200 OK`
- **响应体**: `{}`

### 错误响应

#### 400 Bad Request - 验证错误

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "SystemProps.SdkVersion": ["The SdkVersion field is required."]
  }
}
```

#### 400 Bad Request - App Key 无效

当 App Key 不存在或无效时，服务器会记录警告日志但仍返回 200 状态码（静默失败）。

## 使用示例

### 基础事件推送

```bash
curl -X POST "https://your-aptabase-server/api/v0/event" \
  -H "Content-Type: application/json" \
  -H "App-Key: A-DEV-7944693530" \
  -d '{
    "eventName": "app_started",
    "systemProps": {
      "sdkVersion": "curl@1.0"
    }
  }'
```

### 完整事件推送

```bash
curl -X POST "https://your-aptabase-server/api/v0/event" \
  -H "Content-Type: application/json" \
  -H "App-Key: A-DEV-7944693530" \
  -d '{
    "timestamp": "2026-01-05T08:10:00Z",
    "sessionId": "session-abc123",
    "eventName": "button_clicked",
    "systemProps": {
      "osName": "macOS",
      "osVersion": "14.0",
      "locale": "zh-CN",
      "appVersion": "1.0.0",
      "appBuildNumber": "100",
      "sdkVersion": "aptabase-swift@0.3.0"
    },
    "props": {
      "button_name": "submit",
      "page": "checkout",
      "value": 99.99
    }
  }'
```

### 本地开发环境

本地开发时使用 HTTPS 且忽略证书验证：

```bash
curl -k -X POST "https://localhost:5251/api/v0/event" \
  -H "Content-Type: application/json" \
  -H "App-Key: A-DEV-7944693530" \
  -d '{
    "eventName": "test_event",
    "systemProps": {
      "osName": "macOS",
      "osVersion": "14.0",
      "sdkVersion": "curl@1.0"
    },
    "props": {
      "test": true
    }
  }'
```

### 使用动态时间戳 (Bash)

```bash
curl -k -X POST "https://localhost:5251/api/v0/event" \
  -H "Content-Type: application/json" \
  -H "App-Key: A-DEV-7944693530" \
  -d '{
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "sessionId": "session-'$(uuidgen)'",
    "eventName": "app_started",
    "systemProps": {
      "osName": "macOS",
      "osVersion": "14.0",
      "locale": "zh-CN",
      "appVersion": "1.0.0",
      "sdkVersion": "bash-curl@1.0"
    }
  }'
```

## 批量事件推送

Aptabase 也支持批量推送多个事件：

```
POST /api/v0/events
```

```bash
curl -X POST "https://your-aptabase-server/api/v0/events" \
  -H "Content-Type: application/json" \
  -H "App-Key: A-DEV-7944693530" \
  -d '[
    {
      "eventName": "app_started",
      "systemProps": {"sdkVersion": "curl@1.0"}
    },
    {
      "eventName": "page_viewed",
      "systemProps": {"sdkVersion": "curl@1.0"},
      "props": {"page": "home"}
    }
  ]'
```

## 常见事件命名约定

| 事件名称 | 说明 |
|----------|------|
| `app_started` | 应用启动 |
| `app_backgrounded` | 应用进入后台 |
| `app_foregrounded` | 应用回到前台 |
| `page_viewed` | 页面浏览 |
| `button_clicked` | 按钮点击 |
| `feature_used` | 功能使用 |
| `error_occurred` | 错误发生 |
| `purchase_completed` | 购买完成 |

## 注意事项

1. **App Key 安全**: App Key 应妥善保管，不要提交到公开代码仓库
2. **事件命名**: 建议使用 `snake_case` 格式命名事件
3. **属性大小**: 单个事件的 props 不应过大，建议控制在 10KB 以内
4. **频率限制**: 生产环境可能有速率限制，请参考服务器配置
5. **时间戳**: 建议使用 UTC 时间戳，确保跨时区数据一致性
