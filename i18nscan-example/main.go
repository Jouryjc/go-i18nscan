package main

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
