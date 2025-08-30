#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

const I18nScanner = require('../src/index');
const ConfigManager = require('../src/configManager');
const packageJson = require('../package.json');

/**
 * CLI程序主入口
 */
class I18nScannerCLI {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * 设置CLI命令
   */
  setupCommands() {
    this.program
      .name('i18nscan')
      .description('Go项目中文词条提取器 - 基于AST解析识别i18n函数中的中文词条')
      .version(packageJson.version);

    // 主扫描命令
    this.program
      .command('scan')
      .description('扫描Go项目中的中文词条')
      .option('-c, --config <path>', '指定配置文件路径', 'ci.yaml')
      .option('-o, --output <path>', '指定输出文件路径')
      .option('--format <format>', '输出格式 (json|csv|yaml)', 'json')
      .option('--include-translated', '包含已翻译的词条')
      .option('--no-output', '不输出到文件，仅显示统计')
      .option('--verbose', '显示详细信息')
      .action(async (options) => {
        await this.handleScanCommand(options);
      });

    // 验证命令
    this.program
      .command('validate')
      .description('验证配置文件和环境')
      .option('-c, --config <path>', '指定配置文件路径', 'ci.yaml')
      .action(async (options) => {
        await this.handleValidateCommand(options);
      });

    // 初始化命令
    this.program
      .command('init')
      .description('初始化配置文件和示例项目')
      .option('-f, --force', '强制覆盖已存在的文件')
      .option('--example', '创建示例项目')
      .action(async (options) => {
        await this.handleInitCommand(options);
      });

    // 统计命令
    this.program
      .command('stats')
      .description('显示项目i18n统计信息')
      .option('-c, --config <path>', '指定配置文件路径', 'ci.yaml')
      .action(async (options) => {
        await this.handleStatsCommand(options);
      });

    // 默认命令（扫描）
    this.program
      .action(async (options) => {
        await this.handleScanCommand({ config: 'ci.yaml', ...options });
      });
  }

