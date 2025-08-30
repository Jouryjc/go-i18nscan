# GitHub Actions 配置说明

本项目使用GitHub Actions实现自动化CI/CD流程，包括测试和NPM包发布。

## 工作流程

### 自动发布工作流 (publish.yml)

当代码推送到`master`分支时，会自动触发以下流程：

1. **环境准备**
   - 设置Node.js 18环境
   - 设置Go 1.21环境（用于AST解析）
   - 安装项目依赖

2. **质量检查**
   - 运行所有测试用例
   - 确保代码质量

3. **版本检查**
   - 检查package.json中的版本号
   - 验证该版本是否已在NPM上发布
   - 只有新版本才会继续发布流程

4. **自动发布**
   - 发布NPM包
   - 创建GitHub Release
   - 生成版本标签

## 必需的Secrets配置

在GitHub仓库的Settings > Secrets and variables > Actions中添加以下secrets：

### NPM_TOKEN

用于发布NPM包的认证令牌。

**获取步骤：**

1. 登录 [npmjs.com](https://www.npmjs.com/)
2. 点击头像 > Access Tokens
3. 点击 "Generate New Token"
4. 选择 "Automation" 类型
5. 复制生成的token
6. 在GitHub仓库中添加名为 `NPM_TOKEN` 的secret

### GITHUB_TOKEN

用于创建GitHub Release，这个token是GitHub自动提供的，无需手动配置。

## 发布流程

### 自动发布

1. 更新package.json中的版本号：
   ```bash
   npm version patch  # 补丁版本 (1.0.0 -> 1.0.1)
   npm version minor  # 次要版本 (1.0.0 -> 1.1.0)
   npm version major  # 主要版本 (1.0.0 -> 2.0.0)
   ```

2. 推送到master分支：
   ```bash
   git push origin master
   ```

3. GitHub Actions会自动：
   - 运行测试
   - 发布到NPM
   - 创建GitHub Release

### 手动触发

也可以在GitHub Actions页面手动触发发布工作流。

## 工作流状态

可以在以下位置查看工作流状态：

- GitHub仓库的Actions标签页
- 提交记录旁的状态图标
- Pull Request中的检查状态

## 故障排除

### 常见问题

1. **NPM发布失败**
   - 检查NPM_TOKEN是否正确配置
   - 确认包名在NPM上可用
   - 检查版本号是否已存在

2. **测试失败**
   - 本地运行 `npm test` 确保测试通过
   - 检查Go环境是否正确安装

3. **版本冲突**
   - 确保package.json中的版本号是新的
   - 使用 `npm version` 命令正确更新版本

### 调试方法

1. 查看Actions日志获取详细错误信息
2. 在本地模拟CI环境进行测试
3. 检查所有必需的secrets是否正确配置

## 最佳实践

1. **版本管理**
   - 使用语义化版本控制
   - 在CHANGELOG.md中记录版本变更

2. **测试覆盖**
   - 确保所有新功能都有对应测试
   - 保持高测试覆盖率

3. **发布频率**
   - 小步快跑，频繁发布
   - 避免积累过多变更在一个版本中