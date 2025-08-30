const yaml = require('js-yaml');
const fs = require('fs-extra');
const path = require('path');

/**
 * 配置管理器类
 * 负责读取和解析ci.yaml配置文件
 */
class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || this.findConfigFile();
    this.config = null;
  }

  /**
   * 查找配置文件
   * @returns {string} 配置文件路径
   */
  findConfigFile() {
    const possiblePaths = [
      'ci.yaml',
      'ci.yml',
      '.ci.yaml',
      '.ci.yml',
      'config/ci.yaml',
      'config/ci.yml'
    ];

    for (const configPath of possiblePaths) {
      const fullPath = path.resolve(process.cwd(), configPath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error('未找到配置文件 ci.yaml，请确保配置文件存在');
  }

  /**
   * 加载配置文件
   * @returns {Promise<Object>} 配置对象
   */
  async loadConfig() {
    try {
      if (!await fs.pathExists(this.configPath)) {
        throw new Error(`配置文件不存在: ${this.configPath}`);
      }

      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = yaml.load(configContent);
      
      // 验证配置
      this.validateConfig();
      
      // 处理相对路径
      this.resolveRelativePaths();
      
      return this.config;
    } catch (error) {
      throw new Error(`加载配置文件失败: ${error.message}`);
    }
  }

  /**
   * 验证配置文件格式
   */
  validateConfig() {
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('配置文件格式无效');
    }

    // 验证必需的配置项
    const requiredSections = ['i18n_functions', 'scan_config'];
    for (const section of requiredSections) {
      if (!this.config[section]) {
        console.warn(`警告: 缺少配置节 '${section}'，将使用默认值`);
      }
    }

    // 验证i18n函数配置
    if (this.config.i18n_functions) {
      if (!Array.isArray(this.config.i18n_functions)) {
        throw new Error('i18n_functions 必须是数组格式');
      }
      
      this.config.i18n_functions.forEach((func, index) => {
        if (!func.name) {
          throw new Error(`i18n_functions[${index}] 缺少 name 字段`);
        }
      });
    }

    // 验证扫描配置
    if (this.config.scan_config) {
      if (this.config.scan_config.source_dirs && 
          !Array.isArray(this.config.scan_config.source_dirs)) {
        throw new Error('scan_config.source_dirs 必须是数组格式');
      }
    }
  }

  /**
   * 解析相对路径为绝对路径
   */
  resolveRelativePaths() {
    const configDir = path.dirname(this.configPath);
    
    // 处理翻译文件路径
    if (this.config.translated_files) {
      Object.keys(this.config.translated_files).forEach(lang => {
        const filePath = this.config.translated_files[lang];
        if (filePath && !path.isAbsolute(filePath)) {
          this.config.translated_files[lang] = path.resolve(configDir, filePath);
        }
      });
    }

    // 处理扫描目录路径
    if (this.config.scan_config?.source_dirs) {
      this.config.scan_config.source_dirs = this.config.scan_config.source_dirs.map(dir => {
        return path.isAbsolute(dir) ? dir : path.resolve(configDir, dir);
      });
    }

    // 处理排除目录路径
    if (this.config.scan_config?.exclude_dirs) {
      this.config.scan_config.exclude_dirs = this.config.scan_config.exclude_dirs.map(dir => {
        return path.isAbsolute(dir) ? dir : path.resolve(configDir, dir);
      });
    }

    // 处理输出文件路径
    if (this.config.output_config?.output_file) {
      const outputFile = this.config.output_config.output_file;
      if (!path.isAbsolute(outputFile)) {
        this.config.output_config.output_file = path.resolve(configDir, outputFile);
      }
    }
  }

  /**
   * 获取配置对象
   * @returns {Object} 配置对象
   */
  getConfig() {
    if (!this.config) {
      throw new Error('配置尚未加载，请先调用 loadConfig()');
    }
    return this.config;
  }

  /**
   * 获取i18n函数配置
   * @returns {Object[]} i18n函数列表
   */
  getI18nFunctions() {
    const config = this.getConfig();
    return config.i18n_functions || [
      { name: 't', description: '基础翻译函数' },
      { name: 'i18n.T', description: 'i18n包的翻译函数' }
    ];
  }

  /**
   * 获取扫描配置
   * @returns {Object} 扫描配置
   */
  getScanConfig() {
    const config = this.getConfig();
    return {
      source_dirs: config.scan_config?.source_dirs || ['./src'],
      exclude_dirs: config.scan_config?.exclude_dirs || ['./vendor', './node_modules'],
      file_extensions: config.scan_config?.file_extensions || ['.go'],
      recursive: config.scan_config?.recursive !== false
    };
  }

  /**
   * 获取翻译文件配置
   * @returns {Object} 翻译文件路径映射
   */
  getTranslatedFiles() {
    const config = this.getConfig();
    return config.translated_files || {};
  }

  /**
   * 获取输出配置
   * @returns {Object} 输出配置
   */
  getOutputConfig() {
    const config = this.getConfig();
    return {
      output_file: config.output_config?.output_file || './extracted_terms.json',
      format: config.output_config?.format || 'json',
      include_location: config.output_config?.include_location !== false,
      deduplicate: config.output_config?.deduplicate !== false
    };
  }

  /**
   * 获取中文检测配置
   * @returns {Object} 中文检测配置
   */
  getChineseDetectionConfig() {
    const config = this.getConfig();
    return {
      unicode_ranges: config.chinese_detection?.unicode_ranges || [
        '\\u4e00-\\u9fff',
        '\\u3400-\\u4dbf',
        '\\uf900-\\ufaff'
      ],
      min_chinese_chars: config.chinese_detection?.min_chinese_chars || 1,
      ignore_numbers_only: config.chinese_detection?.ignore_numbers_only !== false
    };
  }

  /**
   * 获取指定语言的翻译文件路径
   * @param {string} language - 语言代码
   * @returns {string|null} 翻译文件路径
   */
  getTranslatedFilePath(language = 'zh_cn') {
    const translatedFiles = this.getTranslatedFiles();
    return translatedFiles[language] || null;
  }

  /**
   * 创建默认配置文件
   * @param {string} outputPath - 输出路径
   * @returns {Promise<void>}
   */
  static async createDefaultConfig(outputPath = './ci.yaml') {
    const defaultConfig = {
      i18n_functions: [
        { name: 't', description: '基础翻译函数' },
        { name: 'i18n.T', description: 'i18n包的翻译函数' },
        { name: 'Translate', description: '自定义翻译函数' }
      ],
      function_patterns: [
        { pattern: '\\b(t|i18n\\.T|Translate)\\s*\\(', description: '匹配i18n函数调用' }
      ],
      translated_files: {
        zh_cn: './locales/zh-CN.json',
        en_us: './locales/en-US.json'
      },
      scan_config: {
        source_dirs: ['./src', './internal'],
        exclude_dirs: ['./vendor', './node_modules'],
        file_extensions: ['.go'],
        recursive: true
      },
      output_config: {
        output_file: './extracted_terms.json',
        format: 'json',
        include_location: true,
        deduplicate: true
      },
      chinese_detection: {
        unicode_ranges: ['\\u4e00-\\u9fff', '\\u3400-\\u4dbf'],
        min_chinese_chars: 1,
        ignore_numbers_only: true
      }
    };

    const yamlContent = yaml.dump(defaultConfig, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });

    await fs.writeFile(outputPath, yamlContent, 'utf8');
    console.log(`默认配置文件已创建: ${outputPath}`);
  }

  /**
   * 验证配置文件是否有效
   * @param {string} configPath - 配置文件路径
   * @returns {Promise<boolean>} 是否有效
   */
  static async validateConfigFile(configPath) {
    try {
      const manager = new ConfigManager(configPath);
      await manager.loadConfig();
      return true;
    } catch (error) {
      console.error(`配置文件验证失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = ConfigManager;