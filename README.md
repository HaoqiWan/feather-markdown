# Feather Markdown

一个以 **轻量** 为第一目标的 Markdown 阅读与编辑器。Windows 使用系统 WebView2、macOS 使用系统 WKWebView，双击后直接打开独立应用窗口，不显示浏览器地址栏。每个平台的发布包都有 **10 MiB 硬门禁**。

## 功能

- 编辑即预览，约 140ms 防抖刷新
- 默认显示导航与预览；点击铅笔按钮打开编辑器，并记住显示偏好
- 桌面端大纲、编辑器与预览之间的分隔线可拖动，双击恢复默认宽度
- 自动生成文档大纲，点击标题即可导航
- 浅色、深色、跟随系统三种主题
- 内置编辑器与自适应换行格式工具栏：标题、强调、列表、任务、图片、代码块、表格、分隔线、公式和 Mermaid
- KaTeX 数学公式：`$...$`、`$$...$$`、`\(...\)`、`\[...\]`
- Mermaid 流程图、时序图、状态图等
- 从浏览器打开/保存 Markdown，内容自动保存在本机
- 使用 `-file` 时自动保存指定磁盘文件，并每 1.2 秒感知外部更新
- Windows 原生 `.exe` 与 macOS `.app` 独立窗口
- iOS/Android 可安装应用，窄屏下提供编辑、预览、大纲三个独立视图
- Markdown HTML 经 DOMPurify 清理，Mermaid 使用严格安全模式

## 运行

从 [Releases](../../releases) 下载当前平台程序。Windows 双击 `.exe`，macOS 打开 `Feather Markdown.app`；两者都会显示独立应用窗口。

```powershell
./feather-markdown-windows-amd64.exe
```

打开并持续同步一个文件：

```powershell
./feather-markdown-windows-amd64.exe -file README.md
```

程序在内部自动选择一个空闲的本地端口。可用参数：

```text
-addr string   内部监听地址（默认 127.0.0.1:0，自动选空闲端口）
-browser       改用默认浏览器运行（仅用于调试或局域网共享）
-debug         启用桌面 WebView 开发者工具
-file string   要打开、监听和保存的 Markdown 文件
-version       显示版本
```

## iOS / Android

GitHub Releases 为移动端提供独立应用包：

- Android：下载 `.apk` 直接安装，或下载包含 APK 与说明的 `android-app.zip`。APK 使用项目固定密钥签名，可覆盖升级。
- iOS：提供未签名 `.ipa` 和应用 `.zip`。受 Apple 平台限制，需要使用自己的 Apple 开发者证书签名，或通过侧载工具重签后安装。

移动端分别使用 Android WebView 和 iOS WKWebView，均为无浏览器地址栏的独立应用，并支持本机文件打开与保存。

## Release 文件

每个版本固定发布 8 个文件：

| 平台 | 程序压缩包 | 安装包 |
| --- | --- | --- |
| Windows | `windows-x64-portable.zip` | `windows-x64-setup.exe` |
| macOS | `macos-universal-app.zip` | `macos-universal.dmg` |
| Android | `android-app.zip` | `android.apk` |
| iOS | `ios-app-unsigned.zip` | `ios-unsigned.ipa` |

## 从源码构建

需要 Go 1.24 或更新版本。项目仅使用标准库。

```powershell
go test ./...
./scripts/build.ps1
```

macOS/Linux：

```bash
go test ./...
./scripts/build.sh
```

构建脚本会生成 Windows、macOS、Linux 的 amd64/arm64 版本；任何文件超过 10 MiB 都会直接失败。

## 快捷键

| 操作 | Windows / Linux | macOS |
| --- | --- | --- |
| 保存 | `Ctrl+S` | `⌘S` |
| 打开 | `Ctrl+O` | `⌘O` |
| 新建 | `Ctrl+N` | `⌘N` |
| 显示/隐藏编辑器 | `Ctrl+Shift+E` | `⌘⇧E` |
| 缩进 | `Tab` | `Tab` |

## 体积策略

Go 程序采用 `-trimpath -ldflags="-s -w -buildid="` 构建，并复用系统 WebView，不打包 Chromium。Marked、DOMPurify、KaTeX 和 Mermaid 固定版本并由 CDN 首次加载，Service Worker 随后缓存，因此它们不会膨胀发布程序；第一次完整渲染这些扩展需要联网。CDN 暂不可用时，编辑器仍会显示内置基础预览。

## 技术结构

```text
main.go            Go HTTP 服务、文件读写、应用生命周期
desktop_supported.go  Windows/macOS/Linux 原生窗口入口
web/app.js         编辑、渲染、大纲、主题、文件与 PWA 逻辑
web/app.css        桌面/移动响应式界面与阅读主题
web/service-worker.js
packaging/         macOS .app 元数据
mobile/android/    Android 原生 WebView 应用
mobile/ios/        iOS Swift/WKWebView 应用
scripts/           原生程序构建及 10 MiB 门禁
```
