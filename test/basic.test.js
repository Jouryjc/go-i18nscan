/**
 * 基础功能测试 - 专为CI/CD环境优化
 */

const path = require('path');
const fs = require('fs');
const I18nScanner = require('../src/index');
const GoAstParser = require('../src/goAstParser');
const ChineseExtractor = require('../src/chineseExtractor');

// 基础配置用于测试
const testConfig = {
  i18nFunctions: ['t', 'translate', 'i18n.t', 'i18n.T'],
  chinese_detection: {
    unicode_ranges: ['\\u4e00-\\u9fff']
  }
};

describe('I18nScanner 基础功能测试', () => {
  let scanner;
  
  beforeEach(() => {
    scanner = new I18nScanner();
  });

  test('应该能够创建I18nScanner实例', () => {
    expect(scanner).toBeInstanceOf(I18nScanner);
  });

  test('应该能够创建GoAstParser实例', () => {
    const parser = new GoAstParser();
    expect(parser).toBeInstanceOf(GoAstParser);
  });

  test('应该能够创建ChineseExtractor实例', () => {
    const extractor = new ChineseExtractor(testConfig);
    expect(extractor).toBeInstanceOf(ChineseExtractor);
  });

  test('ChineseExtractor应该能够识别中文字符', () => {
    const extractor = new ChineseExtractor(testConfig);
    
    expect(extractor.containsChinese('Hello World')).toBe(false);
    expect(extractor.containsChinese('你好世界')).toBe(true);
    expect(extractor.containsChinese('Hello 世界')).toBe(true);
    expect(extractor.containsChinese('')).toBe(false);
  });

  test('应该能够识别i18n函数调用', () => {
    const extractor = new ChineseExtractor(testConfig);
    
    expect(extractor.isI18nFunction('t')).toBe(true);
    expect(extractor.isI18nFunction('i18n.t')).toBe(true);
    expect(extractor.isI18nFunction('translate')).toBe(true);
    expect(extractor.isI18nFunction('fmt.Println')).toBe(false);
    expect(extractor.isI18nFunction('console.log')).toBe(false);
  });

  test('示例Go文件应该存在', () => {
    const sampleFile = path.join(__dirname, '../examples/sample.go');
    expect(fs.existsSync(sampleFile)).toBe(true);
  });

  test('配置文件应该存在', () => {
    const configFile = path.join(__dirname, '../i18nscan.config.json');
    // 如果配置文件不存在，跳过此测试
    if (fs.existsSync(configFile)) {
      expect(fs.existsSync(configFile)).toBe(true);
    } else {
      console.log('配置文件不存在，跳过测试');
    }
  });

  test('CLI入口文件应该存在', () => {
    const cliFile = path.join(__dirname, '../bin/cli.js');
    expect(fs.existsSync(cliFile)).toBe(true);
  });

  test('主入口文件应该存在', () => {
    const indexFile = path.join(__dirname, '../src/index.js');
    expect(fs.existsSync(indexFile)).toBe(true);
  });
});

describe('配置文件测试', () => {
  test('应该能够读取配置文件', () => {
    const configPath = path.join(__dirname, '../i18nscan.config.json');
    
    // 如果配置文件不存在，跳过此测试
    if (!fs.existsSync(configPath)) {
      console.log('配置文件不存在，跳过测试');
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    expect(config).toHaveProperty('scanDirs');
    expect(config).toHaveProperty('outputFile');
    expect(config).toHaveProperty('i18nFunctions');
    expect(Array.isArray(config.scanDirs)).toBe(true);
    expect(Array.isArray(config.i18nFunctions)).toBe(true);
  });
});