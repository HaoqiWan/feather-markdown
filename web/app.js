(() => {
  'use strict';

  const SAMPLE = `# 欢迎使用 Feather Markdown

一个不到 10MB 的轻量 Markdown 阅读与编辑器。左侧是大纲，中间编辑，右侧会实时刷新。

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
    editor: $('#editor'),
    editorPanel: $('#editor-panel'),
    preview: $('#preview'),
    previewPanel: $('#preview-panel'),
    outline: $('#outline'),
    outlinePanel: $('#outline-panel'),
    outlineEmpty: $('#outline-empty'),
    headingCount: $('#heading-count'),
    documentName: $('#document-name'),
    saveState: $('#save-state'),
    cursor: $('#cursor-position'),
    stats: $('#document-stats'),
    toast: $('#toast'),
    fileInput: $('#file-input'),
    themeButton: $('#theme-button'),
    editorToggleButton: $('#editor-toggle-button'),
    mobileTabs: $('.mobile-tabs'),
    workspace: $('.workspace')
  };

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
    externalUpdateNotified: false
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
      link.textContent = heading.textContent || '未命名标题';
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
        theme: resolvedTheme(),
        flowchart: { htmlLabels: false, useMaxWidth: true }
      });
      for (const diagram of diagrams) {
        if (sequence !== state.renderSequence) return;
        await window.mermaid.run({ nodes: [diagram], suppressErrors: true });
        if (!diagram.querySelector('svg')) {
          diagram.classList.add('render-error');
          diagram.textContent = `Mermaid 语法有误\n\n${diagram.textContent}`;
        }
      }
    } catch (error) {
      diagrams.forEach(diagram => {
        if (!diagram.querySelector('svg')) {
          diagram.classList.add('render-error');
          diagram.textContent = `Mermaid 渲染失败：${error.message}`;
        }
      });
    }
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
    buildOutline();
    await renderEnhancements(sequence);
  }

  const scheduleRender = debounce(render, 140);

  function updateStatus() {
    const text = elements.editor.value;
    const beforeCursor = text.slice(0, elements.editor.selectionStart);
    const lines = beforeCursor.split('\n');
    elements.cursor.textContent = `第 ${lines.length} 行，第 ${lines.at(-1).length + 1} 列`;
    const lineCount = text ? text.split('\n').length : 0;
    elements.stats.textContent = `${text.length.toLocaleString()} 字符 · ${lineCount.toLocaleString()} 行`;
    const dirty = text !== state.lastSaved;
    elements.saveState.textContent = dirty ? '未保存' : '已保存';
    elements.saveState.classList.toggle('dirty', dirty);
  }

  function setDocument(content, name, saved = true) {
    elements.editor.value = content;
    state.name = name || '未命名.md';
    elements.documentName.textContent = state.name;
    if (saved) state.lastSaved = content;
    localStorage.setItem('feather.document', content);
    localStorage.setItem('feather.name', state.name);
    updateStatus();
    render();
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    state.toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2200);
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

  function scheduleServerSave() {
    if (!state.serverBacked) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveToServer().catch(error => showToast(`自动保存失败：${error.message}`));
    }, 700);
  }

  async function openDocument() {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'] } }],
          multiple: false
        });
        const file = await handle.getFile();
        state.handle = handle;
        state.serverBacked = false;
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
    try {
      if (state.serverBacked) {
        await saveToServer();
        showToast('已保存到磁盘');
        return;
      }
      if (state.handle) {
        const writable = await state.handle.createWritable();
        await writable.write(elements.editor.value);
        await writable.close();
        state.lastSaved = elements.editor.value;
        updateStatus();
        showToast('已保存');
        return;
      }
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: state.name,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
        });
        state.handle = handle;
        const writable = await handle.createWritable();
        await writable.write(elements.editor.value);
        await writable.close();
        state.name = handle.name;
        elements.documentName.textContent = state.name;
        state.lastSaved = elements.editor.value;
        updateStatus();
        showToast('已保存');
        return;
      }
      const blob = new Blob([elements.editor.value], { type: 'text/markdown;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = state.name.endsWith('.md') ? state.name : `${state.name}.md`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      state.lastSaved = elements.editor.value;
      updateStatus();
      showToast('文档已下载');
    } catch (error) {
      if (error.name !== 'AbortError') showToast(`保存失败：${error.message}`);
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
      image: ['![', '](https://example.com/image.png)', '图片说明'],
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

  function runEditorCommand(command) {
    elements.editor.focus();
    document.execCommand(command);
    onEditorInput();
  }

  function applyTheme(theme) {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    localStorage.setItem('feather.theme', theme);
    elements.themeButton.title = `主题：${theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}`;
    document.querySelector('meta[name="theme-color"]').content = resolvedTheme() === 'dark' ? '#171a18' : '#f6f4ef';
  }

  function cycleTheme() {
    const current = localStorage.getItem('feather.theme') || 'system';
    const next = ({ system: 'light', light: 'dark', dark: 'system' })[current];
    applyTheme(next);
    render();
    showToast(`主题：${next === 'system' ? '跟随系统' : next === 'dark' ? '深色' : '浅色'}`);
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
    elements.editorToggleButton.title = visible
      ? '隐藏编辑器 (Ctrl+Shift+E)'
      : '显示编辑器 (Ctrl+Shift+E)';
    const editorTab = document.querySelector('.mobile-tab[data-pane="editor"]');
    editorTab.classList.toggle('hidden', !visible);
    elements.mobileTabs.classList.toggle('editor-hidden', !visible);
    if (!visible && document.body.dataset.mobilePane === 'editor') setMobilePane('preview');
    if (persist) localStorage.setItem('feather.editorVisible', String(visible));
  }

  function toggleEditor() {
    const show = elements.editorPanel.classList.contains('hidden');
    setEditorVisible(show);
    if (show && window.innerWidth <= 900) setMobilePane('editor');
    showToast(show ? '已显示编辑器' : '已切换到阅读模式');
  }

  function onEditorInput() {
    localStorage.setItem('feather.document', elements.editor.value);
    localStorage.setItem('feather.name', state.name);
    updateStatus();
    scheduleRender();
    scheduleServerSave();
  }

  function bindEvents() {
    elements.editor.addEventListener('input', onEditorInput);
    elements.editor.addEventListener('keyup', updateStatus);
    elements.editor.addEventListener('click', updateStatus);
    elements.editor.addEventListener('scroll', () => {
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
      setDocument(await file.text(), file.name, true);
      elements.fileInput.value = '';
      showToast('文档已打开');
    });

    $('#open-button').addEventListener('click', openDocument);
    $('#save-button').addEventListener('click', saveDocument);
    $('#new-button').addEventListener('click', () => {
      state.handle = null;
      state.serverBacked = false;
      setDocument('', '未命名.md', true);
      elements.editor.focus();
    });
    $('#outline-button').addEventListener('click', () => {
      elements.outlinePanel.classList.toggle('hidden');
      elements.workspace.classList.toggle('outline-collapsed', elements.outlinePanel.classList.contains('hidden'));
    });
    elements.editorToggleButton.addEventListener('click', toggleEditor);
    elements.themeButton.addEventListener('click', cycleTheme);
    document.querySelectorAll('[data-format]').forEach(button => {
      button.addEventListener('click', () => insertFormat(button.dataset.format));
    });
    document.querySelectorAll('[data-command]').forEach(button => {
      button.addEventListener('click', () => runEditorCommand(button.dataset.command));
    });
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => setMobilePane(tab.dataset.pane));
    });

    document.addEventListener('keydown', event => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveDocument();
      } else if (modifier && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        openDocument();
      } else if (modifier && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        $('#new-button').click();
      } else if (modifier && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        toggleEditor();
      } else if (event.key === 'Tab' && document.activeElement === elements.editor) {
        event.preventDefault();
        elements.editor.setRangeText('  ', elements.editor.selectionStart, elements.editor.selectionEnd, 'end');
        onEditorInput();
      }
    });

    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((localStorage.getItem('feather.theme') || 'system') === 'system') render();
    });
  }

  async function initialise() {
    applyTheme(localStorage.getItem('feather.theme') || 'system');
    const editorVisible = localStorage.getItem('feather.editorVisible') !== 'false';
    setEditorVisible(editorVisible, false);
    setMobilePane(editorVisible ? 'editor' : 'preview');
    bindEvents();
    const hasServerDocument = await loadServerDocument(true);
    if (!hasServerDocument) {
      const saved = localStorage.getItem('feather.document');
      setDocument(saved === null ? SAMPLE : saved, localStorage.getItem('feather.name') || '欢迎.md', true);
    }
    state.pollTimer = setInterval(() => {
      if (state.serverBacked) loadServerDocument(false);
    }, 1200);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    if (!window.marked || !window.DOMPurify) {
      showToast('渲染组件未加载，已启用基础预览；联网后刷新即可');
    }
  }

  initialise();
})();
