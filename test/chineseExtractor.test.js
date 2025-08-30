const ChineseExtractor = require('../src/chineseExtractor');

/**
 * ChineseExtractor 测试用例
 */
describe('ChineseExtractor', () => {
  let extractor;
  let mockConfig;
  
  beforeEach(() => {
    mockConfig = {
      i18n_functions: [
        { name: 't', description: '基础翻译函数' },
        { name: 'i18n.T', description: 'i18n包翻译函数' },
        { name: 'Translate', description: '自定义翻译函数' }
      ],
      chinese_detection: {
        unicode_ranges: ['\\u4e00-\\u9fff', '\\u3400-\\u4dbf'],
        min_chinese_chars: 1,
        ignore_numbers_only: true
      },
      output_config: {
        deduplicate: true
      }
    };
    
    extractor = new ChineseExtractor(mockConfig);
  });
  
  describe('构造函数和初始化', () => {
    test('应该能够创建ChineseExtractor实例', () => {
      expect(extractor).toBeInstanceOf(ChineseExtractor);
      expect(extractor.config).toBe(mockConfig);
    });
    
    test('应该正确构建中文正则表达式', () => {
      expect(extractor.chineseRegex).toBeInstanceOf(RegExp);
      expect(extractor.chineseRegex.global).toBe(true);
    });
    
    test('应该正确构建函数匹配模式', () => {
      expect(extractor.functionPatterns).toHaveLength(3);
      expect(extractor.functionPatterns[0].test('t')).toBe(true);
      expect(extractor.functionPatterns[1].test('i18n.T')).toBe(true);
      expect(extractor.functionPatterns[2].test('Translate')).toBe(true);
    });
  });
  
  describe('中文检测', () => {
    test('containsChinese应该正确识别中文字符', () => {
      expect(extractor.containsChinese('你好世界')).toBe(true);
      expect(extractor.containsChinese('Hello 世界')).toBe(true);
      expect(extractor.containsChinese('Hello World')).toBe(false);
      expect(extractor.containsChinese('123456')).toBe(false);
      expect(extractor.containsChinese('')).toBe(false);
      expect(extractor.containsChinese(null)).toBe(false);
    });
    
    test('应该根据最小中文字符数进行过滤', () => {
      const configWithMinChars = {
        ...mockConfig,
        chinese_detection: {
          ...mockConfig.chinese_detection,
          min_chinese_chars: 2
        }
      };
      
      const extractorWithMinChars = new ChineseExtractor(configWithMinChars);
      
      expect(extractorWithMinChars.containsChinese('你')).toBe(false);
      expect(extractorWithMinChars.containsChinese('你好')).toBe(true);
    });
  });
  
  describe('i18n函数识别', () => {
    test('isI18nFunction应该正确识别i18n函数', () => {
      expect(extractor.isI18nFunction('t')).toBe(true);
      expect(extractor.isI18nFunction('i18n.T')).toBe(true);
      expect(extractor.isI18nFunction('Translate')).toBe(true);
      expect(extractor.isI18nFunction('fmt.Println')).toBe(false);
      expect(extractor.isI18nFunction('log.Info')).toBe(false);
      expect(extractor.isI18nFunction('')).toBe(false);
      expect(extractor.isI18nFunction(null)).toBe(false);
    });
  });
  
  describe('字面量中文提取', () => {
    test('extractChineseFromLiteral应该正确提取字面量中的中文', () => {
      expect(extractor.extractChineseFromLiteral('"你好世界"')).toBe('你好世界');
      expect(extractor.extractChineseFromLiteral("'欢迎使用'")).toBe('欢迎使用');
      expect(extractor.extractChineseFromLiteral('"Hello World"')).toBe(null);
      expect(extractor.extractChineseFromLiteral('"123456"')).toBe(null);
      expect(extractor.extractChineseFromLiteral('')).toBe(null);
      expect(extractor.extractChineseFromLiteral(null)).toBe(null);
    });
  });
  
  describe('AST节点中文提取', () => {
    test('extractChineseFromNode应该从BasicLit节点提取中文', () => {
      const node = {
        type: 'BasicLit',
        value: '"你好世界"',
        pos: 100,
        end: 110
      };
      
      const result = extractor.extractChineseFromNode(node);
      expect(result).toBe('你好世界');
    });
    
    test('extractChineseFromNode应该从BinaryExpr节点提取中文', () => {
      const node = {
        type: 'BinaryExpr',
        children: [
          {
            type: 'BasicLit',
            value: '"你好"',
            pos: 100,
            end: 105
          },
          {
            type: 'BasicLit',
            value: '"世界"',
            pos: 106,
            end: 110
          }
        ],
        pos: 100,
        end: 110
      };
      
      const result = extractor.extractChineseFromNode(node);
      expect(result).toBe('你好世界');
    });
    
    test('extractChineseFromNode应该处理Ident节点', () => {
      const node = {
        type: 'Ident',
        value: 'variableName',
        pos: 100,
        end: 110
      };
      
      const result = extractor.extractChineseFromNode(node);
      expect(result).toBe(null);
    });
  });
  
  describe('AST结果处理', () => {
    test('extractFromAst应该从AST结果中提取中文词条', () => {
      const astResult = {
        file: '/test/main.go',
        callExprs: [
          {
            function: 't',
            args: [
              {
                type: 'BasicLit',
                value: '"你好世界"',
                pos: 100,
                end: 110
              }
            ]
          },
          {
            function: 'fmt.Println',
            args: [
              {
                type: 'BasicLit',
                value: '"Hello World"',
                pos: 200,
                end: 210
              }
            ]
          },
          {
            function: 'i18n.T',
            args: [
              {
                type: 'BasicLit',
                value: '"欢迎使用"',
                pos: 300,
                end: 310
              }
            ]
          }
        ]
      };
      
      const result = extractor.extractFromAst(astResult);
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('你好世界');
      expect(result[0].file).toBe('/test/main.go');
      expect(result[0].position.start).toBe(100);
      expect(result[1].text).toBe('欢迎使用');
    });
    
    test('extractFromAst应该处理空的callExprs', () => {
      const astResult = {
        file: '/test/main.go',
        callExprs: []
      };
      
      const result = extractor.extractFromAst(astResult);
      expect(result).toHaveLength(0);
    });
    
    test('extractFromAst应该处理无效的AST结果', () => {
      const astResult = {
        file: '/test/main.go'
        // 缺少 callExprs
      };
      
      const result = extractor.extractFromAst(astResult);
      expect(result).toHaveLength(0);
    });
  });
  
  describe('批量处理', () => {
    test('extractFromMultipleFiles应该处理多个文件的AST结果', () => {
      const astResults = [
        {
          success: true,
          file: '/test/file1.go',
          ast: {
            file: '/test/file1.go',
            callExprs: [
              {
                function: 't',
                args: [{
                  type: 'BasicLit',
                  value: '"文件一"',
                  pos: 100,
                  end: 110
                }]
              }
            ]
          }
        },
        {
          success: true,
          file: '/test/file2.go',
          ast: {
            file: '/test/file2.go',
            callExprs: [
              {
                function: 'i18n.T',
                args: [{
                  type: 'BasicLit',
                  value: '"文件二"',
                  pos: 200,
                  end: 210
                }]
              }
            ]
          }
        },
        {
          success: false,
          file: '/test/file3.go',
          error: '解析失败'
        }
      ];
      
      const result = extractor.extractFromMultipleFiles(astResults);
      
      expect(result.terms).toHaveLength(2);
      expect(result.terms[0].text).toBe('文件一');
      expect(result.terms[1].text).toBe('文件二');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('/test/file3.go');
      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.successFiles).toBe(2);
      expect(result.summary.errorFiles).toBe(1);
    });
  });
  
  describe('去重功能', () => {
    test('deduplicateTerms应该去除重复的词条', () => {
      const terms = [
        { text: '你好世界', file: '/test/file1.go', position: { start: 100, end: 110 } },
        { text: '欢迎使用', file: '/test/file1.go', position: { start: 200, end: 210 } },
        { text: '你好世界', file: '/test/file2.go', position: { start: 300, end: 310 } }
      ];
      
      const result = extractor.deduplicateTerms(terms);
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('你好世界');
      expect(result[0].locations).toHaveLength(2);
      expect(result[1].text).toBe('欢迎使用');
    });
    
    test('当配置禁用去重时应该保留所有词条', () => {
      const configWithoutDedup = {
        ...mockConfig,
        output_config: {
          deduplicate: false
        }
      };
      
      const extractorWithoutDedup = new ChineseExtractor(configWithoutDedup);
      
      const terms = [
        { text: '你好世界', file: '/test/file1.go' },
        { text: '你好世界', file: '/test/file2.go' }
      ];
      
      const result = extractorWithoutDedup.deduplicateTerms(terms);
      expect(result).toHaveLength(2);
    });
  });
  
  describe('翻译状态检查', () => {
    test('isTermTranslated应该正确检查词条翻译状态', () => {
      const translatedData = {
        '你好世界': 'Hello World',
        '欢迎使用': 'Welcome',
        '空翻译': '',
        '空格翻译': '   '
      };
      
      expect(extractor.isTermTranslated('你好世界', translatedData)).toBe(true);
      expect(extractor.isTermTranslated('欢迎使用', translatedData)).toBe(true);
      expect(extractor.isTermTranslated('未翻译', translatedData)).toBe(false);
      expect(extractor.isTermTranslated('空翻译', translatedData)).toBe(false);
      expect(extractor.isTermTranslated('空格翻译', translatedData)).toBe(false);
    });
  });
});