  /**
   * 处理扫描命令
   * @param {Object} options - 命令选项
   */
  async handleScanCommand(options) {
    try {
      console.log(chalk.blue.bold('🚀 i18n中文词条扫描器'));
      console.log(chalk.gray(`版本: ${packageJson.version}\n`));

      // 检查Go环境
      if (!await I18nScanner.validateGoEnvironment()) {
        console.error(chalk.red('❌ 未检测到Go环境，请确保已安装Go并添加到PATH'));
        process.exit(1);
      }

      // 创建扫描器实例
      const scanner = new I18nScanner(options.config);
      
      // 执行扫描
      const scanOptions = {
        output: !options.noOutput,
        excludeTranslated: !options.includeTranslated
      };
      
      // 如果指定了输出选项，覆盖配置
      if (options.output || options.format) {
        await scanner.initialize();
        const config = scanner.configManager.getConfig();
        
        if (options.output) {
          config.output_config = config.output_config || {};
          config.output_config.output_file = path.resolve(options.output);
        }
        
        if (options.format) {
          config.output_config = config.output_config || {};
          config.output_config.format = options.format;
        }
      }
      
      const result = await scanner.scan(scanOptions);
      
      // 显示详细信息
      if (options.verbose && result.terms.length > 0) {
        console.log(chalk.blue('\n📝 提取的中文词条:'));
        result.terms.slice(0, 10).forEach((term, index) => {
          console.log(`   ${index + 1}. "${chalk.yellow(term.text)}" - ${chalk.gray(path.basename(term.file))}`);
        });
        
        if (result.terms.length > 10) {
          console.log(chalk.gray(`   ... 还有 ${result.terms.length - 10} 个词条`));
        }
      }
      
      console.log(chalk.green('\n✅ 扫描完成'));
      
    } catch (error) {
      console.error(chalk.red(`❌ 扫描失败: ${error.message}`));
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  /**
   * 处理验证命令
   * @param {Object} options - 命令选项
   */
  async handleValidateCommand(options) {
    try {
      console.log(chalk.blue('🔍 正在验证环境和配置...'));
      
      // 验证Go环境
      const goAvailable = await I18nScanner.validateGoEnvironment();
      console.log(`Go环境: ${goAvailable ? chalk.green('✅ 可用') : chalk.red('❌ 不可用')}`);
      
      // 验证配置文件
      const configValid = await ConfigManager.validateConfigFile(options.config);
      console.log(`配置文件: ${configValid ? chalk.green('✅ 有效') : chalk.red('❌ 无效')}`);
      
      if (configValid) {
        const configManager = new ConfigManager(options.config);
        await configManager.loadConfig();
        
        const scanConfig = configManager.getScanConfig();
        console.log(`扫描目录: ${chalk.cyan(scanConfig.source_dirs.length)} 个`);
        
        const translatedFiles = configManager.getTranslatedFiles();
        const translatedCount = Object.keys(translatedFiles).length;
        console.log(`翻译文件: ${chalk.cyan(translatedCount)} 个`);
      }
      
      const allValid = goAvailable && configValid;
      console.log(`\n总体状态: ${allValid ? chalk.green('✅ 就绪') : chalk.red('❌ 需要修复')}`);
      
      if (!allValid) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ 验证失败: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * 处理初始化命令
   * @param {Object} options - 命令选项
   */
  async handleInitCommand(options) {
    try {
      console.log(chalk.blue('🔧 正在初始化项目...'));
      
      if (options.example) {
        // 创建示例项目
        const examplePath = './i18nscan-example';
        if (await fs.pathExists(examplePath) && !options.force) {
          console.error(chalk.red(`❌ 目录已存在: ${examplePath}，使用 --force 强制覆盖`));
          process.exit(1);
        }
        
        await I18nScanner.createExample(examplePath);
      } else {
        // 创建配置文件
        const configPath = './ci.yaml';
        if (await fs.pathExists(configPath) && !options.force) {
          console.error(chalk.red(`❌ 配置文件已存在: ${configPath}，使用 --force 强制覆盖`));
          process.exit(1);
        }
        
        await ConfigManager.createDefaultConfig(configPath);
        
        // 创建基础目录结构
        await fs.ensureDir('./locales');
        console.log(chalk.green('✅ 已创建 locales 目录'));
        
        // 创建示例翻译文件
        const zhCnPath = './locales/zh-CN.json';
        if (!await fs.pathExists(zhCnPath)) {
          await fs.writeJson(zhCnPath, {}, { spaces: 2 });
          console.log(chalk.green('✅ 已创建示例翻译文件'));
        }
      }
      
      console.log(chalk.green('\n✅ 初始化完成'));
      console.log(chalk.cyan('💡 运行 "i18nscan" 开始扫描'));
      
    } catch (error) {
      console.error(chalk.red(`❌ 初始化失败: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * 处理统计命令
   * @param {Object} options - 命令选项
   */
  async handleStatsCommand(options) {
    try {
      console.log(chalk.blue('📊 正在分析项目i18n统计...'));
      
      const scanner = new I18nScanner(options.config);
      const result = await scanner.scan({ output: false });
      
      // 按文件统计
      const fileStats = {};
      result.terms.forEach(term => {
        const file = path.basename(term.file);
        fileStats[file] = (fileStats[file] || 0) + 1;
      });
      
      console.log(chalk.blue('\n📁 按文件统计:'));
      Object.entries(fileStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([file, count]) => {
          console.log(`   ${chalk.cyan(file)}: ${chalk.yellow(count)} 个词条`);
        });
      
      // 词条长度统计
      const lengths = result.terms.map(term => term.text.length);
      if (lengths.length > 0) {
        const avgLength = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1);
        const maxLength = Math.max(...lengths);
        const minLength = Math.min(...lengths);
        
        console.log(chalk.blue('\n📏 词条长度统计:'));
        console.log(`   平均长度: ${chalk.cyan(avgLength)} 字符`);
        console.log(`   最长词条: ${chalk.cyan(maxLength)} 字符`);
        console.log(`   最短词条: ${chalk.cyan(minLength)} 字符`);
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ 统计失败: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * 运行CLI程序
   */
  run() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error(chalk.red(`❌ 未捕获的异常: ${error.message}`));
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error(chalk.red(`❌ 未处理的Promise拒绝: ${reason}`));
      process.exit(1);
    });
    
    // 解析命令行参数
    this.program.parse(process.argv);
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new I18nScannerCLI();
  cli.run();
}

module.exports = I18nScannerCLI;