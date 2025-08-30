const ConfigManager = require('../src/configManager');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * ConfigManager 测试用例
 */
describe('ConfigManager', () => {
  const testConfigDir = path.join(__dirname, 'fixtures');
  const testConfigPath = path.join(testConfigDir, 'test-ci.yaml');
  
  beforeAll(async () => {
    // 创建测试目录和配置文件
    await fs.ensureDir(testConfigDir);
    
    const testConfig = {
      i18n_functions: [
        { name: 't', description: '基础翻译函数' },
        { name: 'i18n.T', description: 'i18n包翻译函数' }
      ],
      translated_files: {
        zh_cn: './locales/zh-CN.json',
        en_us: './locales/en-US.json'
      },
      scan_config: {
        source_dirs: ['./src', './internal'],
        exclude_dirs: ['./vendor'],
        file_extensions: ['.go'],
        recursive: true
      },
      output_config: {
        output_file: './output.json',
        format: 'json',
        include_location: true,
        deduplicate: true
      },
      chinese_detection: {
        unicode_ranges: ['\\u4e00-\\u9fff'],
        min_chinese_chars: 1
      }
    };
    
    await fs.writeFile(testConfigPath, yaml.dump(testConfig));
  });
  
  afterAll(async () => {
    // 清理测试文件
    await fs.remove(testConfigDir);
  });
  
  describe('构造函数和初始化', () => {
    test('应该能够创建ConfigManager实例', () => {
      const manager = new ConfigManager(testConfigPath);
      expect(manager).toBeInstanceOf(ConfigManager);
      expect(manager.configPath).toBe(testConfigPath);
    });
    
    test('应该能够自动查找配置文件', () => {
      // 在当前目录创建临时配置文件
      const tempConfigPath = path.join(process.cwd(), 'ci.yaml');
      
      beforeEach(async () => {
        await fs.writeFile(tempConfigPath, 'test: true');
      });
      
      afterEach(async () => {
        await fs.remove(tempConfigPath);
      });
      
      const manager = new ConfigManager();
      expect(manager.configPath).toBe(path.resolve(tempConfigPath));
    });
  });
  
  describe('配置加载', () => {
    test('应该能够成功加载有效的配置文件', async () => {
      const manager = new ConfigManager(testConfigPath);
      const config = await manager.loadConfig();
      
      expect(config).toBeDefined();
      expect(config.i18n_functions).toHaveLength(2);
      expect(config.scan_config.source_dirs).toContain('./src');
    });
    
    test('加载不存在的配置文件应该抛出错误', async () => {
      const manager = new ConfigManager('/nonexistent/config.yaml');
      
      await expect(manager.loadConfig()).rejects.toThrow('配置文件不存在');
    });
    
    test('加载无效YAML应该抛出错误', async () => {
      const invalidConfigPath = path.join(testConfigDir, 'invalid.yaml');
      await fs.writeFile(invalidConfigPath, 'invalid: yaml: content: [');
      
      const manager = new ConfigManager(invalidConfigPath);
      await expect(manager.loadConfig()).rejects.toThrow();
      
      await fs.remove(invalidConfigPath);
    });
  });
  
  describe('配置验证', () => {
    test('应该验证必需的配置节', async () => {
      const incompleteConfig = { i18n_functions: [] };
      const incompleteConfigPath = path.join(testConfigDir, 'incomplete.yaml');
      await fs.writeFile(incompleteConfigPath, yaml.dump(incompleteConfig));
      
      const manager = new ConfigManager(incompleteConfigPath);
      
      // 应该能够加载，但会有警告
      const config = await manager.loadConfig();
      expect(config).toBeDefined();
      
      await fs.remove(incompleteConfigPath);
    });
    
    test('应该验证i18n_functions格式', async () => {
      const invalidConfig = {
        i18n_functions: 'not an array'
      };
      const invalidConfigPath = path.join(testConfigDir, 'invalid-functions.yaml');
      await fs.writeFile(invalidConfigPath, yaml.dump(invalidConfig));
      
      const manager = new ConfigManager(invalidConfigPath);
      await expect(manager.loadConfig()).rejects.toThrow('i18n_functions 必须是数组格式');
      
      await fs.remove(invalidConfigPath);
    });
  });
  
  describe('配置获取方法', () => {
    let manager;
    
    beforeEach(async () => {
      manager = new ConfigManager(testConfigPath);
      await manager.loadConfig();
    });
    
    test('getI18nFunctions应该返回i18n函数列表', () => {
      const functions = manager.getI18nFunctions();
      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe('t');
      expect(functions[1].name).toBe('i18n.T');
    });
    
    test('getScanConfig应该返回扫描配置', () => {
      const scanConfig = manager.getScanConfig();
      expect(scanConfig.source_dirs).toContain('./src');
      expect(scanConfig.file_extensions).toContain('.go');
      expect(scanConfig.recursive).toBe(true);
    });
    
    test('getTranslatedFiles应该返回翻译文件映射', () => {
      const translatedFiles = manager.getTranslatedFiles();
      expect(translatedFiles.zh_cn).toBeDefined();
      expect(translatedFiles.en_us).toBeDefined();
    });
    
    test('getOutputConfig应该返回输出配置', () => {
      const outputConfig = manager.getOutputConfig();
      expect(outputConfig.format).toBe('json');
      expect(outputConfig.include_location).toBe(true);
      expect(outputConfig.deduplicate).toBe(true);
    });
    
    test('getChineseDetectionConfig应该返回中文检测配置', () => {
      const chineseConfig = manager.getChineseDetectionConfig();
      expect(chineseConfig.unicode_ranges).toContain('\\u4e00-\\u9fff');
      expect(chineseConfig.min_chinese_chars).toBe(1);
    });
  });
  
  describe('静态方法', () => {
    test('createDefaultConfig应该创建默认配置文件', async () => {
      const defaultConfigPath = path.join(testConfigDir, 'default.yaml');
      
      await ConfigManager.createDefaultConfig(defaultConfigPath);
      
      expect(await fs.pathExists(defaultConfigPath)).toBe(true);
      
      const content = await fs.readFile(defaultConfigPath, 'utf8');
      const config = yaml.load(content);
      
      expect(config.i18n_functions).toBeDefined();
      expect(config.scan_config).toBeDefined();
      
      await fs.remove(defaultConfigPath);
    });
    
    test('validateConfigFile应该验证配置文件', async () => {
      const isValid = await ConfigManager.validateConfigFile(testConfigPath);
      expect(isValid).toBe(true);
      
      const isInvalid = await ConfigManager.validateConfigFile('/nonexistent.yaml');
      expect(isInvalid).toBe(false);
    });
  });
});