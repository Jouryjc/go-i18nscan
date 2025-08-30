/**
 * CI/CD 专用测试 - 只包含核心功能测试
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

describe('CI/CD 核心功能测试', () => {
  test('应该能够创建I18nScanner实例', () => {
    const scanner = new I18nScanner();
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

  test('CLI入口文件应该存在', () => {
    const cliFile = path.join(__dirname, '../bin/cli.js');
    expect(fs.existsSync(cliFile)).toBe(true);
  });

  test('主入口文件应该存在', () => {
    const indexFile = path.join(__dirname, '../src/index.js');
    expect(fs.existsSync(indexFile)).toBe(true);
  });

  test('package.json应该包含必要字段', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageJson.name).toBe('go-i18nscan');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.main).toBeDefined();
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.scripts).toHaveProperty('test');
  });
});