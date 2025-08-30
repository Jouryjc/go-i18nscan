const fs = require('fs-extra');
const path = require('path');

/**
 * 中文词条提取器类
 * 负责从Go AST中识别i18n函数调用并提取中文词条
 */
class ChineseExtractor {
  constructor(config) {
    this.config = config;
    this.chineseRegex = this.buildChineseRegex();
    this.functionPatterns = this.buildFunctionPatterns();
  }

  /**
   * 构建中文字符正则表达式
   * @returns {RegExp} 中文字符匹配正则
   */
  buildChineseRegex() {
    const ranges = this.config.chinese_detection?.unicode_ranges || [
      '\\u4e00-\\u9fff',  // 基本汉字
      '\\u3400-\\u4dbf',  // 扩展A
      '\\uf900-\\ufaff'   // 兼容汉字
    ];
    
    const pattern = `[${ranges.join('')}]`;
    return new RegExp(pattern, 'g');
  }

  /**
   * 构建i18n函数匹配模式
   * @returns {RegExp[]} 函数匹配正则数组
   */
  buildFunctionPatterns() {
    const patterns = [];
    
    // 从配置中获取函数名
    const functionNames = this.config.i18n_functions?.map(f => f.name) || ['t', 'i18n.T', 'Translate'];
    
    // 构建精确匹配模式
    functionNames.forEach(name => {
      const escapedName = name.replace(/\./g, '\\.');
      patterns.push(new RegExp(`^${escapedName}$`));
    });
    
    return patterns;
  }

  /**
   * 从AST解析结果中提取中文词条
   * @param {Object} astResult - AST解析结果
   * @returns {Object[]} 提取的中文词条列表
   */
  extractFromAst(astResult) {
    const extractedTerms = [];
    
    if (!astResult.calls || !Array.isArray(astResult.calls)) {
      return extractedTerms;
    }

    astResult.calls.forEach(callExpr => {
      if (this.isI18nFunction(callExpr.function)) {
        const chineseTerms = this.extractChineseFromArgs(callExpr.args, astResult.file);
        extractedTerms.push(...chineseTerms);
      }
    });

    return extractedTerms;
  }

  /**
   * 判断是否为i18n函数
   * @param {string} functionName - 函数名
   * @returns {boolean} 是否为i18n函数
   */
  isI18nFunction(functionName) {
    if (!functionName) return false;
    
    return this.functionPatterns.some(pattern => pattern.test(functionName));
  }

  /**
   * 从函数参数中提取中文词条
   * @param {string[]} args - 函数参数字符串数组
   * @param {string} filePath - 文件路径
   * @returns {Object[]} 中文词条信息
   */
  extractChineseFromArgs(args, filePath) {
    const chineseTerms = [];
    
    args.forEach((arg, index) => {
      const chineseText = this.extractChineseFromLiteral(arg);
      if (chineseText) {
        chineseTerms.push({
          text: chineseText,
          file: filePath,
          position: {
            start: 0,
            end: 0
          },
          argumentIndex: index,
          extractedAt: new Date().toISOString()
        });
      }
    });

    return chineseTerms;
  }

