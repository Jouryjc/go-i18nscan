# 发布说明

## 自动发布流程

本项目已配置GitHub Actions自动发布流程，当代码合并到`master`分支时会自动触发。

### 发布步骤

1. **更新版本号**
   ```bash
   npm version patch  # 补丁版本 1.0.0 -> 1.0.1
   npm version minor  # 次要版本 1.0.0 -> 1.1.0  
   npm version major  # 主要版本 1.0.0 -> 2.0.0
   ```

2. **推送到master分支**
   ```bash
   git push origin master
   git push --tags
   ```

3. **自动执行流程**
   - 运行CI测试
   - 检查版本是否为新版本
   - 发布到NPM
   - 创建GitHub Release

### 必需配置

#### GitHub Secrets

在仓库设置中配置以下secrets：

#### NPM_TOKEN
用于发布NPM包的认证令牌。

**获取步骤：**
1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 点击头像 > Access Tokens
3. 点击 "Generate New Token"
4. **重要：选择 "Automation" 类型**（必须选择此类型才能用于CI/CD）
5. 复制生成的token（格式：npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）
6. 在GitHub仓库 Settings > Secrets and variables > Actions 中添加名为 `NPM_TOKEN` 的secret

#### GITHUB_TOKEN
GitHub API令牌（由GitHub Actions自动提供，无需手动配置）

### 发布要求

- ✅ 所有CI测试必须通过
- ✅ 版本号必须是新的（未在NPM发布过）
- ✅ 代码必须合并到master分支

### 版本管理建议

- **补丁版本 (patch)**: 修复bug、小改进
- **次要版本 (minor)**: 新功能、向后兼容
- **主要版本 (major)**: 破坏性变更、重大更新

### 发布检查清单

- [ ] 代码已经过充分测试
- [ ] 更新了相关文档
- [ ] 版本号符合语义化版本规范
- [ ] CI测试全部通过
- [ ] NPM_TOKEN已正确配置

### 故障排除

#### NPM认证错误 (ENEEDAUTH)

如果遇到以下错误：
```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

**解决步骤：**

1. **检查NPM_TOKEN配置**
   - 确认已在GitHub Secrets中添加 `NPM_TOKEN`
   - Token名称必须完全匹配（区分大小写）

2. **验证Token类型**
   - 登录NPM，检查Token类型是否为 "Automation" 或 "Publish"
   - "Read Only" 类型的Token无法用于发布

3. **检查Token格式**
   - Token应以 `npm_` 开头
   - 完整格式：`npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. **验证发布权限**
   - 确认你的NPM账户有发布该包的权限
   - 如果是scoped包，确认组织权限设置正确

#### 其他常见问题

如果发布失败，请检查：

1. **测试失败**: 确保本地运行`npm run test:ci`通过
2. **版本冲突**: 确认版本号未在NPM上存在
3. **权限问题**: 检查NPM_TOKEN是否有效
4. **网络问题**: 查看GitHub Actions日志

### 手动发布

如需手动发布，可以在GitHub Actions页面手动触发工作流。

---

更多详细信息请参考 [.github/README.md](.github/README.md)