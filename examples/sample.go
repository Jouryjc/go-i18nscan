package main

import (
	"fmt"
	"log"
)

/**
 * 示例Go文件，包含各种i18n函数调用和中文词条
 * 用于测试i18n扫描器的功能
 */

func sampleMain() {
	// 基础翻译函数调用
	fmt.Println(t("你好，世界！"))
	fmt.Println(t("欢迎使用i18n扫描器"))
	
	// i18n包的翻译函数
	message := t("用户登录成功")
	fmt.Println(message)
	
	// 自定义翻译函数
	Translate("这是一个测试消息")
	
	// 字符串拼接
	name := "张三"
	greeting := t("你好，" + name)
	fmt.Println(greeting)
	
	// 多行字符串
	longMessage := t(`这是一个
多行的中文消息
用于测试`)
	fmt.Println(longMessage)
	
	// 非i18n函数调用（应该被忽略）
	fmt.Println("这个不会被提取")
	log.Println("日志信息：系统启动")
	
	// 混合中英文
	mixedMessage := t("Error: 用户名不能为空")
	fmt.Println(mixedMessage)
	
	// 包含特殊字符
	specialMessage := t("价格：￥100.00")
	fmt.Println(specialMessage)
}

/**
 * 用户管理相关函数
 */
func handleUserLogin(username, password string) error {
	if username == "" {
		return fmt.Errorf(t("用户名不能为空"))
	}
	
	if password == "" {
		return fmt.Errorf(t("密码不能为空"))
	}
	
	// 验证用户
	if !validateUser(username, password) {
		return fmt.Errorf(t("用户名或密码错误"))
	}
	
	fmt.Println(t("登录成功"))
	return nil
}

/**
 * 商品管理相关函数
 */
func displayProduct(product Product) {
	fmt.Printf(t("商品名称：%s\n"), product.Name)
	fmt.Printf(t("商品价格：%.2f\n"), product.Price)
	fmt.Printf(t("库存数量：%d\n"), product.Stock)
	
	if product.Stock == 0 {
		fmt.Println(t("商品已售罄"))
	} else if product.Stock < 10 {
		fmt.Println(t("库存不足，请及时补货"))
	}
}

/**
 * 订单处理相关函数
 */
func processOrder(order Order) {
	fmt.Println(t("正在处理订单..."))
	
	for _, item := range order.Items {
		fmt.Printf(t("处理商品：%s，数量：%d\n"), item.Name, item.Quantity)
	}
	
	// 计算总价
	total := calculateTotal(order)
	fmt.Printf(t("订单总金额：%.2f元\n"), total)
	
	// 发送确认邮件
	emailSubject := t("订单确认")
	emailBody := t("您的订单已确认，订单号：") + order.ID
	sendEmail(order.CustomerEmail, emailSubject, emailBody)
	
	fmt.Println(t("订单处理完成"))
}

/**
 * 错误处理示例
 */
func handleError(err error) {
	switch err.Error() {
	case "network_error":
		fmt.Println(t("网络连接错误，请检查网络设置"))
	case "database_error":
		fmt.Println(t("数据库连接失败，请联系管理员"))
	case "permission_denied":
		fmt.Println(t("权限不足，无法执行此操作"))
	default:
		fmt.Println(t("未知错误：") + err.Error())
	}
}

/**
 * 配置相关函数
 */
func loadConfig() {
	fmt.Println(t("正在加载配置文件..."))
	
	// 检查配置文件
	if !fileExists("config.yaml") {
		fmt.Println(t("配置文件不存在，使用默认配置"))
		return
	}
	
	fmt.Println(t("配置文件加载成功"))
}

/**
 * 数据结构定义
 */
type Product struct {
	ID    string
	Name  string
	Price float64
	Stock int
}

type OrderItem struct {
	Name     string
	Quantity int
	Price    float64
}

type Order struct {
	ID            string
	CustomerEmail string
	Items         []OrderItem
}

/**
 * 辅助函数（不包含i18n调用）
 */
func validateUser(username, password string) bool {
	// 模拟用户验证逻辑
	return username == "admin" && password == "password"
}

func calculateTotal(order Order) float64 {
	total := 0.0
	for _, item := range order.Items {
		total += item.Price * float64(item.Quantity)
	}
	return total
}

func sendEmail(to, subject, body string) {
	// 模拟发送邮件
	fmt.Printf("发送邮件到: %s\n", to)
}

func fileExists(filename string) bool {
	// 模拟文件存在检查
	return true
}

// 基础翻译函数
func t(key string) string {
	// 模拟翻译函数
	return key
}

// 自定义翻译函数
func Translate(key string) string {
	// 模拟翻译函数
	return key
}