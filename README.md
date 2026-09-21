# Feather Markdown

一个以 **轻量** 为第一目标的 Markdown 阅读与编辑器。Go 服务端零第三方依赖，发布包设有 **10 MiB 硬门禁**；界面可作为 PWA 运行在 Windows、macOS、iOS 和 Android。

## 功能

- 编辑即预览，约 140ms 防抖刷新
- 自动生成文档大纲，点击标题即可导航
- 浅色、深色、跟随系统三种主题
- 内置编辑器、格式工具栏、滚动同步和快捷键
- KaTeX 数学公式：`$...$`、`$$...$$`、`\(...\)`、`\[...\]`
- Mermaid 流程图、时序图、状态图等
- 从浏览器打开/保存 Markdown，内容自动保存在本机
- 使用 `-file` 时自动保存指定磁盘文件，并每 1.2 秒感知外部更新
- 可安装 PWA，窄屏下提供编辑、预览、大纲三个独立视图
- Markdown HTML 经 DOMPurify 清理，Mermaid 使用严格安全模式

## 运行

从 [Releases](../../releases) 下载当前平台的单文件程序，双击运行，或在终端执行：

```powershell
./feather-markdown-windows-amd64.exe
```

打开并持续同步一个文件：

```powershell
./feather-markdown-windows-amd64.exe -file README.md
```

默认地址是 `http://127.0.0.1:4587`。可用参数：

```text
-addr string   监听地址（默认 127.0.0.1:4587）
-file string   要打开、监听和保存的 Markdown 文件
-open          启动后打开浏览器（默认 true）
-version       显示版本
```

## iOS / Android

移动端有两种用法：

1. 在同一局域网的电脑上运行 `feather-markdown -addr 0.0.0.0:4587`，手机访问 `http://电脑IP:4587`。
2. 将 `web/` 目录部署到任意 HTTPS 静态托管，在 Safari/Chrome 中“添加到主屏幕”。纯静态模式使用浏览器本地存储及打开/下载文件，不依赖 Go API。

第二种方式的安装体验最好。iOS/Android 端不捆绑 WebView，因此安装体积仍然很小。

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
| 缩进 | `Tab` | `Tab` |

## 体积策略

Go 程序采用 `-trimpath -ldflags="-s -w -buildid="` 构建。Marked、DOMPurify、KaTeX 和 Mermaid 固定版本并由 CDN 首次加载，Service Worker 随后缓存，因此它们不会膨胀发布程序；第一次完整渲染这些扩展需要联网。CDN 暂不可用时，编辑器仍会显示内置基础预览。

## 技术结构

```text
main.go            Go HTTP 服务、文件读写、静态资源嵌入
web/app.js         编辑、渲染、大纲、主题、文件与 PWA 逻辑
web/app.css        桌面/移动响应式界面与阅读主题
web/service-worker.js
scripts/           跨平台构建及 10 MiB 门禁
```
