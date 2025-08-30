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

在GitHub仓库的Settings > Secrets and variables > Actions中添加：

- `NPM_TOKEN`: NPM发布令牌

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

如果发布失败，请检查：

1. **测试失败**: 确保本地运行`npm run test:ci`通过
2. **版本冲突**: 确认版本号未在NPM上存在
3. **权限问题**: 检查NPM_TOKEN是否有效
4. **网络问题**: 查看GitHub Actions日志

### 手动发布

如需手动发布，可以在GitHub Actions页面手动触发工作流。

---

更多详细信息请参考 [.github/README.md](.github/README.md)