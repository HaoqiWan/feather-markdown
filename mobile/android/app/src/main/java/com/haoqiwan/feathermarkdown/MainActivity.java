package com.haoqiwan.feathermarkdown;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int OPEN_DOCUMENT = 1001;
    private static final int SAVE_DOCUMENT = 1002;
    private static final int MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;

    private WebView webView;
    private String pendingSaveContent = "";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new NativeBridge(), "FeatherNative");
        webView.loadUrl("file:///android_asset/index.html");

        if (Intent.ACTION_VIEW.equals(getIntent().getAction()) && getIntent().getData() != null) {
            webView.postDelayed(() -> loadDocument(getIntent().getData()), 600);
        }
    }

    public final class NativeBridge {
        @JavascriptInterface
        public void openDocument() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/*");
                startActivityForResult(intent, OPEN_DOCUMENT);
            });
        }

        @JavascriptInterface
        public void saveDocument(String name, String content) {
            pendingSaveContent = content == null ? "" : content;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/markdown");
                intent.putExtra(Intent.EXTRA_TITLE, sanitizeName(name));
                startActivityForResult(intent, SAVE_DOCUMENT);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        if (requestCode == OPEN_DOCUMENT) loadDocument(data.getData());
        if (requestCode == SAVE_DOCUMENT) saveDocument(data.getData());
    }

    private void loadDocument(Uri uri) {
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("无法打开文件");
            byte[] buffer = new byte[8192];
            int read;
            int total = 0;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > MAX_DOCUMENT_BYTES) throw new IllegalStateException("文件超过 16 MiB");
                output.write(buffer, 0, read);
            }
            String content = output.toString(StandardCharsets.UTF_8.name());
            String script = "window.featherLoadDocument(" + JSONObject.quote(content) + "," + JSONObject.quote(displayName(uri)) + ")";
            webView.post(() -> webView.evaluateJavascript(script, null));
        } catch (Exception error) {
            showError(error.getMessage());
        }
    }

    private void saveDocument(Uri uri) {
        try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) throw new IllegalStateException("无法写入文件");
            output.write(pendingSaveContent.getBytes(StandardCharsets.UTF_8));
            output.flush();
            runOnUiThread(() -> Toast.makeText(this, "文档已保存", Toast.LENGTH_SHORT).show());
        } catch (Exception error) {
            showError(error.getMessage());
        }
    }

    private String displayName(Uri uri) {
        try (android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        }
        return "文档.md";
    }

    private static String sanitizeName(String name) {
        if (name == null || name.trim().isEmpty()) return "文档.md";
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_");
        return clean.endsWith(".md") ? clean : clean + ".md";
    }

    private void showError(String message) {
        runOnUiThread(() -> Toast.makeText(this, message == null ? "操作失败" : message, Toast.LENGTH_LONG).show());
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        webView.removeJavascriptInterface("FeatherNative");
        webView.destroy();
        super.onDestroy();
    }
}
