(() => {
  'use strict';

  const nativeMobile = Boolean(window.FeatherNative?.openDocument || window.webkit?.messageHandlers?.featherOpen);
  if (nativeMobile) document.documentElement.classList.add('mobile-native');

  if (window.featherDesktopPlatform) {
    document.documentElement.classList.add('desktop-native', `desktop-native-${window.featherDesktopPlatform}`);
  }

  const preferences = window.FeatherPreferences;
  const t = (key, values) => preferences?.t(key, values) || key;

  const SAMPLE = `# 欢迎使用 Feather Markdown

一个不到 10MB 的轻量 Markdown 阅读与编辑器。默认显示左侧大纲与右侧预览，点击顶部铅笔按钮即可打开编辑器。

## 常用 Markdown

- 支持 **粗体**、*斜体*、[链接](https://commonmark.org/) 与任务列表
- [x] 实时预览
- [x] 文档大纲
- [x] 明暗主题
- [ ] 开始写你的文档

> 在桌面端使用 \`-file notes.md\` 启动，可直接保存到指定文件并感知外部修改。

## 数学公式与 LaTeX

行内公式：$E = mc^2$，独立公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \, dx = \\sqrt{\\pi}
$$

## Mermaid 图

\`\`\`mermaid
flowchart LR
    A[编辑 Markdown] --> B{实时渲染}
    B --> C[数学公式]
    B --> D[Mermaid 图]
    C --> E[完成]
    D --> E
\`\`\`

## 代码

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("轻巧，也可以很完整。")
}
\`\`\`
`;

  const $ = selector => document.querySelector(selector);
  const elements = {
    topbar: $('.topbar'),
    editor: $('#editor'),
    editorPanel: $('#editor-panel'),
    formatBar: $('.format-bar'),
    preview: $('#preview'),
    previewPanel: $('#preview-panel'),
    outline: $('#outline'),
    outlinePanel: $('#outline-panel'),
    outlineEmpty: $('#outline-empty'),
    headingCount: $('#heading-count'),
    workspaceButton: $('#workspace-button'),
    workspaceBrowser: $('#workspace-browser'),
    workspaceName: $('#workspace-name'),
    workspaceNoteCount: $('#workspace-note-count'),
    workspaceTools: $('#workspace-tools'),
    workspaceEmpty: $('#workspace-empty'),
    workspaceTree: $('#workspace-tree'),
    workspaceRefresh: $('#workspace-refresh'),
    workspaceItemDialog: $('#workspace-item-dialog'),
    workspaceItemForm: $('#workspace-item-form'),
    workspaceItemTitle: $('#workspace-item-title'),
    workspaceItemParent: $('#workspace-item-parent'),
    workspaceItemName: $('#workspace-item-name'),
    documentName: $('#document-name'),
    saveState: $('#save-state'),
    cursor: $('#cursor-position'),
    stats: $('#document-stats'),
    toast: $('#toast'),
    fileInput: $('#file-input'),
    imageInput: $('#image-input'),
    imageButton: $('#image-button'),
    imageDialog: $('#image-dialog'),
    imageFileButton: $('#image-file-button'),
    imageAltInput: $('#image-alt-input'),
    imageURLInput: $('#image-url-input'),
    insertImageURLButton: $('#insert-image-url-button'),
    saveButton: $('#save-button'),
    saveButtonLabel: $('#save-button-label'),
    exportButton: $('#export-button'),
    exportMenu: $('#export-menu'),
    themeButton: $('#theme-button'),
    settingsButton: $('#settings-button'),
    fullscreenButton: $('#fullscreen-button'),
    fullscreenIconPath: $('#fullscreen-button path'),
    fullscreenExitHint: $('#fullscreen-exit-hint'),
    windowMaximizeButton: $('#window-maximize-button'),
    editorToggleButton: $('#editor-toggle-button'),
    outlineToggleButton: $('#outline-toggle-button'),
    outlineResizer: $('#outline-resizer'),
    editorResizer: $('#editor-resizer'),
    mobileTabs: $('.mobile-tabs'),
    workspace: $('.workspace'),
    appDialog: $('#app-dialog'),
    dialogCard: $('.dialog-card'),
    dialogTitle: $('#dialog-title'),
    dialogMessage: $('#dialog-message'),
    dialogActions: $('#dialog-actions')
  };

  const startupAction = new URLSearchParams(location.search).get('startup');
  const documentStorage = startupAction === 'new' || startupAction === 'open' ? sessionStorage : localStorage;

  const PANEL_SIZES = {
    outline: { property: '--outline-width', storage: 'feather.outlineWidth', minimum: 150, initial: 220 },
    editor: { property: '--editor-width', storage: 'feather.editorWidth', minimum: 220, initial: 420 }
  };
  const PREVIEW_MINIMUM = 260;
  const RESIZER_WIDTH = 7;
  const MAX_EMBEDDED_IMAGE_BYTES = 8 * 1024 * 1024;

  const state = {
    name: '未命名.md',
    handle: null,
    serverBacked: false,
    lastSaved: '',
    lastServerModified: 0,
    renderSequence: 0,
    saveTimer: 0,
    pollTimer: 0,
    toastTimer: 0,
    mermaidReady: false,
    externalUpdateNotified: false,
    nativeSaveResolver: null,
    dialogResolver: null,
    dialogPreviousFocus: null,
    closePromptOpen: false,
    allowUnload: false,
    saveOperation: null,
    fullscreen: false,
    maximized: false,
    fullscreenHintTimer: 0,
    draftStorageWarning: false,
    history: [],
    historyIndex: -1,
    historyApplying: false,
    historyMergeKey: '',
    historyLastAt: 0,
    portableDirectoryHandle: null,
    exporting: false,
    workspacePath: '',
    workspaceLabel: '',
    workspaceFile: '',
    workspaceEntries: [],
    selectedWorkspaceFolder: '',
    workspaceOpenFolders: new Set(),
    workspaceCreateType: 'note'
  };

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function debounce(callback, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback(...args), delay);
    };
  }

  function fallbackMarkdown(source) {
    const escaped = escapeHTML(source);
    return escaped
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

  function workspaceResourcePath(href) {
    if (!state.workspaceFile || !href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/') || href.startsWith('#')) return '';
    const parts = state.workspaceFile.split('/');
    parts.pop();
    for (const part of href.replaceAll('\\', '/').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!parts.length) return '';
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    return parts.join('/');
  }

  function markdownHTML(source) {
    if (!window.marked) return fallbackMarkdown(source);
    const renderer = new window.marked.Renderer();
    renderer.code = function (token, legacyLanguage) {
      const code = typeof token === 'object' ? token.text : token;
      const language = typeof token === 'object' ? token.lang : legacyLanguage;
      if ((language || '').trim().toLowerCase() === 'mermaid') {
        return `<div class="mermaid">${escapeHTML(code)}</div>`;
      }
      const languageClass = language ? ` class="language-${escapeHTML(language)}"` : '';
      return `<pre><code${languageClass}>${escapeHTML(code)}</code></pre>\n`;
    };
    renderer.image = function (token, legacyTitle, legacyText) {
      const href = typeof token === 'object' ? token.href : token;
      const title = typeof token === 'object' ? token.title : legacyTitle;
      const text = typeof token === 'object' ? token.text : legacyText;
      const asset = String(href || '').match(/^feather-asset:([a-f0-9]{24}\.(?:png|jpg|gif|webp|svg))$/);
      const workspacePath = workspaceResourcePath(String(href || ''));
      const source = asset
        ? `/api/assets/${asset[1]}`
        : workspacePath
          ? `/api/workspace/resource?path=${encodeURIComponent(workspacePath)}`
          : String(href || '');
      const titleAttribute = title ? ` title="${escapeHTML(title)}"` : '';
      return `<img src="${escapeHTML(source)}" alt="${escapeHTML(text || '')}"${titleAttribute}>`;
    };
    return window.marked.parse(source, { gfm: true, renderer });
  }

  function slugify(text, seen) {
    let base = text.toLowerCase().trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section';
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    if (count) base += `-${count + 1}`;
    return base;
  }

  function buildOutline() {
    const headings = [...elements.preview.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    const seen = new Map();
    elements.outline.replaceChildren();
    headings.forEach(heading => {
      heading.id = slugify(heading.textContent, seen);
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.dataset.level = heading.tagName.slice(1);
      link.textContent = heading.textContent || t('unnamedHeading');
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.innerWidth <= 900) setMobilePane('preview');
      });
      elements.outline.append(link);
    });
    elements.headingCount.textContent = String(headings.length);
    elements.outlineEmpty.hidden = headings.length > 0;
  }

  function resolvedTheme() {
    if (preferences) return preferences.resolvedTheme();
    const selected = document.documentElement.dataset.theme;
    if (selected === 'dark' || selected === 'light') return selected;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  async function renderEnhancements(sequence) {
    if (window.renderMathInElement) {
      window.renderMathInElement(elements.preview, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false,
        strict: false
      });
    }

    const diagrams = [...elements.preview.querySelectorAll('.mermaid')];
    if (!window.mermaid || !diagrams.length || sequence !== state.renderSequence) return;
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: resolvedTheme() === 'dark' ? 'dark' : 'default',
        flowchart: { htmlLabels: false, useMaxWidth: true }
      });
      for (const diagram of diagrams) {
        if (sequence !== state.renderSequence) return;
        await window.mermaid.run({ nodes: [diagram], suppressErrors: true });
        if (!diagram.querySelector('svg')) {
          diagram.classList.add('render-error');
          diagram.textContent = `${t('mermaidSyntaxError')}\n\n${diagram.textContent}`;
        }
      }
    } catch (error) {
      diagrams.forEach(diagram => {
        if (!diagram.querySelector('svg')) {
          diagram.classList.add('render-error');
          diagram.textContent = t('mermaidRenderFailed', { message: error.message });
        }
      });
    }
  }

  function prepareScrollableTables() {
    elements.preview.querySelectorAll('table').forEach(table => {
      if (table.parentElement?.classList.contains('table-scroll')) return;
      const scroller = document.createElement('div');
      scroller.className = 'table-scroll';
      scroller.tabIndex = 0;
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', '可横向滚动的表格');
      table.before(scroller);
      scroller.append(table);
    });
  }

  function preparePreviewLinks() {
    elements.preview.querySelectorAll('a[href]').forEach(link => {
      const rawHref = (link.getAttribute('href') || '').trim();
      if (!rawHref || rawHref.startsWith('#')) return;
      try {
        const parsed = new URL(rawHref);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return;
        link.dataset.externalUrl = parsed.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } catch (_) {
        // Relative document links have no reliable base path in the embedded viewer.
      }
    });
  }

  async function openExternalLink(url) {
    try {
      if (typeof window.featherOpenExternal === 'function') {
        await window.featherOpenExternal(url);
        return;
      }
      if (window.FeatherNative?.openExternal) {
        window.FeatherNative.openExternal(url);
        return;
      }
      if (window.webkit?.messageHandlers?.featherExternal) {
        window.webkit.messageHandlers.featherExternal.postMessage(url);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (_) {
      showToast(t('linkOpenFailed'));
    }
  }

  function activatePreviewLink(event) {
    const link = event.target.closest?.('a[href]');
    if (!link || !elements.preview.contains(link)) return;

    const rawHref = (link.getAttribute('href') || '').trim();
    event.preventDefault();
    if (rawHref.startsWith('#')) {
      const id = decodeURIComponent(rawHref.slice(1));
      const target = id && document.getElementById(id);
      if (target && elements.preview.contains(target)) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (link.dataset.externalUrl) {
      void openExternalLink(link.dataset.externalUrl);
      return;
    }
    showToast(t('unsupportedLink'));
  }

  async function render() {
    const sequence = ++state.renderSequence;
    let html;
    try {
      html = markdownHTML(elements.editor.value);
    } catch (error) {
      html = `<pre class="render-error">${escapeHTML(error.message)}</pre>`;
    }
    elements.preview.innerHTML = window.DOMPurify
      ? window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
      : html;
    preparePreviewLinks();
    prepareScrollableTables();
    buildOutline();
    await renderEnhancements(sequence);
  }

  const scheduleRender = debounce(render, 140);

  function updateSaveButton(visualState) {
    elements.saveButton.dataset.saveVisualState = visualState;
    elements.saveButton.classList.toggle('primary', visualState === 'dirty');
    elements.saveButton.classList.toggle('is-saving', visualState === 'saving');
    elements.saveButton.classList.toggle('save-error', visualState === 'error');
    elements.saveButton.disabled = visualState === 'saving';
    elements.saveButton.setAttribute('aria-busy', String(visualState === 'saving'));
    elements.saveButtonLabel.textContent = t(visualState === 'saving' ? 'saving' : 'save');
    if (visualState === 'error') elements.saveButton.title = t('saveRetry');
  }

  function updateStatus() {
    const text = elements.editor.value;
    const beforeCursor = text.slice(0, elements.editor.selectionStart);
    const lines = beforeCursor.split('\n');
    elements.cursor.textContent = t('lineColumn', { line: lines.length, column: lines.at(-1).length + 1 });
    const lineCount = text ? text.split('\n').length : 0;
    elements.stats.textContent = t('documentStats', { characters: text.length.toLocaleString(), lines: lineCount.toLocaleString() });
    const dirty = isDocumentDirty();
    elements.saveState.textContent = t(dirty ? 'unsaved' : 'saved');
    elements.saveState.classList.toggle('dirty', dirty);
    updateSaveButton(state.saveOperation || (dirty ? 'dirty' : 'saved'));
  }

  function isDocumentDirty() {
    return elements.editor.value !== state.lastSaved;
  }

  function editorSnapshot() {
    return {
      value: elements.editor.value,
      start: elements.editor.selectionStart,
      end: elements.editor.selectionEnd,
      scrollTop: elements.editor.scrollTop
    };
  }

  function updateHistoryButtons() {
    const undoButton = document.querySelector('[data-command="undo"]');
    const redoButton = document.querySelector('[data-command="redo"]');
    if (undoButton) undoButton.disabled = state.historyIndex <= 0;
    if (redoButton) redoButton.disabled = state.historyIndex >= state.history.length - 1;
  }

  function resetEditorHistory() {
    state.history = [editorSnapshot()];
    state.historyIndex = 0;
    state.historyMergeKey = '';
    state.historyLastAt = 0;
    updateHistoryButtons();
  }

  function recordEditorHistory(inputType = 'programmatic') {
    if (state.historyApplying) return;
    const snapshot = editorSnapshot();
    const current = state.history[state.historyIndex];
    if (current?.value === snapshot.value && current.start === snapshot.start && current.end === snapshot.end) return;

    if (state.historyIndex < state.history.length - 1) {
      state.history.splice(state.historyIndex + 1);
    }

    const now = Date.now();
    const mergeKey = /^(?:insertText|insertCompositionText)$/.test(inputType)
      ? 'typing'
      : /^deleteContent/.test(inputType)
        ? inputType
        : '';
    const canMerge = mergeKey && mergeKey === state.historyMergeKey && now - state.historyLastAt < 800;

    if (canMerge) {
      state.history[state.historyIndex] = snapshot;
    } else {
      state.history.push(snapshot);
      state.historyIndex += 1;
      if (state.history.length > 250) {
        state.history.shift();
        state.historyIndex -= 1;
      }
    }
    state.historyMergeKey = mergeKey;
    state.historyLastAt = now;
    updateHistoryButtons();
  }

  function restoreEditorHistory(index) {
    const snapshot = state.history[index];
    if (!snapshot) return false;
    state.historyApplying = true;
    state.historyIndex = index;
    state.historyMergeKey = '';
    elements.editor.value = snapshot.value;
    elements.editor.setSelectionRange(snapshot.start, snapshot.end);
    elements.editor.scrollTop = snapshot.scrollTop;
    elements.editor.focus();
    onEditorInput();
    state.historyApplying = false;
    updateHistoryButtons();
    return true;
  }

  function undoEditor() {
    return state.historyIndex > 0 && restoreEditorHistory(state.historyIndex - 1);
  }

  function redoEditor() {
    return state.historyIndex < state.history.length - 1 && restoreEditorHistory(state.historyIndex + 1);
  }

  function setDocument(content, name, saved = true) {
    elements.editor.value = content;
    state.name = name || t('untitled');
    elements.documentName.textContent = state.name;
    if (saved) state.lastSaved = content;
    resetEditorHistory();
    persistDraft(content, state.name);
    updateStatus();
    render();
    queueMicrotask(() => void compactEmbeddedImages(content));
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    state.toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2200);
  }

  function persistDraft(content = elements.editor.value, name = state.name) {
    try {
      documentStorage.setItem('feather.document', content);
      documentStorage.setItem('feather.name', name);
      state.draftStorageWarning = false;
      return true;
    } catch (_) {
      if (!state.draftStorageWarning) showToast(t('draftStorageFull'));
      state.draftStorageWarning = true;
      return false;
    }
  }

  function updateFullscreenButton() {
    const active = state.fullscreen;
    const label = t(active ? 'exitFullscreen' : 'enterFullscreen');
    const shortcut = preferences?.settings.shortcuts.fullscreen;
    const shortcutLabel = shortcut && preferences?.displayShortcut(shortcut);
    elements.fullscreenButton.setAttribute('aria-pressed', String(active));
    elements.fullscreenButton.setAttribute('aria-label', label);
    elements.fullscreenButton.title = shortcutLabel ? `${label} (${shortcutLabel})` : label;
    elements.fullscreenIconPath.setAttribute(
      'd',
      active
        ? 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5'
        : 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5'
    );
  }

  function applyMaximizedState(maximized) {
    state.maximized = Boolean(maximized);
    const button = elements.windowMaximizeButton;
    if (!button) return;
    const label = t(state.maximized ? 'restoreWindow' : 'maximizeWindow');
    button.dataset.maximized = String(state.maximized);
    button.setAttribute('aria-pressed', String(state.maximized));
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  async function syncWindowMaximizedState() {
    if (typeof window.featherWindowIsMaximized !== 'function') return;
    try {
      applyMaximizedState(await window.featherWindowIsMaximized());
    } catch (_) {
      // Window state synchronization is cosmetic; native controls still work.
    }
  }

  function scheduleWindowStateSync() {
    requestAnimationFrame(() => setTimeout(() => void syncWindowMaximizedState(), 80));
  }

  function showFullscreenHint() {
    clearTimeout(state.fullscreenHintTimer);
    elements.fullscreenExitHint.textContent = t('fullscreenHint');
    elements.fullscreenExitHint.setAttribute('aria-hidden', 'false');
    elements.fullscreenExitHint.classList.remove('visible');
    void elements.fullscreenExitHint.offsetWidth;
    elements.fullscreenExitHint.classList.add('visible');
    state.fullscreenHintTimer = setTimeout(() => {
      elements.fullscreenExitHint.classList.remove('visible');
      elements.fullscreenExitHint.setAttribute('aria-hidden', 'true');
    }, 3500);
  }

  function applyFullscreenState(active, withHint = false) {
    state.fullscreen = Boolean(active);
    document.documentElement.classList.toggle('fullscreen-mode', state.fullscreen);
    updateFullscreenButton();
    if (state.fullscreen && withHint) {
      showFullscreenHint();
    } else if (!state.fullscreen) {
      clearTimeout(state.fullscreenHintTimer);
      elements.fullscreenExitHint.classList.remove('visible');
      elements.fullscreenExitHint.setAttribute('aria-hidden', 'true');
    }
    requestAnimationFrame(constrainPanelWidths);
  }

  async function setFullscreen(active) {
    if (Boolean(active) === state.fullscreen) return;
    try {
      if (window.featherDesktopPlatform === 'windows' && typeof window.featherWindowAction === 'function') {
        await window.featherWindowAction(active ? 'enter-fullscreen' : 'exit-fullscreen');
        applyFullscreenState(active, active);
        return;
      }
      if (active && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return;
      }
      if (!active && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
      applyFullscreenState(active, active);
    } catch (_) {
      showToast(t('fullscreenFailed'));
    }
  }

  function toggleFullscreen() {
    void setFullscreen(!state.fullscreen);
  }

  function closeChoiceDialog(value = 'cancel') {
    if (!state.dialogResolver) return;
    const resolve = state.dialogResolver;
    const previousFocus = state.dialogPreviousFocus;
    state.dialogResolver = null;
    state.dialogPreviousFocus = null;
    elements.appDialog.hidden = true;
    elements.dialogActions.replaceChildren();
    resolve(value);
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }

  function showChoiceDialog({ title, message, choices }) {
    if (state.dialogResolver) closeChoiceDialog('cancel');
    state.dialogPreviousFocus = document.activeElement;
    elements.dialogTitle.textContent = title;
    elements.dialogMessage.textContent = message;
    elements.dialogActions.replaceChildren();

    return new Promise(resolve => {
      state.dialogResolver = resolve;
      choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dialog-action ${choice.kind || ''}`.trim();
        button.dataset.dialogValue = choice.value;
        button.textContent = choice.label;
        elements.dialogActions.append(button);
      });
      elements.appDialog.hidden = false;
      requestAnimationFrame(() => {
        const preferred = elements.dialogActions.querySelector('.primary') || elements.dialogActions.querySelector('button');
        preferred?.focus();
      });
    });
  }

  function supportsAdditionalWindow() {
    return location.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(location.hostname);
  }

  async function createAdditionalWindow(action) {
    try {
      const response = await fetch('/api/window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!response.ok) throw new Error(await response.text());
      showToast(action === 'open' ? '已打开新窗口，请在那里选择文档' : '已创建新的空白窗口');
      return true;
    } catch (error) {
      showToast(`无法创建新窗口：${error.message}`);
      return false;
    }
  }

  async function confirmCurrentReplacement(actionLabel) {
    if (!isDocumentDirty()) return true;
    const choice = await showChoiceDialog({
      title: `保存对“${state.name}”的修改吗？`,
      message: `${actionLabel}会替换当前窗口中的内容。保存后继续，或明确放弃本次修改。`,
      choices: [
        { value: 'save', label: '保存并继续', kind: 'primary' },
        { value: 'discard', label: '不保存', kind: 'danger' },
        { value: 'cancel', label: '取消', kind: 'quiet' }
      ]
    });
    if (choice === 'save') return saveDocument();
    return choice === 'discard';
  }

  async function chooseDocumentAction(action) {
    let target = 'current';
    if (supportsAdditionalWindow()) {
      target = await showChoiceDialog({
        title: action === 'new' ? '在哪里新建文档？' : '在哪里打开文档？',
        message: action === 'new'
          ? '使用当前窗口会替换这里的内容；使用新窗口可以保留当前工作区。'
          : '使用当前窗口会替换这里的内容；使用新窗口可以并排查看两份文档。',
        choices: [
          { value: 'current', label: '当前窗口', kind: 'primary' },
          { value: 'new-window', label: '新窗口' },
          { value: 'cancel', label: '取消', kind: 'quiet' }
        ]
      });
    }
    if (target === 'cancel') return;
    if (target === 'new-window') {
      await createAdditionalWindow(action);
      return;
    }

    const canContinue = await confirmCurrentReplacement(action === 'new' ? '新建文档' : '打开文档');
    if (!canContinue) return;
    if (action === 'open') {
      await openDocumentDirect();
      return;
    }
    state.handle = null;
    state.serverBacked = false;
    state.workspaceFile = '';
    setDocument('', '未命名.md', true);
    elements.editor.focus();
    showToast('已新建空白文档');
  }

  async function loadServerDocument(initial = false) {
    try {
      const response = await fetch('/api/document', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const documentData = await response.json();
      if (!documentData.enabled) return false;
      state.serverBacked = true;
      if (initial || documentData.modified > state.lastServerModified) {
        const dirty = elements.editor.value !== state.lastSaved;
        if (!initial && dirty && documentData.content !== elements.editor.value) {
          if (!state.externalUpdateNotified) showToast('磁盘文件有新版本，保存后将覆盖它');
          state.externalUpdateNotified = true;
        } else if (initial || documentData.content !== elements.editor.value) {
          setDocument(documentData.content || '', documentData.name, true);
          if (!initial) showToast('已载入磁盘上的最新内容');
          state.externalUpdateNotified = false;
        }
        state.lastServerModified = documentData.modified || state.lastServerModified;
      }
      return true;
    } catch (error) {
      if (initial) showToast(`读取文件失败：${error.message}`);
      return false;
    }
  }

  async function saveToServer() {
    const content = elements.editor.value;
    const response = await fetch('/api/document', {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      body: content
    });
    if (!response.ok) throw new Error(await response.text());
    state.lastSaved = content;
    state.externalUpdateNotified = false;
    updateStatus();
    await loadServerDocument(false);
  }

  function featherAssetIDs(content = elements.editor.value) {
    return [...new Set(
      [...content.matchAll(/feather-asset:([a-f0-9]{24}\.(?:png|jpg|gif|webp|svg))/g)].map(match => match[1]),
    )];
  }

  function portableDocumentDetails() {
    const requestedName = /\.md$/i.test(state.name) ? state.name : `${state.name || t('untitled')}.md`;
    const baseName = requestedName
      .replace(/\.md$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .trim() || 'document';
    return { documentName: `${baseName}.md`, baseName, assetFolder: `${baseName}.assets` };
  }

  function portableMarkdown(content, assetFolder) {
    return content.replace(
      /feather-asset:([a-f0-9]{24}\.(?:png|jpg|gif|webp|svg))/g,
      `<./${assetFolder}/$1>`,
    );
  }

  async function writeFileHandle(handle, content) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
  }

  async function downloadPortableZip(content, details, assetIDs) {
    if (!window.JSZip) throw new Error('ZIP component is unavailable');
    const archive = new window.JSZip();
    archive.file(details.documentName, portableMarkdown(content, details.assetFolder));
    const assets = archive.folder(details.assetFolder);
    for (const assetID of assetIDs) {
      const response = await fetch(`/api/assets/${assetID}`);
      if (!response.ok) throw new Error(`missing image asset ${assetID}`);
      assets.file(assetID, await response.blob());
    }
    downloadBlob(await archive.generateAsync({ type: 'blob' }), `${details.baseName}.zip`);
  }

  async function savePortableDocument(content = elements.editor.value, chooseAnotherFolder = false) {
    const details = portableDocumentDetails();
    const assetIDs = featherAssetIDs(content);
    if ('showDirectoryPicker' in window) {
      if (chooseAnotherFolder || !state.portableDirectoryHandle) {
        showToast(t('chooseExportFolder'));
        state.portableDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      }
      const directory = state.portableDirectoryHandle;
      if (assetIDs.length) {
        const assetDirectory = await directory.getDirectoryHandle(details.assetFolder, { create: true });
        for (const assetID of assetIDs) {
          const response = await fetch(`/api/assets/${assetID}`);
          if (!response.ok) throw new Error(`missing image asset ${assetID}`);
          await writeFileHandle(
            await assetDirectory.getFileHandle(assetID, { create: true }),
            await response.blob(),
          );
        }
      }
      await writeFileHandle(
        await directory.getFileHandle(details.documentName, { create: true }),
        portableMarkdown(content, details.assetFolder),
      );
    } else {
      await downloadPortableZip(content, details, assetIDs);
    }
    state.name = details.documentName;
    elements.documentName.textContent = state.name;
    state.lastSaved = content;
    updateStatus();
    showToast(t('portableSaved'));
    return true;
  }

  function workspaceNoteCount(entries) {
    return entries.reduce((count, entry) => count + (entry.type === 'file' ? 1 : workspaceNoteCount(entry.children || [])), 0);
  }

  function setSidebarView(view) {
    document.querySelectorAll('[data-sidebar-view]').forEach(button => {
      const active = button.dataset.sidebarView === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-sidebar-panel]').forEach(panel => {
      const active = panel.dataset.sidebarPanel === view;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  function selectWorkspaceFolder(path = '') {
    state.selectedWorkspaceFolder = path;
    elements.workspaceTree.querySelectorAll('.workspace-entry[data-folder-path]').forEach(row => {
      row.classList.toggle('selected-folder', row.dataset.folderPath === path);
    });
  }

  function workspaceEntryElement(entry, depth = 0) {
    if (entry.type === 'folder') {
      const details = document.createElement('details');
      details.className = 'workspace-folder';
      details.dataset.path = entry.path;
      details.open = state.workspaceOpenFolders.has(entry.path) || depth === 0;
      const summary = document.createElement('summary');
      summary.className = 'workspace-entry';
      summary.dataset.folderPath = entry.path;
      summary.title = entry.path;
      summary.innerHTML = '<span class="workspace-entry-icon" aria-hidden="true"></span><span class="workspace-entry-name"></span>';
      summary.querySelector('.workspace-entry-name').textContent = entry.name;
      summary.classList.toggle('selected-folder', state.selectedWorkspaceFolder === entry.path);
      summary.addEventListener('click', () => selectWorkspaceFolder(entry.path));
      details.addEventListener('toggle', () => {
        if (details.open) state.workspaceOpenFolders.add(entry.path);
        else state.workspaceOpenFolders.delete(entry.path);
      });
      const children = document.createElement('div');
      children.className = 'workspace-tree-children';
      (entry.children || []).forEach(child => children.append(workspaceEntryElement(child, depth + 1)));
      details.append(summary, children);
      return details;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workspace-entry workspace-file';
    button.dataset.workspacePath = entry.path;
    button.title = entry.path;
    button.innerHTML = '<span class="workspace-entry-icon" aria-hidden="true">◇</span><span class="workspace-entry-name"></span>';
    button.querySelector('.workspace-entry-name').textContent = entry.name;
    button.classList.toggle('active', state.workspaceFile === entry.path);
    button.addEventListener('click', () => void openWorkspaceNote(entry.path));
    return button;
  }

  function renderWorkspace() {
    const enabled = Boolean(state.workspacePath);
    elements.workspaceName.textContent = enabled ? state.workspaceLabel || state.workspacePath.split(/[\\/]/).at(-1) : t('noWorkspace');
    elements.workspaceName.title = state.workspacePath;
    elements.workspaceNoteCount.textContent = String(workspaceNoteCount(state.workspaceEntries));
    elements.workspaceTools.hidden = !enabled;
    elements.workspaceEmpty.hidden = enabled;
    elements.workspaceTree.replaceChildren();
    if (!enabled) return;
    state.workspaceEntries.forEach(entry => elements.workspaceTree.append(workspaceEntryElement(entry)));
    if (!state.workspaceEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = t('workspaceEmptyDesc');
      elements.workspaceTree.append(empty);
    }
  }

  async function loadWorkspace(notify = false) {
    try {
      const response = await fetch('/api/workspace', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const workspace = await response.json();
      state.workspacePath = workspace.enabled ? workspace.path : '';
      state.workspaceLabel = workspace.enabled ? workspace.name : '';
      state.workspaceEntries = workspace.entries || [];
      if (!state.workspacePath) {
        state.workspaceFile = '';
        state.workspaceLabel = '';
        state.selectedWorkspaceFolder = '';
      }
      renderWorkspace();
      if (notify && workspace.enabled) showToast(t('workspaceSelected', { name: workspace.name }));
      return workspace;
    } catch (error) {
      if (notify) showToast(t('workspaceLoadFailed', { message: error.message }));
      return null;
    }
  }

  async function chooseWorkspace() {
    try {
      let path = '';
      if (typeof window.featherChooseWorkspace === 'function') {
        const result = await window.featherChooseWorkspace();
        if (result?.error) throw new Error(result.error);
        path = result?.path || '';
      } else {
        path = window.prompt(t('chooseWorkspace'), state.workspacePath || '') || '';
      }
      if (!path) return;
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) throw new Error(await response.text());
      const workspace = await response.json();
      state.workspacePath = workspace.path;
      state.workspaceLabel = workspace.name;
      state.workspaceEntries = workspace.entries || [];
      state.workspaceFile = '';
      state.selectedWorkspaceFolder = '';
      state.workspaceOpenFolders.clear();
      renderWorkspace();
      setSidebarView('workspace');
      setOutlineVisible(true);
      showToast(t('workspaceSelected', { name: workspace.name }));
    } catch (error) {
      showToast(t('workspaceLoadFailed', { message: error.message }));
    }
  }

  async function openWorkspaceNote(path) {
    const canContinue = await confirmCurrentReplacement(t('open'));
    if (!canContinue) return;
    try {
      const response = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const note = await response.json();
      state.handle = null;
      state.serverBacked = false;
      state.workspaceFile = note.path;
      setDocument(note.content || '', note.name, true);
      renderWorkspace();
      if (!panelIsVisible(elements.editorPanel)) setEditorVisible(true);
      elements.editor.focus();
    } catch (error) {
      showToast(t('workspaceLoadFailed', { message: error.message }));
    }
  }

  async function saveWorkspaceNote() {
    const content = elements.editor.value;
    const response = await fetch(`/api/workspace/file?path=${encodeURIComponent(state.workspaceFile)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      body: content,
    });
    if (!response.ok) throw new Error(await response.text());
    state.lastSaved = content;
    updateStatus();
    showToast(t('saved'));
    return true;
  }

  function openWorkspaceCreateDialog(type) {
    state.workspaceCreateType = type;
    elements.workspaceItemTitle.textContent = t(type === 'note' ? 'newNote' : 'newCategory');
    elements.workspaceItemParent.textContent = state.selectedWorkspaceFolder || state.workspacePath.split(/[\\/]/).at(-1) || '';
    elements.workspaceItemName.value = '';
    if (!elements.workspaceItemDialog.open) elements.workspaceItemDialog.showModal();
    setTimeout(() => elements.workspaceItemName.focus(), 30);
  }

  async function createWorkspaceItem() {
    const name = elements.workspaceItemName.value.trim();
    if (!name) return;
    try {
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: state.workspaceCreateType, parent: state.selectedWorkspaceFolder, name }),
      });
      if (!response.ok) throw new Error(await response.text());
      const created = await response.json();
      elements.workspaceItemDialog.close();
      await loadWorkspace(false);
      showToast(t('workspaceItemCreated', { name: created.name }));
      if (created.type === 'note') await openWorkspaceNote(created.path);
    } catch (error) {
      showToast(t('workspaceCreateFailed', { message: error.message }));
    }
  }

  function scheduleServerSave() {
    if (!state.serverBacked) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveToServer().catch(error => showToast(`自动保存失败：${error.message}`));
    }, 700);
  }

  async function openDocumentDirect() {
    try {
      if (window.FeatherNative?.openDocument) {
        window.FeatherNative.openDocument();
        return;
      }
      if (window.webkit?.messageHandlers?.featherOpen) {
        window.webkit.messageHandlers.featherOpen.postMessage(null);
        return;
      }
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'] } }],
          multiple: false
        });
        const file = await handle.getFile();
        state.handle = handle;
        state.serverBacked = false;
        state.workspaceFile = '';
        setDocument(await file.text(), file.name, true);
        showToast('文档已打开');
        return;
      }
      elements.fileInput.click();
    } catch (error) {
      if (error.name !== 'AbortError') showToast(`打开失败：${error.message}`);
    }
  }

  async function saveDocument() {
    state.saveOperation = 'saving';
    updateStatus();
    try {
      const content = elements.editor.value;
      if (state.workspaceFile) {
        return await saveWorkspaceNote();
      }
      if (state.serverBacked) {
        await saveToServer();
        showToast('已保存到磁盘');
        return true;
      }
      if (featherAssetIDs(content).length) {
        return await savePortableDocument(content);
      }
      if (window.FeatherNative?.saveDocument) {
        if (state.nativeSaveResolver) {
          showToast('保存窗口已经打开');
          return false;
        }
        const completed = await new Promise(resolve => {
          state.nativeSaveResolver = resolve;
          window.FeatherNative.saveDocument(state.name, content);
        });
        if (completed) {
          state.lastSaved = content;
          updateStatus();
          showToast('文档已保存');
        }
        return completed;
      }
      if (window.webkit?.messageHandlers?.featherSave) {
        if (state.nativeSaveResolver) {
          showToast('保存窗口已经打开');
          return false;
        }
        const completed = await new Promise(resolve => {
          state.nativeSaveResolver = resolve;
          window.webkit.messageHandlers.featherSave.postMessage({ name: state.name, content });
        });
        if (completed) {
          state.lastSaved = content;
          updateStatus();
          showToast('文档已保存');
        }
        return completed;
      }
      if (state.handle) {
        const writable = await state.handle.createWritable();
        await writable.write(content);
        await writable.close();
        state.lastSaved = content;
        updateStatus();
        showToast('已保存');
        return true;
      }
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: state.name,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
        });
        state.handle = handle;
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        state.name = handle.name;
        elements.documentName.textContent = state.name;
        state.lastSaved = content;
        updateStatus();
        showToast('已保存');
        return true;
      }
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = state.name.endsWith('.md') ? state.name : `${state.name}.md`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      state.lastSaved = content;
      updateStatus();
      showToast('文档已下载');
      return true;
    } catch (error) {
      if (state.nativeSaveResolver) {
        const resolve = state.nativeSaveResolver;
        state.nativeSaveResolver = null;
        resolve(false);
      }
      if (error.name !== 'AbortError') {
        state.saveOperation = 'error';
        showToast(`保存失败：${error.message}`);
      }
      return false;
    } finally {
      if (state.saveOperation === 'saving') state.saveOperation = null;
      updateStatus();
    }
  }

  function exportedFileStem() {
    return portableDocumentDetails().baseName;
  }

  async function waitForPreviewMedia() {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...elements.preview.querySelectorAll('img')].map(image => {
      if (image.complete) return image.decode?.().catch(() => {});
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  async function capturePreviewCanvas() {
    if (!window.html2canvas) throw new Error('image export component is unavailable');
    await render();
    await waitForPreviewMedia();
    const width = Math.ceil(elements.preview.scrollWidth);
    const height = Math.ceil(elements.preview.scrollHeight);
    const maxDimension = 30000;
    const maxArea = 180000000;
    const scale = Math.min(
      2,
      window.devicePixelRatio || 1,
      maxDimension / Math.max(width, height),
      Math.sqrt(maxArea / Math.max(1, width * height)),
    );
    if (scale < 0.25) throw new Error('document is too large for a single image');
    return window.html2canvas(elements.preview, {
      backgroundColor: getComputedStyle(elements.preview).backgroundColor,
      scale,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone: clonedDocument => {
        clonedDocument.querySelectorAll('.table-scroll, pre, .mermaid').forEach(node => {
          node.style.overflow = 'visible';
        });
      },
    });
  }

  async function exportLongImage() {
    const canvas = await capturePreviewCanvas();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png');
    });
    downloadBlob(blob, `${exportedFileStem()}.png`);
  }

  async function exportPDF() {
    if (!window.jspdf?.jsPDF) throw new Error('PDF export component is unavailable');
    const canvas = await capturePreviewCanvas();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const sliceHeight = Math.max(1, Math.floor(canvas.width * contentHeight / contentWidth));
    let sourceY = 0;
    let page = 0;
    while (sourceY < canvas.height) {
      const height = Math.min(sliceHeight, canvas.height - sourceY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = height;
      slice.getContext('2d').drawImage(canvas, 0, sourceY, canvas.width, height, 0, 0, canvas.width, height);
      if (page > 0) pdf.addPage();
      const renderedHeight = height * contentWidth / canvas.width;
      pdf.addImage(slice.toDataURL('image/jpeg', .92), 'JPEG', margin, margin, contentWidth, renderedHeight, undefined, 'FAST');
      sourceY += height;
      page += 1;
    }
    pdf.save(`${exportedFileStem()}.pdf`);
  }

  function setExportMenuOpen(open) {
    elements.exportMenu.hidden = !open;
    elements.exportButton.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(() => elements.exportMenu.querySelector('button')?.focus());
  }

  async function runExport(action) {
    if (state.exporting) return;
    setExportMenuOpen(false);
    state.exporting = true;
    try {
      if (action === 'portable') {
        await savePortableDocument(elements.editor.value, true);
        return;
      }
      if (action === 'print') {
        await render();
        await waitForPreviewMedia();
        window.print();
        return;
      }
      showToast(t('exportPreparing'));
      if (action === 'pdf') await exportPDF();
      if (action === 'image') await exportLongImage();
      showToast(t('exportComplete'));
    } catch (error) {
      if (error.name !== 'AbortError') showToast(t('exportFailed', { message: error.message }));
    } finally {
      state.exporting = false;
    }
  }

  function insertFormat(format) {
    const editor = elements.editor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end);

    const lineFormats = {
      heading1: { placeholder: '一级标题', transform: line => `# ${line.replace(/^#{1,6}\s+/, '')}` },
      heading2: { placeholder: '二级标题', transform: line => `## ${line.replace(/^#{1,6}\s+/, '')}` },
      heading3: { placeholder: '三级标题', transform: line => `### ${line.replace(/^#{1,6}\s+/, '')}` },
      quote: { placeholder: '引用内容', transform: line => `> ${line.replace(/^>\s?/, '')}` },
      unorderedList: { placeholder: '列表项', transform: line => `- ${line.replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, '')}` },
      orderedList: { placeholder: '列表项', transform: (line, index) => `${index + 1}. ${line.replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, '')}` },
      taskList: { placeholder: '待办事项', transform: line => `- [ ] ${line.replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, '')}` }
    };

    if (lineFormats[format]) {
      const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
      const nextBreak = editor.value.indexOf('\n', end);
      const lineEnd = nextBreak === -1 ? editor.value.length : nextBreak;
      const rule = lineFormats[format];
      const source = editor.value.slice(lineStart, lineEnd) || rule.placeholder;
      const replacement = source.split('\n').map(rule.transform).join('\n');
      editor.setRangeText(replacement, lineStart, lineEnd, 'select');
      editor.focus();
      onEditorInput();
      return;
    }

    const formats = {
      bold: ['**', '**', '粗体文字'],
      italic: ['*', '*', '斜体文字'],
      strike: ['~~', '~~', '删除线文字'],
      code: ['`', '`', 'code'],
      link: ['[', '](https://example.com)', '链接文字'],
      codeblock: ['```\n', '\n```', '代码'],
      table: ['', '', '| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'],
      horizontalRule: ['\n\n', '\n\n', '---'],
      math: ['$$\n', '\n$$', 'E = mc^2'],
      mermaid: ['```mermaid\n', '\n```', 'flowchart LR\n    A[开始] --> B[完成]']
    };
    const [before, after, placeholder] = formats[format];
    const content = selected || placeholder;
    const replacement = before + content + after;
    editor.setRangeText(replacement, start, end, 'end');
    if (!selected && placeholder) {
      const placeholderStart = start + replacement.indexOf(placeholder);
      editor.selectionStart = placeholderStart;
      editor.selectionEnd = placeholderStart + placeholder.length;
    }
    editor.focus();
    onEditorInput();
  }

  function insertEditorBlock(markdown) {
    const editor = elements.editor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    const leadingBreak = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const trailingBreak = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    const replacement = `${leadingBreak}${markdown}${trailingBreak}`;
    editor.setRangeText(replacement, start, end, 'end');
    editor.focus();
    onEditorInput();
  }

  function imageAltText(filename) {
    return String(filename || t('imageDescription'))
      .replace(/\.[^.]+$/, '')
      .replace(/[\[\]\\]/g, ' ')
      .trim() || t('imageDescription');
  }

  async function storeLocalImage(file) {
    const endpoint = state.workspaceFile
      ? `/api/workspace/assets?path=${encodeURIComponent(state.workspaceFile)}`
      : '/api/assets';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!response.ok) throw new Error(await response.text());
    const asset = await response.json();
    if (!/^[a-f0-9]{24}\.(?:png|jpg|gif|webp|svg)$/.test(asset.id || '')) {
      throw new Error('invalid asset id');
    }
    if (state.workspaceFile) {
      if (!/^<\.\/[^<>]+\.assets\/[a-f0-9]{24}\.(?:png|jpg|gif|webp|svg)>$/.test(asset.reference || '')) {
        throw new Error('invalid workspace asset reference');
      }
      return asset.reference;
    }
    return `feather-asset:${asset.id}`;
  }

  async function compactEmbeddedImages(originalContent) {
    if (elements.editor.value !== originalContent || !originalContent.includes('data:image/')) return;
    const pattern = /!\[([^\]\r\n]*)\]\((data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\r\n]+)\)/gi;
    const matches = [...originalContent.matchAll(pattern)];
    if (!matches.length) return;
    let content = originalContent;
    let count = 0;
    for (const match of matches) {
      try {
        const imageResponse = await fetch(match[2]);
        const reference = await storeLocalImage(await imageResponse.blob());
        content = content.replace(match[0], `![${match[1]}](${reference})`);
        count += 1;
      } catch (_) {
        return;
      }
    }
    if (!count || elements.editor.value !== originalContent) return;
    elements.editor.value = content;
    onEditorInput();
    showToast(t('embeddedImagesCompacted', { count }));
  }

  async function insertLocalImages(files) {
    const images = [...files].filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    const markdown = [];
    for (const file of images) {
      if (file.size > MAX_EMBEDDED_IMAGE_BYTES) {
        showToast(t('imageTooLarge', { name: file.name }));
        continue;
      }
      try {
        const reference = await storeLocalImage(file);
        markdown.push(`![${imageAltText(file.name)}](${reference})`);
      } catch (_) {
        showToast(t('imageStorageFailed', { name: file.name }));
      }
    }
    if (!markdown.length) return;
    insertEditorBlock(markdown.join('\n\n'));
    if (elements.imageDialog.open) elements.imageDialog.close();
    showToast(t('imagesInserted', { count: markdown.length }));
  }

  function openImageDialog() {
    elements.imageAltInput.value = '';
    elements.imageURLInput.value = '';
    if (!elements.imageDialog.open) elements.imageDialog.showModal();
    setTimeout(() => elements.imageFileButton.focus(), 30);
  }

  function insertNetworkImage() {
    const rawURL = elements.imageURLInput.value.trim();
    try {
      const parsed = new URL(rawURL);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
      const selected = elements.editor.value.slice(elements.editor.selectionStart, elements.editor.selectionEnd);
      const alt = imageAltText(elements.imageAltInput.value || selected || t('imageDescription'));
      insertEditorBlock(`![${alt}](<${parsed.href}>)`);
      elements.imageDialog.close();
    } catch (_) {
      showToast(t('imageUrlInvalid'));
      elements.imageURLInput.focus();
    }
  }

  function dataTransferHasImages(dataTransfer) {
    return [...(dataTransfer?.items || [])].some(item => item.kind === 'file' && item.type.startsWith('image/'));
  }

  function indentEditorSelection(outdent = false) {
    const editor = elements.editor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;

    if (start === end && !outdent) {
      editor.setRangeText('  ', start, end, 'end');
      onEditorInput();
      return;
    }

    const nextBreak = editor.value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? editor.value.length : nextBreak;
    const block = editor.value.slice(lineStart, lineEnd);
    const transformed = block
      .split('\n')
      .map(line => outdent ? line.replace(/^(?: {1,2}|\t)/, '') : `  ${line}`)
      .join('\n');
    editor.setRangeText(transformed, lineStart, lineEnd, 'select');
    editor.focus();
    onEditorInput();
  }

  function continueMarkdownBlock() {
    const editor = elements.editor;
    if (editor.selectionStart !== editor.selectionEnd) return false;
    const cursor = editor.selectionStart;
    const lineStart = editor.value.lastIndexOf('\n', cursor - 1) + 1;
    const lineBeforeCursor = editor.value.slice(lineStart, cursor);
    const list = lineBeforeCursor.match(/^(\s*)([-+*]|(\d+)[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
    if (list) {
      if (!list[5].trim()) {
        editor.setRangeText('', lineStart, cursor, 'end');
      } else {
        const marker = list[3] ? `${Number(list[3]) + 1}.` : list[2];
        editor.setRangeText(`\n${list[1]}${marker} ${list[4] ? '[ ] ' : ''}`, cursor, cursor, 'end');
      }
      onEditorInput();
      return true;
    }
    const quote = lineBeforeCursor.match(/^(\s*>\s?)(.*)$/);
    if (quote) {
      editor.setRangeText(quote[2].trim() ? `\n${quote[1]}` : '', quote[2].trim() ? cursor : lineStart, cursor, 'end');
      onEditorInput();
      return true;
    }
    return false;
  }

  function panelIsVisible(panel) {
    return !panel.classList.contains('hidden');
  }

  function preferredPanelWidth(kind) {
    const config = PANEL_SIZES[kind];
    const inlineValue = parseFloat(elements.workspace.style.getPropertyValue(config.property));
    if (Number.isFinite(inlineValue)) return inlineValue;
    const panel = kind === 'outline' ? elements.outlinePanel : elements.editorPanel;
    return panel.getBoundingClientRect().width || config.initial;
  }

  function panelWidthBounds(kind) {
    const workspaceWidth = elements.workspace.getBoundingClientRect().width;
    const outlineVisible = panelIsVisible(elements.outlinePanel);
    const editorVisible = panelIsVisible(elements.editorPanel);
    const dividerCount = Number(outlineVisible) + Number(editorVisible);
    let otherWidth = 0;

    if (kind === 'outline' && editorVisible) {
      otherWidth = Math.max(PANEL_SIZES.editor.minimum, elements.editorPanel.getBoundingClientRect().width);
    } else if (kind === 'editor' && outlineVisible) {
      otherWidth = Math.max(PANEL_SIZES.outline.minimum, elements.outlinePanel.getBoundingClientRect().width);
    }

    const minimum = PANEL_SIZES[kind].minimum;
    const maximum = Math.max(minimum, workspaceWidth - PREVIEW_MINIMUM - otherWidth - dividerCount * RESIZER_WIDTH);
    return { minimum, maximum };
  }

  function updateResizerAccessibility(kind, width) {
    const resizer = kind === 'outline' ? elements.outlineResizer : elements.editorResizer;
    const bounds = panelWidthBounds(kind);
    resizer.setAttribute('aria-valuemin', String(bounds.minimum));
    resizer.setAttribute('aria-valuemax', String(Math.round(bounds.maximum)));
    resizer.setAttribute('aria-valuenow', String(Math.round(width)));
  }

  function setPanelWidth(kind, requestedWidth, persist = false) {
    const config = PANEL_SIZES[kind];
    const bounds = panelWidthBounds(kind);
    const width = Math.min(bounds.maximum, Math.max(bounds.minimum, requestedWidth));
    elements.workspace.style.setProperty(config.property, `${Math.round(width)}px`);
    updateResizerAccessibility(kind, width);
    if (persist) localStorage.setItem(config.storage, String(Math.round(width)));
    return width;
  }

  function restorePanelWidths() {
    Object.entries(PANEL_SIZES).forEach(([kind, config]) => {
      const saved = Number(localStorage.getItem(config.storage));
      const width = Number.isFinite(saved) && saved >= config.minimum ? saved : config.initial;
      elements.workspace.style.setProperty(config.property, `${Math.round(width)}px`);
      const resizer = kind === 'outline' ? elements.outlineResizer : elements.editorResizer;
      resizer.setAttribute('aria-valuenow', String(Math.round(width)));
    });
  }

  function constrainPanelWidths() {
    if (window.innerWidth <= 900) return;
    if (panelIsVisible(elements.outlinePanel)) setPanelWidth('outline', preferredPanelWidth('outline'));
    if (panelIsVisible(elements.editorPanel)) setPanelWidth('editor', preferredPanelWidth('editor'));
  }

  function bindPanelResizer(resizer, kind) {
    const panel = kind === 'outline' ? elements.outlinePanel : elements.editorPanel;

    resizer.addEventListener('pointerdown', event => {
      if (window.innerWidth <= 900 || event.button !== 0 || !panelIsVisible(panel) || event.target.closest('.outline-toggle')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = panel.getBoundingClientRect().width;
      resizer.setPointerCapture(event.pointerId);
      resizer.classList.add('active');
      elements.workspace.classList.add('is-resizing');

      const move = moveEvent => {
        setPanelWidth(kind, startWidth + moveEvent.clientX - startX);
      };
      const finish = finishEvent => {
        if (resizer.hasPointerCapture(finishEvent.pointerId)) resizer.releasePointerCapture(finishEvent.pointerId);
        resizer.classList.remove('active');
        elements.workspace.classList.remove('is-resizing');
        setPanelWidth(kind, panel.getBoundingClientRect().width, true);
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', finish);
        resizer.removeEventListener('pointercancel', finish);
      };

      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', finish);
      resizer.addEventListener('pointercancel', finish);
    });

    resizer.addEventListener('keydown', event => {
      if (window.innerWidth <= 900 || !panelIsVisible(panel) || event.target.closest('.outline-toggle')) return;
      const bounds = panelWidthBounds(kind);
      const step = event.shiftKey ? 48 : 16;
      let nextWidth;
      if (event.key === 'ArrowLeft') nextWidth = panel.getBoundingClientRect().width - step;
      else if (event.key === 'ArrowRight') nextWidth = panel.getBoundingClientRect().width + step;
      else if (event.key === 'Home') nextWidth = bounds.minimum;
      else if (event.key === 'End') nextWidth = bounds.maximum;
      else return;
      event.preventDefault();
      setPanelWidth(kind, nextWidth, true);
    });

    resizer.addEventListener('dblclick', event => {
      if (!panelIsVisible(panel) || event.target.closest('.outline-toggle')) return;
      setPanelWidth(kind, PANEL_SIZES[kind].initial, true);
      showToast(kind === 'outline' ? '已恢复大纲默认宽度' : '已恢复编辑器默认宽度');
    });
  }

  function runEditorCommand(command) {
    if (command === 'undo') undoEditor();
    if (command === 'redo') redoEditor();
  }

  function applyTheme(theme, notify = false) {
    if (preferences) preferences.setTheme(theme, notify);
    else {
      if (theme === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = theme;
      localStorage.setItem('feather.theme', theme);
    }
    elements.themeButton.title = t('themeCurrent', { theme: t(theme) });
    document.querySelector('meta[name="theme-color"]').content = resolvedTheme() === 'dark' ? '#141817' : '#f3f8fc';
  }

  function cycleTheme() {
    const next = preferences
      ? preferences.cycleTheme()
      : ({ system: 'light', light: 'dark', dark: 'system' })[localStorage.getItem('feather.theme') || 'system'];
    if (!preferences) applyTheme(next);
    render();
    showToast(t('themeChanged', { theme: t(next) }));
  }

  function setMobilePane(pane) {
    document.body.dataset.mobilePane = pane;
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      const active = tab.dataset.pane === pane;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  function setEditorVisible(visible, persist = true) {
    elements.editorPanel.classList.toggle('hidden', !visible);
    elements.workspace.classList.toggle('editor-collapsed', !visible);
    elements.editorToggleButton.setAttribute('aria-pressed', String(visible));
    elements.editorToggleButton.title = `${t(visible ? 'hideEditor' : 'showEditor')} (Ctrl+Shift+E)`;
    const editorTab = document.querySelector('.mobile-tab[data-pane="editor"]');
    editorTab.classList.toggle('hidden', !visible);
    elements.mobileTabs.classList.toggle('editor-hidden', !visible);
    if (!visible && document.body.dataset.mobilePane === 'editor') setMobilePane('preview');
    if (persist) localStorage.setItem('feather.editorVisible', String(visible));
    requestAnimationFrame(constrainPanelWidths);
  }

  function setOutlineVisible(visible, persist = true) {
    elements.outlinePanel.classList.toggle('hidden', !visible);
    elements.workspace.classList.toggle('outline-collapsed', !visible);
    elements.outlineToggleButton.setAttribute('aria-expanded', String(visible));
    elements.outlineToggleButton.setAttribute('aria-label', t(visible ? 'hideOutline' : 'showOutline'));
    elements.outlineToggleButton.title = t(visible ? 'hideOutline' : 'showOutline');
    if (persist) localStorage.setItem('feather.outlineVisible', String(visible));
    requestAnimationFrame(constrainPanelWidths);
  }

  function toggleOutline() {
    const show = elements.outlinePanel.classList.contains('hidden');
    setOutlineVisible(show);
    showToast(t(show ? 'outlineShown' : 'outlineHidden'));
  }

  function toggleEditor() {
    const show = elements.editorPanel.classList.contains('hidden');
    setEditorVisible(show);
    if (show && window.innerWidth <= 900) setMobilePane('editor');
    showToast(t(show ? 'editorShown' : 'readerMode'));
  }

  function onEditorInput(event) {
    recordEditorHistory(event?.inputType || 'programmatic');
    state.saveOperation = null;
    persistDraft();
    updateStatus();
    scheduleRender();
    scheduleServerSave();
  }

  function runShortcut(action) {
    const handlers = {
      new: () => chooseDocumentAction('new'),
      open: () => chooseDocumentAction('open'),
      save: saveDocument,
      undo: undoEditor,
      redo: redoEditor,
      settings: () => preferences?.openSettings(),
      fullscreen: toggleFullscreen,
      bold: () => insertFormat('bold'),
      italic: () => insertFormat('italic'),
      link: () => insertFormat('link'),
      code: () => insertFormat('code'),
      heading: () => insertFormat('heading2'),
      outline: toggleOutline,
      editor: toggleEditor,
      theme: cycleTheme,
      mermaid: () => preferences?.openTemplates()
    };
    handlers[action]?.();
  }

  function bindEvents() {
    elements.editor.addEventListener('input', onEditorInput);
    elements.editor.addEventListener('keyup', updateStatus);
    elements.editor.addEventListener('click', updateStatus);
    elements.editor.addEventListener('paste', event => {
      const images = [...(event.clipboardData?.files || [])].filter(file => file.type.startsWith('image/'));
      if (!images.length) return;
      event.preventDefault();
      void insertLocalImages(images);
    });
    elements.editorPanel.addEventListener('dragenter', event => {
      if (!dataTransferHasImages(event.dataTransfer)) return;
      event.preventDefault();
      elements.editorPanel.classList.add('image-drop-active');
    });
    elements.editorPanel.addEventListener('dragover', event => {
      if (!dataTransferHasImages(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      elements.editorPanel.classList.add('image-drop-active');
    });
    elements.editorPanel.addEventListener('dragleave', event => {
      if (!elements.editorPanel.contains(event.relatedTarget)) elements.editorPanel.classList.remove('image-drop-active');
    });
    elements.editorPanel.addEventListener('drop', event => {
      elements.editorPanel.classList.remove('image-drop-active');
      const images = [...(event.dataTransfer?.files || [])].filter(file => file.type.startsWith('image/'));
      if (!images.length) return;
      event.preventDefault();
      void insertLocalImages(images);
    });
    elements.formatBar.addEventListener('wheel', event => {
      if (elements.formatBar.scrollWidth <= elements.formatBar.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      event.preventDefault();
      elements.formatBar.scrollLeft += event.deltaY;
    }, { passive: false });
    elements.preview.addEventListener('click', activatePreviewLink);
    elements.preview.addEventListener('auxclick', activatePreviewLink);
    elements.editor.addEventListener('scroll', () => {
      if (preferences && !preferences.settings.syncScroll) return;
      const maximumEditor = elements.editor.scrollHeight - elements.editor.clientHeight;
      const maximumPreview = elements.previewPanel.scrollHeight - elements.previewPanel.clientHeight;
      if (maximumEditor > 0 && maximumPreview > 0) {
        elements.previewPanel.scrollTop = elements.editor.scrollTop / maximumEditor * maximumPreview;
      }
    }, { passive: true });
    elements.fileInput.addEventListener('change', async () => {
      const file = elements.fileInput.files[0];
      if (!file) return;
      state.handle = null;
      state.serverBacked = false;
      state.workspaceFile = '';
      setDocument(await file.text(), file.name, true);
      elements.fileInput.value = '';
      showToast('文档已打开');
    });
    elements.imageInput.addEventListener('change', () => {
      const files = [...elements.imageInput.files];
      elements.imageInput.value = '';
      void insertLocalImages(files);
    });
    elements.imageButton.addEventListener('click', openImageDialog);
    elements.imageFileButton.addEventListener('click', () => elements.imageInput.click());
    elements.imageFileButton.addEventListener('dragover', event => {
      if (!dataTransferHasImages(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      elements.imageFileButton.classList.add('is-dragover');
    });
    elements.imageFileButton.addEventListener('dragleave', () => elements.imageFileButton.classList.remove('is-dragover'));
    elements.imageFileButton.addEventListener('drop', event => {
      elements.imageFileButton.classList.remove('is-dragover');
      const images = [...(event.dataTransfer?.files || [])].filter(file => file.type.startsWith('image/'));
      if (!images.length) return;
      event.preventDefault();
      void insertLocalImages(images);
    });
    elements.insertImageURLButton.addEventListener('click', insertNetworkImage);
    elements.imageURLInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      insertNetworkImage();
    });

    elements.appDialog.addEventListener('click', event => {
      const action = event.target.closest('[data-dialog-value]');
      if (action) closeChoiceDialog(action.dataset.dialogValue);
    });
    elements.appDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeChoiceDialog('cancel');
      }
    });

    $('#open-button').addEventListener('click', () => chooseDocumentAction('open'));
    $('#save-button').addEventListener('click', saveDocument);
    $('#new-button').addEventListener('click', () => chooseDocumentAction('new'));
    elements.workspaceButton.addEventListener('click', chooseWorkspace);
    elements.workspaceEmpty.addEventListener('click', chooseWorkspace);
    elements.workspaceName.addEventListener('click', () => selectWorkspaceFolder(''));
    elements.workspaceRefresh.addEventListener('click', () => void loadWorkspace(true));
    document.querySelectorAll('[data-sidebar-view]').forEach(button => {
      button.addEventListener('click', () => setSidebarView(button.dataset.sidebarView));
    });
    document.querySelectorAll('[data-workspace-create]').forEach(button => {
      button.addEventListener('click', () => openWorkspaceCreateDialog(button.dataset.workspaceCreate));
    });
    elements.workspaceItemForm.addEventListener('submit', event => {
      event.preventDefault();
      void createWorkspaceItem();
    });
    elements.exportButton.addEventListener('click', event => {
      event.stopPropagation();
      setExportMenuOpen(elements.exportMenu.hidden);
    });
    elements.exportMenu.addEventListener('click', event => {
      const action = event.target.closest('[data-export-action]')?.dataset.exportAction;
      if (action) void runExport(action);
    });
    document.addEventListener('click', event => {
      if (!elements.exportMenu.hidden && !event.target.closest('.export-menu-wrap')) setExportMenuOpen(false);
    });
    elements.outlineToggleButton.addEventListener('click', toggleOutline);
    document.querySelectorAll('[data-window-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const action = button.dataset.windowAction;
        if (action === 'close') {
          requestWindowClose();
        } else if (typeof window.featherWindowAction === 'function') {
          await window.featherWindowAction(action);
          if (action === 'maximize') scheduleWindowStateSync();
        }
      });
    });
    elements.topbar.addEventListener('pointerdown', event => {
      if (!document.documentElement.classList.contains('desktop-native-windows') || event.button !== 0) return;
      if (event.target.closest('button, a, input, textarea, select')) return;
      event.preventDefault();
      if (typeof window.featherWindowAction === 'function') window.featherWindowAction('drag');
    });
    elements.topbar.addEventListener('dblclick', event => {
      if (!document.documentElement.classList.contains('desktop-native-windows')) return;
      if (event.target.closest('button, a, input, textarea, select')) return;
      if (typeof window.featherWindowAction === 'function') {
        window.featherWindowAction('maximize');
        scheduleWindowStateSync();
      }
    });
    elements.editorToggleButton.addEventListener('click', toggleEditor);
    elements.fullscreenButton.addEventListener('click', toggleFullscreen);
    elements.themeButton.addEventListener('click', cycleTheme);
    elements.settingsButton.addEventListener('click', () => preferences?.openSettings());
    document.querySelectorAll('[data-format]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.format === 'mermaid' && preferences) preferences.openTemplates();
        else insertFormat(button.dataset.format);
      });
    });
    document.querySelectorAll('[data-command]').forEach(button => {
      button.addEventListener('click', () => runEditorCommand(button.dataset.command));
    });
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => setMobilePane(tab.dataset.pane));
    });
    bindPanelResizer(elements.outlineResizer, 'outline');
    bindPanelResizer(elements.editorResizer, 'editor');
    window.addEventListener('resize', debounce(() => {
      constrainPanelWidths();
      void syncWindowMaximizedState();
    }, 80));
    document.addEventListener('fullscreenchange', () => {
      applyFullscreenState(Boolean(document.fullscreenElement), Boolean(document.fullscreenElement));
    });

    document.addEventListener('keydown', event => {
      if (preferences?.captureShortcut(event)) return;
      if (event.key === 'Escape' && !elements.exportMenu.hidden) {
        event.preventDefault();
        setExportMenuOpen(false);
        elements.exportButton.focus();
        return;
      }
      if (event.key === 'Escape' && state.fullscreen) {
        event.preventDefault();
        void setFullscreen(false);
        return;
      }
      if (!elements.appDialog.hidden) return;
      if (event.key === 'Tab' && document.activeElement === elements.editor) {
        event.preventDefault();
        indentEditorSelection(event.shiftKey);
        return;
      }
      if (event.key === 'Enter' && document.activeElement === elements.editor && continueMarkdownBlock()) {
        event.preventDefault();
        return;
      }
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement !== elements.editor) return;
      const action = preferences?.actionForEvent(event);
      if (action) {
        event.preventDefault();
        runShortcut(action);
      }
    });

    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((localStorage.getItem('feather.theme') || 'system') === 'system') render();
    });
  }

  async function initialise() {
    preferences?.init({
      onToast: showToast,
      onChange: kind => {
        updateStatus();
        setOutlineVisible(panelIsVisible(elements.outlinePanel), false);
        setEditorVisible(panelIsVisible(elements.editorPanel), false);
        updateFullscreenButton();
        applyMaximizedState(state.maximized);
        if (kind === 'language') renderWorkspace();
        if (kind === 'theme' || kind === 'language') render();
      }
    });
    applyTheme(preferences?.settings.theme || localStorage.getItem('feather.theme') || 'system');
    updateFullscreenButton();
    void syncWindowMaximizedState();
    restorePanelWidths();
    setOutlineVisible(localStorage.getItem('feather.outlineVisible') !== 'false', false);
    const editorVisible = localStorage.getItem('feather.editorVisible') === 'true';
    setEditorVisible(editorVisible, false);
    setMobilePane(editorVisible ? 'editor' : 'preview');
    bindEvents();
    const hasServerDocument = await loadServerDocument(true);
    if (!hasServerDocument) {
      if (startupAction === 'new' || startupAction === 'open') {
        setDocument('', t('untitled'), true);
      } else {
        const saved = documentStorage.getItem('feather.document');
        setDocument(saved === null ? SAMPLE : saved, documentStorage.getItem('feather.name') || (saved === null ? '欢迎.md' : t('untitled')), true);
      }
    }
    if (nativeMobile) setSidebarView('outline');
    else await loadWorkspace(false);
    state.pollTimer = setInterval(() => {
      if (state.serverBacked) loadServerDocument(false);
    }, 1200);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
    if (!window.marked || !window.DOMPurify) {
      showToast('渲染组件未加载，已启用基础预览；联网后刷新即可');
    }
    if (startupAction === 'open') {
      const choice = await showChoiceDialog({
        title: '在新窗口中打开文档',
        message: '新窗口已经准备好。点击“选择文档”后，从设备中选择要打开的 Markdown 文件。',
        choices: [
          { value: 'select', label: '选择文档', kind: 'primary' },
          { value: 'cancel', label: '暂不打开', kind: 'quiet' }
        ]
      });
      if (choice === 'select') await openDocumentDirect();
    }
  }

  async function closeApplication() {
    state.allowUnload = true;
    if (typeof window.featherCloseWindow === 'function') {
      await window.featherCloseWindow();
      return;
    }
    if (window.FeatherNative?.closeWindow) {
      window.FeatherNative.closeWindow();
      return;
    }
    window.close();
  }

  async function requestWindowClose() {
    if (state.closePromptOpen) return;
    if (!isDocumentDirty()) {
      await closeApplication();
      return;
    }
    state.closePromptOpen = true;
    try {
      const choice = await showChoiceDialog({
        title: `关闭前保存“${state.name}”吗？`,
        message: '当前文档还有未保存的修改。你可以保存后关闭、放弃修改，或者返回继续编辑。',
        choices: [
          { value: 'save', label: '保存并关闭', kind: 'primary' },
          { value: 'discard', label: '不保存', kind: 'danger' },
          { value: 'cancel', label: '取消', kind: 'quiet' }
        ]
      });
      if (choice === 'save') {
        if (await saveDocument()) await closeApplication();
      } else if (choice === 'discard') {
        await closeApplication();
      }
    } finally {
      state.closePromptOpen = false;
    }
  }

  window.addEventListener('beforeunload', event => {
    if (state.allowUnload || !isDocumentDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.featherRequestClose = requestWindowClose;

  window.featherSaveComplete = success => {
    if (!state.nativeSaveResolver) return;
    const resolve = state.nativeSaveResolver;
    state.nativeSaveResolver = null;
    resolve(Boolean(success));
  };

  window.featherLoadDocument = (content, name) => {
    state.handle = null;
    state.serverBacked = false;
    state.workspaceFile = '';
    setDocument(String(content || ''), String(name || '未命名.md'), true);
    showToast('文档已打开');
  };

  initialise();
})();
