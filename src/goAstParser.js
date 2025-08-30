const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Go AST解析器类
 * 负责解析Go源代码文件，提取AST结构信息
 */
class GoAstParser {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }
  
  /**
   * 确保临时目录存在
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 解析Go文件的AST结构
   * @param {string} filePath - Go文件路径
   * @returns {Promise<Object>} AST解析结果
   */
  async parseFile(filePath) {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 复制Go文件到临时目录
      const fileName = path.basename(filePath);
      const tempFilePath = path.join(this.tempDir, fileName);
      await fs.copyFile(filePath, tempFilePath);
      
      // 生成Go脚本内容
      const goScript = this.generateGoScript([fileName]);
      
      // 创建临时Go文件
      const tempGoFile = path.join(this.tempDir, 'ast_parser.go');
      await fs.writeFile(tempGoFile, goScript);
      
      // 执行Go脚本
      const result = await this.executeGoScript(tempGoFile, [fileName]);
      return result;
    } catch (error) {
      throw new Error(`解析Go文件失败: ${error.message}`);
    } finally {
      // 清理临时文件
      await this.cleanup();
    }
  }

  /**
   * 批量解析多个Go文件
   * @param {string[]} filePaths - Go文件路径数组
   * @returns {Promise<Object[]>} AST解析结果数组
   */
  async parseFiles(filePaths) {
    const results = [];
    for (const filePath of filePaths) {
      try {
        const ast = await this.parseFile(filePath);
        results.push({
          file: filePath,
          ast: ast,
          success: true
        });
      } catch (error) {
        results.push({
          file: filePath,
          error: error.message,
          success: false
        });
      }
    }
    return results;
  }

  /**
   * 生成Go AST解析脚本
   * @param {string[]} filePaths - Go文件路径列表
   * @returns {string} Go脚本内容
   */
  generateGoScript(filePaths) {
    // 只使用文件名，不使用完整路径
    const fileList = filePaths.map(f => `"${path.basename(f)}"`).join(', ');
    
    return `package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
)

type ASTResult struct {
	File     string      \`json:"file"\`
	Package  string      \`json:"package"\`
	Imports  []string    \`json:"imports"\`
	Functions []Function \`json:"functions"\`
	Calls    []CallExpr  \`json:"calls"\`
}

type Function struct {
	Name string \`json:"name"\`
	Pos  int    \`json:"pos"\`
	End  int    \`json:"end"\`
}

type CallExpr struct {
	Function string   \`json:"function"\`
	Args     []string \`json:"args"\`
	Pos      int      \`json:"pos"\`
	End      int      \`json:"end"\`
}

func main() {
	files := []string{${fileList}}
	results := make([]ASTResult, 0)
	
	for _, filename := range files {
		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing %s: %v\\n", filename, err)
			continue
		}
		
		result := ASTResult{
			File:      filename,
			Package:   node.Name.Name,
			Imports:   make([]string, 0),
			Functions: make([]Function, 0),
			Calls:     make([]CallExpr, 0),
		}
		
		// 提取导入
		for _, imp := range node.Imports {
			if imp.Path != nil {
				result.Imports = append(result.Imports, imp.Path.Value)
			}
		}
		
		// 遍历AST节点
		ast.Inspect(node, func(n ast.Node) bool {
			switch x := n.(type) {
			case *ast.FuncDecl:
				if x.Name != nil {
					result.Functions = append(result.Functions, Function{
						Name: x.Name.Name,
						Pos:  int(x.Pos()),
						End:  int(x.End()),
					})
				}
			case *ast.CallExpr:
				funcName := ""
				switch fun := x.Fun.(type) {
				case *ast.Ident:
					funcName = fun.Name
				case *ast.SelectorExpr:
					if ident, ok := fun.X.(*ast.Ident); ok {
						funcName = ident.Name + "." + fun.Sel.Name
					}
				}
				
				args := make([]string, 0)
				for _, arg := range x.Args {
					switch a := arg.(type) {
					case *ast.BasicLit:
						args = append(args, a.Value)
					case *ast.BinaryExpr:
						// 处理字符串拼接
						args = append(args, "BINARY_EXPR")
					default:
						args = append(args, "COMPLEX_EXPR")
					}
				}
				
				result.Calls = append(result.Calls, CallExpr{
					Function: funcName,
					Args:     args,
					Pos:      int(x.Pos()),
					End:      int(x.End()),
				})
			}
			return true
		})
		
		results = append(results, result)
	}
	
	// 输出JSON结果
	output, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling JSON: %v\\n", err)
		os.Exit(1)
	}
	
	fmt.Print(string(output))
}`;
  }

  /**
   * 执行Go脚本
   * @param {string} scriptPath - Go脚本路径
   * @param {string[]} filePaths - 要解析的Go文件路径列表
   * @returns {Promise<Object>} 解析结果
   */
  async executeGoScript(scriptPath, filePaths) {
    return new Promise((resolve, reject) => {
      const goProcess = spawn('go', ['run', 'ast_parser.go', ...filePaths], {
        cwd: this.tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      goProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      goProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      goProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Go脚本执行失败: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`解析JSON结果失败: ${error.message}`));
        }
      });
      
      goProcess.on('error', (error) => {
        reject(new Error(`启动Go进程失败: ${error.message}`));
      });
    });
  }

  /**
   * 清理临时文件
   */
  async cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        await fs.remove(this.tempDir);
      }
    } catch (error) {
      console.warn(`清理临时文件失败: ${error.message}`);
    }
  }
}

module.exports = GoAstParser;