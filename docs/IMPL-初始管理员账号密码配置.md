# 初始管理员账号密码配置实现方案

## 修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| v1.0 | 2024-12-30 | 初始版本创建 | AIMO开发团队 |

## 1. 需求背景

当前 Aptabase 系统仅支持以下登录方式：
- **Magic Link**：通过邮件发送登录链接（需要邮件服务）
- **OAuth**：GitHub/Google 第三方登录（需要配置 OAuth 应用）

在本地开发或私有部署场景下，上述方式配置复杂。需要支持通过环境变量预置管理员账号密码，简化部署流程。

## 2. 设计目标

1. 通过环境变量配置初始管理员的邮箱和密码
2. 支持密码登录方式
3. 不修改现有数据库结构
4. 保持与现有认证系统的兼容性
5. 仅在配置了管理员凭据时启用密码登录

## 3. 技术方案

### 3.1 环境变量配置

在 `EnvSettings.cs` 中添加管理员配置：

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 管理员密码 | `your-secure-password` |
| `ADMIN_NAME` | 管理员名称（可选） | `Administrator` |

### 3.2 模块设计

```
┌─────────────────────────────────────────────────────────────┐
│                        前端登录页面                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Magic Link 表单 │    │  密码登录表单（条件显示）        │ │
│  └────────┬────────┘    └────────────────┬────────────────┘ │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐    ┌─────────────────────────────────┐
│ POST /api/_auth/signin │    │ POST /api/_auth/password-login  │
│   (现有 Magic Link)    │    │        (新增端点)                │
└───────────────────────┘    └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │         AuthService             │
                             │  ┌───────────────────────────┐  │
                             │  │ ValidateAdminCredentials  │  │
                             │  │ FindOrCreateAdminUser     │  │
                             │  │ SignInAsync               │  │
                             │  └───────────────────────────┘  │
                             └─────────────────────────────────┘
```

### 3.3 后端实现

#### 3.3.1 EnvSettings.cs 修改

```csharp
// 新增属性
public string AdminEmail { get; private set; } = "";
public string AdminPassword { get; private set; } = "";
public string AdminName { get; private set; } = "Administrator";
public bool IsAdminLoginEnabled => !string.IsNullOrEmpty(AdminEmail) && !string.IsNullOrEmpty(AdminPassword);

// Load() 方法中添加
AdminEmail = Get("ADMIN_EMAIL"),
AdminPassword = Get("ADMIN_PASSWORD"),
AdminName = Get("ADMIN_NAME").DefaultIfEmpty("Administrator"),
```

#### 3.3.2 AuthController.cs 新增端点

```csharp
public class PasswordLoginRequest
{
    [EmailAddress]
    public string Email { get; set; } = "";

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = "";
}

[HttpGet("/api/_auth/password-login-enabled")]
public IActionResult IsPasswordLoginEnabled()
{
    return Ok(new { enabled = _env.IsAdminLoginEnabled });
}

[HttpPost("/api/_auth/password-login")]
[EnableRateLimiting("SignUp")]
public async Task<IActionResult> PasswordLogin(
    [FromBody] PasswordLoginRequest body,
    CancellationToken cancellationToken)
{
    if (!_env.IsAdminLoginEnabled)
        return NotFound(new { message = "Password login is not enabled" });

    // 验证凭据
    if (!string.Equals(body.Email, _env.AdminEmail, StringComparison.OrdinalIgnoreCase) ||
        body.Password != _env.AdminPassword)
    {
        return Unauthorized(new { message = "Invalid credentials" });
    }

    // 查找或创建管理员用户
    var user = await _authService.FindUserByEmailAsync(body.Email, cancellationToken);
    if (user == null)
    {
        user = await _authService.CreateAccountAsync(
            _env.AdminName,
            body.Email,
            cancellationToken);
    }

    await _authService.SignInAsync(user);
    return Ok(new { });
}
```

#### 3.3.3 安全考虑

1. **速率限制**：复用 `SignUp` 策略（4次/小时）
2. **密码不存储**：密码仅在环境变量中，不写入数据库
3. **生产环境警告**：非开发环境启用时记录警告日志

```csharp
if (_env.IsAdminLoginEnabled && !_env.IsDevelopment)
{
    _logger.LogWarning("Admin password login is enabled in non-development environment");
}
```

### 3.4 前端实现

#### 3.4.1 登录页面修改

文件：`src/webapp/features/auth/SignInPage.tsx`（或类似路径）

```typescript
// 查询是否启用密码登录
const { data: passwordLoginConfig } = useQuery({
  queryKey: ['password-login-enabled'],
  queryFn: () => fetch('/api/_auth/password-login-enabled').then(r => r.json())
});

// 条件渲染密码登录表单
{passwordLoginConfig?.enabled && (
  <PasswordLoginForm onSuccess={() => navigate('/')} />
)}
```

#### 3.4.2 密码登录表单组件

```typescript
function PasswordLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/_auth/password-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### 3.5 配置示例

#### launchSettings.json

```json
{
  "profiles": {
    "http": {
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development",
        "BASE_URL": "https://localhost:3000",
        "DATABASE_URL": "Server=localhost;Port=5432;User Id=aptabase;Password=aptabase_pw;Database=aptabase",
        "CLICKHOUSE_URL": "Host=localhost;Port=8123;Username=aptabase;Password=aptabase_pw",
        "AUTH_SECRET": "E9F5C811CD74B9A3921A5DB502C0EDBE64B746000663AF04D91C249687FA969B",
        "ADMIN_EMAIL": "admin@example.com",
        "ADMIN_PASSWORD": "admin123",
        "ADMIN_NAME": "Admin"
      }
    }
  }
}
```

#### Docker Compose

```yaml
services:
  aptabase:
    environment:
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ADMIN_NAME=Administrator
```

## 4. 实现步骤

| 步骤 | 文件 | 改动内容 |
|------|------|----------|
| 1 | `src/Features/EnvSettings.cs` | 添加管理员配置属性 |
| 2 | `src/Features/Authentication/AuthController.cs` | 添加密码登录端点 |
| 3 | `src/webapp/features/auth/*` | 添加密码登录表单 |
| 4 | `src/Properties/launchSettings.example.json` | 添加配置示例 |

## 5. 测试方案

### 5.1 单元测试

- 验证 `EnvSettings.IsAdminLoginEnabled` 逻辑
- 验证凭据匹配逻辑

### 5.2 集成测试

| 场景 | 预期结果 |
|------|----------|
| 未配置管理员时访问密码登录端点 | 返回 404 |
| 配置管理员后，正确凭据登录 | 返回 200，设置 Cookie |
| 配置管理员后，错误凭据登录 | 返回 401 |
| 首次登录自动创建用户 | 数据库中创建用户记录 |
| 重复登录使用已有用户 | 不重复创建用户 |

### 5.3 手动测试

1. 配置环境变量启动后端
2. 访问登录页面，确认显示密码登录表单
3. 使用配置的邮箱密码登录
4. 验证登录成功，跳转到首页

## 6. 风险与注意事项

1. **安全风险**：密码以明文存储在环境变量中，仅适用于开发/测试环境
2. **生产环境**：建议生产环境使用 OAuth 或 Magic Link
3. **密码强度**：建议添加密码强度提示，但不强制
4. **向后兼容**：不配置时，系统行为与原来一致
