# i18nscan - Go项目中文词条提取器

基于AST解析的Go项目国际化(i18n)中文词条提取工具，使用Node.js实现。

## 功能特性

- 🌳 **AST解析**: 使用Go编译原理解析源代码，准确识别函数调用
- 🔍 **智能识别**: 根据配置文件定义的i18n函数表达式识别中文词条
- 📝 **多格式输出**: 支持JSON、CSV、YAML等多种输出格式
- 🔧 **灵活配置**: 通过ci.yaml配置文件自定义扫描规则
- 📊 **统计分析**: 提供详细的扫描统计和错误报告
- 🚀 **CLI工具**: 提供完整的命令行界面

## 安装

### 前置要求

- Node.js >= 14.0.0
- Go >= 1.16 (用于AST解析)

### 安装依赖

```bash
npm install
```

### 全局安装

```bash
npm install -g .
```

## 快速开始

### 1. 初始化项目

```bash
# 创建配置文件和目录结构
i18nscan init

# 或创建示例项目
i18nscan init --example
```

### 2. 配置ci.yaml

```yaml
# i18n函数配置
i18n_functions:
  - name: "t"
    description: "基础翻译函数"
  - name: "i18n.T"
    description: "i18n包的翻译函数"

# 扫描配置
scan_config:
  source_dirs:
    - "./src"
    - "./internal"
  exclude_dirs:
    - "./vendor"
  file_extensions:
    - ".go"

# 已翻译词条文件
translated_files:
  zh_cn: "./locales/zh-CN.json"
```

### 3. 执行扫描

```bash
# 基础扫描
i18nscan

# 或使用scan命令
i18nscan scan

# 指定配置文件
i18nscan scan -c ./config/ci.yaml

# 指定输出文件和格式
i18nscan scan -o ./output.json --format json
```

## 命令行工具

### 主要命令

```bash
# 扫描中文词条
i18nscan scan [options]

# 验证配置和环境
i18nscan validate

# 初始化项目
i18nscan init [options]

# 显示统计信息
i18nscan stats
```

### 扫描选项

```bash
-c, --config <path>     指定配置文件路径 (默认: ci.yaml)
-o, --output <path>     指定输出文件路径
--format <format>       输出格式 (json|csv|yaml)
--include-translated    包含已翻译的词条
--no-output            不输出到文件，仅显示统计
--verbose              显示详细信息
```

## 配置文件详解

### 完整配置示例

```yaml
# i18n函数表达式配置
i18n_functions:
  - name: "t"
    description: "基础翻译函数"
  - name: "i18n.T"
    description: "i18n包的翻译函数"
  - name: "Translate"
    description: "自定义翻译函数"

# 函数调用模式匹配
function_patterns:
  - pattern: "\\b(t|i18n\\.T|Translate)\\s*\\("
    description: "匹配i18n函数调用"

# 已翻译词条文件配置
translated_files:
  zh_cn: "./locales/zh-CN.json"
  en_us: "./locales/en-US.json"

# 扫描配置
scan_config:
  source_dirs:
    - "./src"
    - "./internal"
    - "./pkg"
  exclude_dirs:
    - "./vendor"
    - "./node_modules"
  file_extensions:
    - ".go"
  recursive: true

# 输出配置
output_config:
  output_file: "./extracted_terms.json"
  format: "json"
  include_location: true
  deduplicate: true

# 中文检测配置
chinese_detection:
  unicode_ranges:
    - "\\u4e00-\\u9fff"  # 基本汉字
    - "\\u3400-\\u4dbf"  # 扩展A
  min_chinese_chars: 1
  ignore_numbers_only: true
```

## 输出格式

### JSON格式

```json
{
  "metadata": {
    "extractedAt": "2024-01-15T10:30:00.000Z",
    "totalTerms": 25,
    "summary": {
      "totalFiles": 10,
      "successFiles": 9,
      "errorFiles": 1
    }
  },
  "terms": [
    {
      "text": "你好世界",
      "file": "/path/to/main.go",
      "position": {
        "start": 100,
        "end": 110
      },
      "argumentIndex": 0,
      "extractedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### CSV格式

```csv
文本,文件,位置,参数索引,提取时间
"你好世界","/path/to/main.go","100-110",0,"2024-01-15T10:30:00.000Z"
"欢迎使用","/path/to/user.go","200-210",0,"2024-01-15T10:30:00.000Z"
```

## 使用示例

### Go代码示例

```go
package main

import "fmt"

func main() {
    // 这些中文词条会被提取
    fmt.Println(t("你好，世界！"))
    message := i18n.T("欢迎使用系统")
    Translate("用户登录成功")
    
    // 字符串拼接也会被识别
    greeting := t("你好，" + username)
    
    // 这些不会被提取（非i18n函数）
    fmt.Println("这个不会被提取")
    log.Info("系统日志")
}
```

### 扫描结果

```bash
🚀 i18n中文词条扫描器
版本: 1.0.0

🔧 正在加载配置文件...
✅ 配置加载完成
🔍 开始扫描Go文件...
📁 找到 15 个Go文件
🌳 正在解析AST...
🔤 正在提取中文词条...
💾 结果已保存到: ./extracted_terms.json

📊 扫描统计:
   总文件数: 15
   成功解析: 14
   解析失败: 1
   提取词条: 28
   最终词条: 25

✅ 扫描完成
```

## API使用

### 编程接口

```javascript
const I18nScanner = require('./src/index');

async function scanProject() {
  const scanner = new I18nScanner('./ci.yaml');
  
  try {
    const result = await scanner.scan({
      output: true,
      excludeTranslated: true
    });
    
    console.log(`提取了 ${result.terms.length} 个中文词条`);
    
    result.terms.forEach(term => {
      console.log(`"${term.text}" - ${term.file}`);
    });
  } catch (error) {
    console.error('扫描失败:', error.message);
  }
}

scanProject();
```

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --testNamePattern="ConfigManager"

# 生成覆盖率报告
npm test -- --coverage
```

## 故障排除

### 常见问题

1. **Go环境未找到**
   ```bash
   # 验证Go安装
   go version
   
   # 验证环境
   i18nscan validate
   ```

2. **配置文件错误**
   ```bash
   # 验证配置文件
   i18nscan validate -c ./ci.yaml
   
   # 重新生成配置
   i18nscan init --force
   ```

3. **扫描结果为空**
   - 检查扫描目录配置
   - 确认i18n函数名配置正确
   - 使用 `--verbose` 查看详细信息

### 调试模式

```bash
# 显示详细输出
i18nscan scan --verbose

# 不输出文件，仅查看统计
i18nscan scan --no-output --verbose
```

## 贡献

欢迎提交Issue和Pull Request！

### 开发环境

```bash
# 克隆项目
git clone <repository-url>
cd i18nscan

# 安装依赖
npm install

# 运行测试
npm test

# 启动开发模式
npm run dev
```

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 支持Go AST解析
- 支持多种输出格式
- 完整的CLI工具
- 配置文件支持