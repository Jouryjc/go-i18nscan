# Changelog

本文档记录了 go-i18nscan 项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.1] - 2025-09-02

### 改进
- 优化全局安装使用说明
- 更新所有命令示例从 `node bin/cli.js` 改为 `i18nscan`
- 添加全局安装推荐说明和使用示例
- 强调可以在任何Go项目目录中使用的特性
- 改进README.md文档结构和可读性

### 文档
- 新增使用示例部分，展示典型工作流程
- 更新安装说明，区分全局安装和本地开发安装
- 修正项目目录名称从 `i18nscan` 到 `go-i18nscan`

## [1.0.0] - 2025-09-01

### 新增
- 初始版本发布
- 基于AST解析的Go项目中文词条提取功能
- 支持多种i18n函数识别（t, i18n.T, Trans等）
- 支持JSON和CSV格式输出
- 配置文件支持（ci.yaml）
- 命令行工具支持（init, scan, stats, validate）
- 翻译文件管理功能
- 统计和验证功能
- GitHub Actions自动发布流程