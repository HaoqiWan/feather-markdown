import UIKit
import WebKit
import UniformTypeIdentifiers

final class ViewController: UIViewController, WKScriptMessageHandler, UIDocumentPickerDelegate {
    private var webView: WKWebView!
    private var temporaryExportURL: URL?

    override func loadView() {
        let controller = WKUserContentController()
        controller.add(self, name: "featherOpen")
        controller.add(self, name: "featherSave")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 246 / 255, green: 244 / 255, blue: 239 / 255, alpha: 1)
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
        }
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
            showError("保存失败：\(error.localizedDescription)")
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        defer { cleanupTemporaryExport() }
        guard temporaryExportURL == nil, let url = urls.first else { return }

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
        cleanupTemporaryExport()
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
    }
}
