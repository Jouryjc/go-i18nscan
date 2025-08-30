# i18nscan - Go项目中文词条提取器

一个专门用于从Go项目中提取中文词条的工具，支持AST解析和智能识别i18n函数调用。

## 功能特性

- 🔍 **智能扫描**: 基于Go AST解析，准确识别代码中的中文字符串
- 🎯 **i18n函数识别**: 自动识别常见的i18n函数调用（如`t()`, `i18n.T()`等）
- 📊 **详细统计**: 提供文件级别和项目级别的统计信息
- 🔧 **灵活配置**: 支持自定义扫描目录、文件类型和i18n函数
- 📄 **多格式输出**: 支持JSON和CSV格式输出
- 🚀 **CLI工具**: 提供完整的命令行界面

## 安装

```bash
npm install -g i18nscan
```

或者克隆项目本地使用：

```bash
git clone <repository-url>
cd i18nscan
npm install
```

## 快速开始

### 1. 初始化配置

```bash
node bin/cli.js init
```

这将在当前目录创建一个 `ci.yaml` 配置文件。

### 2. 扫描项目

```bash
node bin/cli.js scan
```

### 3. 查看统计信息

```bash
node bin/cli.js stats
```

### 4. 验证环境

```bash
node bin/cli.js validate
```

## 配置文件

`ci.yaml` 配置文件示例：

```yaml
# 扫描配置
scan_config:
  source_dirs:
    - "./src"
    - "./internal"
    - "./pkg"
  file_extensions:
    - ".go"
  recursive: true
  exclude_dirs:
    - "vendor"
    - "node_modules"
    - ".git"

# i18n函数配置
i18n_functions:
  - name: "t"
  - name: "i18n.T"
  - name: "Trans"

# 输出配置
output_config:
  output_file: "./extracted_terms.json"
  format: "json"  # json 或 csv

# 翻译文件配置
translation_files:
  zh_cn: "./locales/zh-CN.json"
  en_us: "./locales/en-US.json"
  ja_jp: "./locales/ja-JP.json"
```

## 命令行选项

### scan 命令

```bash
node bin/cli.js scan [options]
```

选项：
- `-c, --config <path>`: 指定配置文件路径
- `-o, --output <path>`: 指定输出文件路径
- `-f, --format <format>`: 指定输出格式 (json|csv)
- `--no-output`: 不输出文件，仅显示统计
- `--include-translated`: 包含已翻译的词条
- `-v, --verbose`: 显示详细信息

### validate 命令

```bash
node bin/cli.js validate [options]
```

验证Go环境和配置文件的有效性。

### stats 命令

```bash
node bin/cli.js stats [options]
```

显示项目的i18n统计信息。

### init 命令

```bash
node bin/cli.js init [options]
```

选项：
- `-p, --path <path>`: 指定项目路径
- `--example`: 创建示例项目

## 输出格式

### JSON格式

```json
{
  "metadata": {
    "extractedAt": "2025-08-30T14:45:28.655Z",
    "totalTerms": 29,
    "summary": {
      "totalFiles": 1,
      "successFiles": 1,
      "errorFiles": 0,
      "totalTerms": 29
    }
  },
  "terms": [
    {
      "text": "你好，世界！",
      "file": "sample.go",
      "position": {
        "start": 0,
        "end": 0
      },
      "argumentIndex": 0,
      "extractedAt": "2025-08-30T14:45:28.650Z"
    }
  ]
}
```

### CSV格式

```csv
text,file,position_start,position_end,argument_index,extracted_at
你好，世界！,sample.go,0,0,0,2025-08-30T14:45:28.650Z
```

## 环境要求

- Node.js >= 14.0.0
- Go >= 1.16 (用于AST解析)

## 许可证

MIT License