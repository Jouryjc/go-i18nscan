# NPM 认证问题快速修复指南

## 问题描述

如果你在 GitHub Actions 中遇到以下错误：

```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
npm error need auth You need to authorize this machine using `npm adduser`
```

## 快速修复步骤

### 1. 检查 NPM Token 配置

**步骤 A: 验证 GitHub Secrets**
1. 进入你的 GitHub 仓库
2. 点击 `Settings` > `Secrets and variables` > `Actions`
3. 确认存在名为 `NPM_TOKEN` 的 secret（注意大小写）

**步骤 B: 重新生成 NPM Token**
1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 点击头像 > `Access Tokens`
3. 点击 `Generate New Token`
4. **重要：选择 "Automation" 类型**
5. 复制生成的 token（格式：`npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
6. 在 GitHub Secrets 中更新 `NPM_TOKEN`

### 2. 验证 Token 权限

确保你的 NPM 账户有以下权限：
- 发布包的权限
- 如果是 scoped 包（如 `@username/package`），确认组织权限

### 3. 检查包配置

在 `package.json` 中确认：
```json
{
  "name": "your-package-name",
  "version": "x.x.x",
  "publishConfig": {
    "access": "public"
  }
}
```

### 4. 测试本地发布

在本地测试 NPM 认证：
```bash
# 登录 NPM
npm login

# 测试发布（dry run）
npm publish --dry-run
```

## 常见错误类型

### Token 类型错误
- ❌ "Read Only" - 无法发布
- ❌ "Read and Publish" - 可能在某些 CI 环境中失败
- ✅ "Automation" - 推荐用于 CI/CD

### Token 格式错误
- ❌ 旧格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- ✅ 新格式：`npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 验证修复

修复后，重新触发 GitHub Actions：
1. 推送新的 commit 或 tag
2. 或者在 Actions 页面手动重新运行工作流
3. 检查发布步骤是否成功

## 需要帮助？

如果问题仍然存在，请检查：
1. NPM 账户状态是否正常
2. 包名是否已被占用
3. 网络连接是否正常
4. GitHub Actions 日志中的详细错误信息