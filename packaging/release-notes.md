## Feather Markdown

本次版本把 Feather 从单文件阅读器扩展成完整、轻量的 Markdown 笔记与导出工具。

- 桌面端新增本机工作区：子文件夹作为分类，Markdown 文件作为笔记。
- 新增中英文、多套阅读风格、快捷键设置和 Mermaid 图表模板。
- 重做编辑工具栏、撤销与重做，并支持插入本地图片。
- 本地图片使用标准相对资源目录，Markdown 文件可移交给其他应用继续使用。
- 新增便携 Markdown、打印、PDF 和长图导出。
- 新增真正的全屏模式、退出提示和更协调的原生窗口按钮。
- 外部链接改由系统浏览器打开，不再困在 WebView 中。
- 更新为金色羽毛 Logo，并同步 Windows、macOS、Android 与 iOS 图标。
- Android 和 iOS 保持轻量单文件模式，不显示桌面工作区入口。

### 下载说明

- Windows：`portable.zip` 为免安装版，`setup.exe` 为安装程序。
- macOS：`app.zip` 为应用压缩包，`dmg` 为磁盘映像安装包。
- Linux：分别提供 x64 与 ARM64 的 `tar.gz` 压缩包。
- Android：`app.zip` 为 APK 压缩包，`apk` 可直接安装；APK 使用项目固定发布密钥签名。
- iOS：`app-unsigned.zip` 和 `unsigned.ipa` 均未包含 Apple 开发者签名。需要用自己的 Apple 开发者证书签名，或通过 AltStore、Sideloadly 等工具重签后安装。

所有桌面和移动程序都使用系统 WebView，不捆绑 Chromium。
