import UIKit
import WebKit
import UniformTypeIdentifiers

final class ViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, UIDocumentPickerDelegate {
    private var webView: WKWebView!
    private var temporaryExportURL: URL?

    override func loadView() {
        let controller = WKUserContentController()
        controller.add(self, name: "featherOpen")
        controller.add(self, name: "featherSave")
        controller.add(self, name: "featherExternal")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 243 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let webDirectory = Bundle.main.resourceURL?.appendingPathComponent("web"),
              let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            showError("应用资源缺失")
            return
        }
        webView.loadFileURL(indexURL, allowingReadAccessTo: webDirectory)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "featherOpen" {
            presentOpenPicker()
            return
        }
        if message.name == "featherSave",
           let body = message.body as? [String: Any],
           let content = body["content"] as? String {
            presentSavePicker(name: body["name"] as? String ?? "文档.md", content: content)
            return
        }
        if message.name == "featherExternal", let rawURL = message.body as? String {
            openExternal(rawURL)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard navigationAction.navigationType == .linkActivated,
              let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if isAllowedExternalURL(url) {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    private func openExternal(_ rawURL: String) {
        guard let url = URL(string: rawURL), isAllowedExternalURL(url) else {
            showError("不支持打开此类型的链接")
            return
        }
        UIApplication.shared.open(url, options: [:]) { [weak self] success in
            if !success { self?.showError("无法使用系统应用打开链接") }
        }
    }

    private func isAllowedExternalURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        return scheme == "http" || scheme == "https" || scheme == "mailto"
    }

    private func presentOpenPicker() {
        let markdown = UTType(filenameExtension: "md") ?? .plainText
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [markdown, .plainText])
        picker.delegate = self
        picker.allowsMultipleSelection = false
        present(picker, animated: true)
    }

    private func presentSavePicker(name: String, content: String) {
        do {
            let cleanName = sanitize(name: name)
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let fileURL = directory.appendingPathComponent(cleanName)
            try content.write(to: fileURL, atomically: true, encoding: .utf8)
            temporaryExportURL = directory

            let picker = UIDocumentPickerViewController(forExporting: [fileURL], asCopy: true)
            picker.delegate = self
            present(picker, animated: true)
        } catch {
            notifySaveComplete(false)
            showError("保存失败：\(error.localizedDescription)")
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        if temporaryExportURL != nil {
            cleanupTemporaryExport()
            notifySaveComplete(true)
            return
        }
        guard let url = urls.first else { return }

        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        do {
            let values = try url.resourceValues(forKeys: [.fileSizeKey])
            if (values.fileSize ?? 0) > 16 * 1024 * 1024 {
                throw NSError(domain: "FeatherMarkdown", code: 1, userInfo: [NSLocalizedDescriptionKey: "文件超过 16 MiB"])
            }
            let content = try String(contentsOf: url, encoding: .utf8)
            let script = "window.featherLoadDocument(\(json(content)),\(json(url.lastPathComponent)))"
            webView.evaluateJavaScript(script)
        } catch {
            showError("打开失败：\(error.localizedDescription)")
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        let wasSaving = temporaryExportURL != nil
        cleanupTemporaryExport()
        if wasSaving { notifySaveComplete(false) }
    }

    private func notifySaveComplete(_ success: Bool) {
        webView.evaluateJavaScript("window.featherSaveComplete(\(success ? "true" : "false"))")
    }

    private func cleanupTemporaryExport() {
        if let url = temporaryExportURL { try? FileManager.default.removeItem(at: url) }
        temporaryExportURL = nil
    }

    private func json(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
              let result = String(data: data, encoding: .utf8) else { return "\"\"" }
        return result
    }

    private func sanitize(name: String) -> String {
        let invalid = CharacterSet(charactersIn: "\\/:*?\"<>|")
        let clean = name.components(separatedBy: invalid).joined(separator: "_")
        let usable = clean.isEmpty ? "文档.md" : clean
        return usable.lowercased().hasSuffix(".md") ? usable : usable + ".md"
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Feather Markdown", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "featherOpen")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "featherSave")
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "featherExternal")
    }
}
