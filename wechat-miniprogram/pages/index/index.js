const { documentStats, documentTitle, renderMarkdown } = require('../../utils/markdown');

const STORAGE_DOCUMENT = 'feather.wechat.document';
const STORAGE_NAME = 'feather.wechat.name';
const STORAGE_THEME = 'feather.wechat.theme';

const SAMPLE = `# 欢迎使用 Feather

这是 Feather Markdown 的微信小程序版。默认显示渲染后的文档，需要修改时点击右上角的“编辑”。

## 小程序版特点

- 阅读时只显示预览
- 编辑时预览区原位切换为编辑器
- 完成编辑后立即回到预览
- 草稿自动保存在本机
- 可以从微信会话中导入 Markdown 文件

> 小程序版采用轻量单文件模式，不包含桌面端工作区。

## Markdown 示例

支持 **粗体**、*斜体*、~~删除线~~、[链接](https://github.com/HaoqiWan/feather-markdown) 与任务列表。

- [x] 打开预览
- [ ] 点击编辑并写点什么

\`\`\`javascript
const feather = 'light and focused';
console.log(feather);
\`\`\`
`;

Page({
  data: {
    markdown: '',
    renderedHTML: '',
    fileName: '欢迎.md',
    title: '欢迎使用 Feather',
    statsText: '',
    editing: false,
    dirty: false,
    editorCursor: -1,
    editorFocus: false,
    theme: 'light',
    toast: '',
    toolbar: [
      { action: 'heading', label: 'H2' },
      { action: 'bold', label: 'B' },
      { action: 'italic', label: 'I' },
      { action: 'quote', label: '❯' },
      { action: 'list', label: '•' },
      { action: 'task', label: '☐' },
      { action: 'code', label: '</>' },
      { action: 'link', label: '↗' }
    ]
  },

  onLoad() {
    const saved = wx.getStorageSync(STORAGE_DOCUMENT);
    const fileName = wx.getStorageSync(STORAGE_NAME) || '欢迎.md';
    const theme = wx.getStorageSync(STORAGE_THEME) || 'light';
    this.setData({ markdown: typeof saved === 'string' ? saved : SAMPLE, fileName, theme });
    this.refreshPreview();
    this.applyNavigationTheme();
  },

  onShareAppMessage() {
    return {
      title: `${this.data.title} · Feather Markdown`,
      path: '/pages/index/index'
    };
  },

  refreshPreview() {
    const stats = documentStats(this.data.markdown);
    this.setData({
      renderedHTML: renderMarkdown(this.data.markdown),
      title: documentTitle(this.data.markdown, this.data.fileName.replace(/\.[^.]+$/, '')),
      statsText: `${stats.characters} 字符 · ${stats.lines} 行`
    });
  },

  saveDraft() {
    wx.setStorageSync(STORAGE_DOCUMENT, this.data.markdown);
    wx.setStorageSync(STORAGE_NAME, this.data.fileName);
    this.setData({ dirty: false });
  },

  enterEdit() {
    this.setData({ editing: true, editorCursor: -1, editorFocus: true });
  },

  finishEdit() {
    this.saveDraft();
    this.refreshPreview();
    this.setData({ editing: false, editorFocus: false });
    this.showToast('已保存并返回预览');
  },

  cancelEdit() {
    if (!this.data.dirty) {
      this.setData({ editing: false, editorFocus: false });
      return;
    }
    wx.showModal({
      title: '放弃本次修改？',
      content: '未完成的修改不会保存。',
      confirmText: '放弃修改',
      confirmColor: '#a13f34',
      success: result => {
        if (!result.confirm) return;
        const saved = wx.getStorageSync(STORAGE_DOCUMENT);
        this.setData({
          markdown: typeof saved === 'string' ? saved : SAMPLE,
          editing: false,
          dirty: false,
          editorFocus: false
        });
        this.refreshPreview();
      }
    });
  },

  onEditorInput(event) {
    const markdown = event.detail.value;
    const stats = documentStats(markdown);
    this.setData({
      markdown,
      dirty: true,
      editorCursor: event.detail.cursor,
      statsText: `${stats.characters} 字符 · ${stats.lines} 行`
    });
  },

  onEditorBlur(event) {
    this.setData({ editorCursor: event.detail.cursor == null ? this.data.editorCursor : event.detail.cursor });
  },

  insertFormatting(event) {
    const action = event.currentTarget.dataset.action;
    const value = this.data.markdown;
    const cursor = this.data.editorCursor < 0 ? value.length : this.data.editorCursor;
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    let insertion = '';
    let position = cursor;

    if (action === 'heading') {
      insertion = '## ';
      position = lineStart;
    } else if (action === 'quote') {
      insertion = '> ';
      position = lineStart;
    } else if (action === 'list') {
      insertion = '- ';
      position = lineStart;
    } else if (action === 'task') {
      insertion = '- [ ] ';
      position = lineStart;
    } else {
      const templates = {
        bold: ['**文字**', 2],
        italic: ['*文字*', 1],
        code: ['\n```\n代码\n```\n', 5],
        link: ['[链接文字](https://)', 1]
      };
      const template = templates[action];
      if (!template) return;
      insertion = template[0];
    }

    const markdown = value.slice(0, position) + insertion + value.slice(position);
    const nextCursor = position + insertion.length;
    this.setData({ markdown, dirty: true, editorCursor: nextCursor, editorFocus: true });
  },

  newDocument() {
    const create = () => {
      this.setData({ markdown: '# 未命名文档\n\n从这里开始写作。', fileName: '未命名.md', dirty: true });
      this.saveDraft();
      this.refreshPreview();
      this.enterEdit();
    };
    if (!this.data.markdown.trim()) {
      create();
      return;
    }
    wx.showModal({
      title: '新建文档',
      content: '当前文档已保存在本机草稿中。确定新建吗？',
      confirmText: '新建',
      success: result => { if (result.confirm) create(); }
    });
  },

  importDocument() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['md', 'markdown', 'mdown', 'mkd', 'txt'],
      success: result => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          wx.showToast({ title: '文件不能超过 8 MiB', icon: 'none' });
          return;
        }
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: data => {
            this.setData({ markdown: data.data || '', fileName: file.name || '导入文档.md', dirty: true });
            this.saveDraft();
            this.refreshPreview();
            this.showToast('文档已导入');
          },
          fail: error => wx.showToast({ title: error.errMsg || '无法读取文件', icon: 'none' })
        });
      }
    });
  },

  copyMarkdown() {
    wx.setClipboardData({
      data: this.data.markdown,
      success: () => this.showToast('Markdown 已复制')
    });
  },

  exportDocument() {
    const cleanName = (this.data.fileName || 'Feather.md').replace(/[\\/:*?"<>|]/g, '_');
    const fileName = /\.md$/i.test(cleanName) ? cleanName : `${cleanName}.md`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    wx.getFileSystemManager().writeFile({
      filePath,
      data: this.data.markdown,
      encoding: 'utf8',
      success: () => {
        if (typeof wx.shareFileMessage === 'function') {
          wx.shareFileMessage({
            filePath,
            fileName,
            fail: () => this.copyMarkdown()
          });
        } else {
          this.copyMarkdown();
        }
      },
      fail: error => wx.showToast({ title: error.errMsg || '导出失败', icon: 'none' })
    });
  },

  toggleTheme() {
    const theme = this.data.theme === 'dark' ? 'light' : 'dark';
    this.setData({ theme });
    wx.setStorageSync(STORAGE_THEME, theme);
    this.applyNavigationTheme();
  },

  applyNavigationTheme() {
    const dark = this.data.theme === 'dark';
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: dark ? '#15211b' : '#105c3b',
      animation: { duration: 180, timingFunc: 'easeIn' }
    });
  },

  showToast(message) {
    this.setData({ toast: message });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.setData({ toast: '' }), 1800);
  }
});
