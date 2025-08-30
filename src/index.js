const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

const ConfigManager = require('./configManager');
const GoAstParser = require('./goAstParser');
const ChineseExtractor = require('./chineseExtractor');

/**
 * i18n中文词条扫描器主类
 * 整合AST解析、中文提取和配置管理功能
 */
class I18nScanner {
  constructor(configPath = null) {
    this.configManager = new ConfigManager(configPath);
    this.goParser = new GoAstParser();
    this.extractor = null;
    this.config = null;
  }

  /**
   * 初始化扫描器
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log(chalk.blue('🔧 正在加载配置文件...'));
      this.config = await this.configManager.loadConfig();
      this.extractor = new ChineseExtractor(this.config);
      console.log(chalk.green('✅ 配置加载完成'));
    } catch (error) {
      throw new Error(`初始化失败: ${error.message}`);
    }
  }

  /**
   * 扫描Go文件并提取中文词条
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object>} 扫描结果
   */
  async scan(options = {}) {
    if (!this.config) {
      await this.initialize();
    }

    const scanConfig = this.configManager.getScanConfig();
    const outputConfig = this.configManager.getOutputConfig();
    
    console.log(chalk.blue('🔍 开始扫描Go文件...'));
    
    try {
      // 1. 查找Go文件
      const goFiles = await this.findGoFiles(scanConfig);
      console.log(chalk.cyan(`📁 找到 ${goFiles.length} 个Go文件`));
      
      if (goFiles.length === 0) {
        console.log(chalk.yellow('⚠️  未找到任何Go文件'));
        return { terms: [], summary: { totalFiles: 0, totalTerms: 0 } };
      }

      // 2. 解析AST
      console.log(chalk.blue('🌳 正在解析AST...'));
      const astResults = await this.goParser.parseFiles(goFiles);
      
      // 3. 提取中文词条
      console.log(chalk.blue('🔤 正在提取中文词条...'));
      const extractResult = this.extractor.extractFromMultipleFiles(astResults);
      
      // 4. 过滤已翻译词条（如果配置了翻译文件）
      let finalTerms = extractResult.terms;
      const translatedFilePath = this.configManager.getTranslatedFilePath('zh_cn');
      if (translatedFilePath && options.excludeTranslated !== false) {
        console.log(chalk.blue('🔍 正在过滤已翻译词条...'));
        finalTerms = await this.extractor.filterUntranslatedTerms(finalTerms, translatedFilePath);
      }
      
      // 5. 输出结果
      if (options.output !== false) {
        await this.outputResults(finalTerms, outputConfig, extractResult.summary);
      }
      
      // 6. 显示统计信息
      this.displaySummary(extractResult.summary, finalTerms.length, extractResult.errors);
      
      return {
        terms: finalTerms,
        summary: extractResult.summary,
        errors: extractResult.errors
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ 扫描失败: ${error.message}`));
      throw error;
    } finally {
      // 清理临时文件
      await this.goParser.cleanup();
    }
  }

  /**
   * 查找Go源文件
   * @param {Object} scanConfig - 扫描配置
   * @returns {Promise<string[]>} Go文件路径列表
   */
  async findGoFiles(scanConfig) {
    const goFiles = [];
    const extensions = scanConfig.file_extensions || ['.go'];
    
    for (const sourceDir of scanConfig.source_dirs) {
      if (!await fs.pathExists(sourceDir)) {
        console.warn(chalk.yellow(`⚠️  目录不存在: ${sourceDir}`));
        continue;
      }
      
      for (const ext of extensions) {
        const pattern = scanConfig.recursive 
          ? path.join(sourceDir, '**', `*${ext}`)
          : path.join(sourceDir, `*${ext}`);
        
        const files = glob.sync(pattern, {
          ignore: scanConfig.exclude_dirs?.map(dir => path.join(dir, '**')) || []
        });
        
        goFiles.push(...files);
      }
    }
    
    // 去重并返回绝对路径
    return [...new Set(goFiles)].map(file => path.resolve(file));
  }

  /**
   * 输出扫描结果
   * @param {Object[]} terms - 提取的词条
   * @param {Object} outputConfig - 输出配置
   * @param {Object} summary - 统计信息
   * @returns {Promise<void>}
   */
  async outputResults(terms, outputConfig, summary) {
    const outputFile = outputConfig.output_file;
    const format = outputConfig.format || 'json';
    
    // 准备输出数据
    const outputData = {
      metadata: {
        extractedAt: new Date().toISOString(),
        totalTerms: terms.length,
        summary: summary
      },
      terms: outputConfig.include_location ? terms : terms.map(term => ({
        text: term.text,
        extractedAt: term.extractedAt
      }))
    };
    
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputFile));
    
    // 根据格式输出
    switch (format.toLowerCase()) {
      case 'json':
        await fs.writeJson(outputFile, outputData, { spaces: 2 });
        break;
        
      case 'csv':
        await this.outputCsv(terms, outputFile);
        break;
        
      case 'yaml':
        const yaml = require('js-yaml');
        await fs.writeFile(outputFile, yaml.dump(outputData));
        break;
        
      default:
        throw new Error(`不支持的输出格式: ${format}`);
    }
    
    console.log(chalk.green(`💾 结果已保存到: ${outputFile}`));
  }

  /**
   * 输出CSV格式
   * @param {Object[]} terms - 词条列表
   * @param {string} outputFile - 输出文件路径
   * @returns {Promise<void>}
   */
  async outputCsv(terms, outputFile) {
    const headers = ['文本', '文件', '位置', '参数索引', '提取时间'];
    const rows = [headers.join(',')];
    
    terms.forEach(term => {
      const row = [
        `"${term.text.replace(/"/g, '""')}"`,
        `"${term.file}"`,
        `"${term.position?.start || ''}-${term.position?.end || ''}"`,
        term.argumentIndex || '',
        term.extractedAt || ''
      ];
      rows.push(row.join(','));
    });
    
    await fs.writeFile(outputFile, rows.join('\n'), 'utf8');
  }

  /**
   * 显示扫描统计信息
   * @param {Object} summary - 统计信息
   * @param {number} finalTermsCount - 最终词条数量
   * @param {Object[]} errors - 错误列表
   */
  displaySummary(summary, finalTermsCount, errors) {
    console.log(chalk.blue('\n📊 扫描统计:'));
    console.log(`   总文件数: ${chalk.cyan(summary.totalFiles)}`);
    console.log(`   成功解析: ${chalk.green(summary.successFiles)}`);
    console.log(`   解析失败: ${chalk.red(summary.errorFiles)}`);
    console.log(`   提取词条: ${chalk.yellow(summary.totalTerms)}`);
    console.log(`   最终词条: ${chalk.magenta(finalTermsCount)}`);
    
    if (errors && errors.length > 0) {
      console.log(chalk.red('\n❌ 错误详情:'));
      errors.forEach(error => {
        console.log(`   ${chalk.red('•')} ${error.file}: ${error.error}`);
      });
    }
  }

  /**
   * 验证Go环境
   * @returns {Promise<boolean>} 是否可用
   */
  static async validateGoEnvironment() {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const goProcess = spawn('go', ['version']);
      
      goProcess.on('close', (code) => {
        resolve(code === 0);
      });
      
      goProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 创建示例项目
   * @param {string} projectPath - 项目路径
   * @returns {Promise<void>}
   */
  static async createExample(projectPath = './example') {
    await fs.ensureDir(projectPath);
    
    // 创建示例Go文件
    const exampleGoCode = `package main

import (
	"fmt"
	"github.com/example/i18n"
)

func main() {
	fmt.Println(t("你好，世界！"))
	fmt.Println(i18n.T("欢迎使用i18n扫描器"))
	Translate("这是一个测试消息")
}

func showMessage() {
	msg := t("用户" + "登录成功")
	fmt.Println(msg)
}
`;
    
    await fs.writeFile(path.join(projectPath, 'main.go'), exampleGoCode);
    
    // 创建配置文件
    await ConfigManager.createDefaultConfig(path.join(projectPath, 'ci.yaml'));
    
    // 创建翻译文件目录
    const localesDir = path.join(projectPath, 'locales');
    await fs.ensureDir(localesDir);
    
    const zhCnTranslations = {
      "你好，世界！": "Hello, World!",
      "欢迎使用i18n扫描器": "Welcome to i18n Scanner"
    };
    
    await fs.writeJson(path.join(localesDir, 'zh-CN.json'), zhCnTranslations, { spaces: 2 });
    
    console.log(chalk.green(`✅ 示例项目已创建: ${projectPath}`));
    console.log(chalk.cyan('💡 运行命令: cd example && i18nscan'));
  }
}

module.exports = I18nScanner;

// 如果直接运行此文件
if (require.main === module) {
  const scanner = new I18nScanner();
  scanner.scan().catch(error => {
    console.error(chalk.red(`扫描失败: ${error.message}`));
    process.exit(1);
  });
}