  /**
   * 从AST节点中提取中文文本
   * @param {Object} node - AST节点
   * @returns {string|null} 提取的中文文本
   */
  extractChineseFromNode(node) {
    if (!node) return null;

    switch (node.type) {
      case 'BasicLit':
        return this.extractChineseFromLiteral(node.value);
      
      case 'BinaryExpr':
        return this.extractChineseFromBinaryExpr(node);
      
      case 'Ident':
        // 标识符通常不包含中文字面量
        return null;
      
      default:
        // 尝试从子节点中提取
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            const result = this.extractChineseFromNode(child);
            if (result) return result;
          }
        }
        return null;
    }
  }

  /**
   * 从字面量中提取中文
   * @param {string} literal - 字面量值
   * @returns {string|null} 中文文本
   */
  extractChineseFromLiteral(literal) {
    if (!literal || typeof literal !== 'string') return null;
    
    // 移除引号
    let text = literal;
    if ((text.startsWith('"') && text.endsWith('"')) || 
        (text.startsWith('\'') && text.endsWith('\''))) {
      text = text.slice(1, -1);
    }
    
    // 检查是否包含中文
    if (this.containsChinese(text)) {
      return text;
    }
    
    return null;
  }

  /**
   * 从二元表达式中提取中文（处理字符串拼接）
   * @param {Object} binaryExpr - 二元表达式节点
   * @returns {string|null} 中文文本
   */
  extractChineseFromBinaryExpr(binaryExpr) {
    if (!binaryExpr.children || binaryExpr.children.length < 2) {
      return null;
    }
    
    // 尝试拼接左右操作数
    const leftText = this.extractChineseFromNode(binaryExpr.children[0]);
    const rightText = this.extractChineseFromNode(binaryExpr.children[1]);
    
    if (leftText && rightText) {
      const combined = leftText + rightText;
      return this.containsChinese(combined) ? combined : null;
    }
    
    return leftText || rightText;
  }

  /**
   * 检查文本是否包含中文字符
   * @param {string} text - 待检查文本
   * @returns {boolean} 是否包含中文
   */
  containsChinese(text) {
    if (!text || typeof text !== 'string') return false;
    
    const matches = text.match(this.chineseRegex);
    if (!matches) return false;
    
    const minChars = this.config.chinese_detection?.min_chinese_chars || 1;
    return matches.length >= minChars;
  }

  /**
   * 批量提取多个文件的中文词条
   * @param {Object[]} astResults - 多个文件的AST解析结果
   * @returns {Object} 提取结果汇总
   */
  extractFromMultipleFiles(astResults) {
    const allTerms = [];
    const errors = [];
    const summary = {
      totalFiles: astResults.length,
      successFiles: 0,
      errorFiles: 0,
      totalTerms: 0
    };

    astResults.forEach(result => {
      if (result.success) {
        try {
          const terms = this.extractFromAst(result.ast);
          allTerms.push(...terms);
          summary.successFiles++;
          summary.totalTerms += terms.length;
        } catch (error) {
          errors.push({
            file: result.file,
            error: error.message
          });
          summary.errorFiles++;
        }
      } else {
        errors.push({
          file: result.file,
          error: result.error
        });
        summary.errorFiles++;
      }
    });

    return {
      terms: this.deduplicateTerms(allTerms),
      errors,
      summary
    };
  }

  /**
   * 去重中文词条
   * @param {Object[]} terms - 词条列表
   * @returns {Object[]} 去重后的词条列表
   */
  deduplicateTerms(terms) {
    if (!this.config.output_config?.deduplicate) {
      return terms;
    }

    const seen = new Map();
    const deduplicated = [];

    terms.forEach(term => {
      const key = term.text;
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(term);
      } else {
        // 如果已存在，可以选择合并位置信息
        const existing = deduplicated.find(t => t.text === key);
        if (existing && !existing.locations) {
          existing.locations = [{
            file: existing.file,
            position: existing.position
          }];
          delete existing.file;
          delete existing.position;
        }
        if (existing && existing.locations) {
          existing.locations.push({
            file: term.file,
            position: term.position
          });
        }
      }
    });

    return deduplicated;
  }

  /**
   * 检查词条是否已翻译
   * @param {string} term - 中文词条
   * @param {Object} translatedData - 已翻译数据
   * @returns {boolean} 是否已翻译
   */
  isTermTranslated(term, translatedData) {
    if (!translatedData || typeof translatedData !== 'object') {
      return false;
    }
    
    return translatedData.hasOwnProperty(term) && 
           translatedData[term] && 
           translatedData[term].trim() !== '';
  }

  /**
   * 过滤未翻译的词条
   * @param {Object[]} terms - 词条列表
   * @param {string} translatedFilePath - 已翻译文件路径
   * @returns {Promise<Object[]>} 未翻译的词条列表
   */
  async filterUntranslatedTerms(terms, translatedFilePath) {
    if (!translatedFilePath || !await fs.pathExists(translatedFilePath)) {
      return terms; // 如果没有翻译文件，返回所有词条
    }

    try {
      const translatedData = await fs.readJson(translatedFilePath);
      return terms.filter(term => !this.isTermTranslated(term.text, translatedData));
    } catch (error) {
      console.warn(`读取翻译文件失败: ${error.message}`);
      return terms;
    }
  }
}

module.exports = ChineseExtractor;