<div align="center">
  <img src="web/icon-512.png" width="112" height="112" alt="Feather Markdown logo">
  <h1>Feather Markdown</h1>
  <p><strong>A tiny, read-first Markdown viewer with an editor when you need one.</strong></p>
  <p>Native windows · Live preview · Outline · LaTeX · Mermaid</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p>
    <a href="https://github.com/HaoqiWan/feather-markdown/releases/latest"><img src="https://img.shields.io/github/v/release/HaoqiWan/feather-markdown?style=flat-square&color=2f6f5e" alt="Latest release"></a>
    <a href="https://github.com/HaoqiWan/feather-markdown/actions/workflows/release.yml"><img src="https://github.com/HaoqiWan/feather-markdown/actions/workflows/release.yml/badge.svg" alt="Release build"></a>
    <img src="https://img.shields.io/badge/package-%3C%2010%20MiB-e1a85f?style=flat-square" alt="Package size under 10 MiB">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-59615d?style=flat-square" alt="Supported platforms">
  </p>
  <p>
    <a href="https://github.com/HaoqiWan/feather-markdown/releases/latest"><strong>Download the latest release</strong></a>
    · <a href="#build-from-source">Build from source</a>
  </p>
</div>

![Feather Markdown application preview](docs/app-preview.png)

Feather Markdown is designed around one constraint: **every release asset must stay below 10 MiB**. It embeds the UI in a small Go binary and reuses the system WebView instead of shipping Chromium. The default workspace shows the document outline and rendered page; the editor stays out of the way until you open it.

## Highlights

| | |
| --- | --- |
| **Read-first workspace** | Outline and preview are visible by default; toggle the editor with one click. |
| **Live rendering** | Markdown updates after a short 140 ms debounce, with synchronized editor and preview scrolling. |
| **Rich Markdown** | GFM tables, task lists, KaTeX math, LaTeX delimiters, and Mermaid diagrams. |
| **Adaptive layout** | Drag desktop dividers, wrap the formatting toolbar, and scroll wide tables without breaking the page. |
| **Native app shells** | WebView2 on Windows, WKWebView on Apple platforms, and Android WebView on Android. |
| **Local-file workflow** | Open and save on every platform; desktop builds can also use a local folder as a nested notes workspace. |
| **Complete export** | Export portable Markdown, print, PDF, or a long PNG while keeping local images in standard relative paths. |

Also included: Chinese/English switching, multiple reading styles, customizable shortcuts, Mermaid templates, an automatically generated outline, a complete formatting toolbar, responsive mobile tabs, sanitized Markdown HTML, and the cross-platform feather icon.

> Workspaces are a desktop feature. Android and iOS keep the lighter single-document workflow and do not show workspace controls.

The repository also includes a standalone WeChat Mini Program. It opens in preview mode, replaces the preview with the editor when requested, and returns to the rendered document when editing is complete. See [`wechat-miniprogram/`](wechat-miniprogram/).

## Downloads

Each release contains exactly ten assets—portable archives or installers for desktop and mobile platforms.

| Platform | Portable / app archive | Installer | Notes |
| --- | --- | --- | --- |
| Windows x64 | `windows-x64-portable.zip` | `windows-x64-setup.exe` | Uses the installed WebView2 Runtime. |
| macOS Universal | `macos-universal-app.zip` | `macos-universal.dmg` | Includes Intel and Apple Silicon binaries. |
| Android | `android-app.zip` | `android.apk` | APK is signed with the project's release key. |
| Linux | `linux-x64.tar.gz` | `linux-arm64.tar.gz` | Requires the system WebKit/WebView runtime. |
| iOS / iPadOS | `ios-app-unsigned.zip` | `ios-unsigned.ipa` | Requires signing with your Apple certificate before installation. |

> [!NOTE]
> The current Windows binary is not Authenticode-signed, the macOS app is ad-hoc signed but not notarized, and the iOS package is unsigned. Your operating system may display an installation warning.

## Quick start

Download your platform package from [GitHub Releases](https://github.com/HaoqiWan/feather-markdown/releases/latest), then launch the native application. There is no browser address bar and no separate server to configure.

To open, watch, and save a specific file on desktop:

```powershell
./FeatherMarkdown.exe -file README.md
```

```bash
./FeatherMarkdown -file README.md
```

<details>
<summary>Command-line options</summary>

```text
-addr string   Internal listen address (default: 127.0.0.1:0)
-browser       Open the UI in the default browser (debug/share mode)
-debug         Enable desktop WebView developer tools
-file string   Open, watch, and save a Markdown file
-version       Print the application version
```

</details>

## Keyboard shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Save | `Ctrl+S` | `⌘S` |
| Open | `Ctrl+O` | `⌘O` |
| New document | `Ctrl+N` | `⌘N` |
| Toggle fullscreen | `F11` | `F11` |
| Show / hide editor | `Ctrl+Shift+E` | `⌘⇧E` |
| Insert indentation | `Tab` | `Tab` |

Desktop panel dividers also support arrow keys. Hold `Shift` for larger steps, or double-click a divider to restore its default width.

## Build from source

Desktop builds require Go 1.24 or newer. The scripts test the project, build supported desktop targets, strip debug data, and fail if any executable exceeds 10 MiB.

```powershell
git clone https://github.com/HaoqiWan/feather-markdown.git
cd feather-markdown
go test ./...
./scripts/build.ps1 -Version dev
```

```bash
git clone https://github.com/HaoqiWan/feather-markdown.git
cd feather-markdown
go test ./...
./scripts/build.sh dev
```

Additional mobile requirements:

- **Android:** JDK 17, Android SDK 35, and Gradle 8.9.
- **iOS:** macOS with Xcode and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

The complete five-platform packaging process lives in [`.github/workflows/release.yml`](.github/workflows/release.yml).

## How it stays small

- Go binaries are built with `-trimpath` and stripped linker flags.
- Desktop applications reuse the operating system WebView.
- Marked, DOMPurify, KaTeX, and Mermaid are version-pinned and loaded from a CDN, then cached by the service worker.
- A basic built-in renderer remains available if the CDN cannot be reached.

The first complete rendering of math and Mermaid content requires an internet connection. Normal document content and previously cached assets remain local.

## Architecture

```text
Go host
├─ local HTTP server and file synchronization
├─ embedded responsive web UI
└─ native desktop window
   ├─ Windows: WebView2
   ├─ macOS: WKWebView
   └─ Linux: system WebKit/WebView backend

Mobile shells
├─ Android: Java + Android WebView
└─ iOS: Swift + WKWebView
```

Important paths:

| Path | Purpose |
| --- | --- |
| `main.go` | Local server, file I/O, and application lifecycle |
| `desktop_*.go` | Native desktop window and platform integration |
| `web/` | Viewer, editor, themes, outline, math, Mermaid, and PWA assets |
| `mobile/android/` | Native Android application |
| `mobile/ios/` | Native iOS/iPadOS application |
| `wechat-miniprogram/` | Single-document WeChat Mini Program |
| `packaging/` | Windows installer and macOS bundle assets |
| `scripts/` | Reproducible builds, icon generation, and size checks |

## Security and privacy

- The internal desktop server binds to `127.0.0.1` by default.
- Rendered Markdown is sanitized with DOMPurify.
- Mermaid runs in strict security mode.
- Documents stay on the device unless their content references a remote resource.

## Contributing

Bug reports, focused pull requests, and platform testing feedback are welcome. Please include your operating system, app version, and a minimal Markdown sample when reporting a rendering issue.
