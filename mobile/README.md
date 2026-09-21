# 移动端应用壳

- `android/`：原生 Android WebView 应用，APK 使用持久化发布密钥签名。
- `ios/`：原生 Swift/WKWebView 应用。公开 CI 生成未签名 IPA，需使用 Apple 开发者证书签名或通过侧载工具重签后安装。

两端都直接打包仓库根目录的 `web/` 内容，支持本机文件选择与保存；不会打开外部浏览器窗口。
