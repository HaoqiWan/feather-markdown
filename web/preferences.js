(() => {
  "use strict";

  const ZH = {
    documentActions: "文档操作",
    newFile: "新建",
    open: "打开",
    save: "保存",
    workspace: "工作区",
    notes: "笔记",
    noWorkspace: "未选择工作区",
    chooseWorkspace: "选择本机文件夹",
    workspaceEmptyDesc: "子文件夹将作为笔记分类",
    newNote: "新建笔记",
    newCategory: "新建分类",
    refreshWorkspace: "刷新工作区",
    workspaceSelected: "已打开工作区：{name}",
    workspaceLoadFailed: "无法读取工作区：{message}",
    workspaceSaveFailed: "工作区笔记保存失败：{message}",
    workspaceItemCreated: "已创建{name}",
    workspaceCreateFailed: "创建失败：{message}",
    workspaceCreateHint: "将在当前选中的分类中创建",
    name: "名称",
    create: "创建",
    export: "导出",
    portableMarkdown: "可移植 Markdown",
    portableMarkdownDesc: "文档与图片资源文件夹",
    print: "打印",
    printDesc: "使用系统打印设置",
    exportPdf: "导出 PDF",
    exportPdfDesc: "生成分页 PDF 文件",
    exportLongImage: "导出长图",
    exportLongImageDesc: "完整预览 PNG 图片",
    exportPreparing: "正在准备导出…",
    exportComplete: "导出完成",
    exportFailed: "导出失败：{message}",
    portableSaved: "已保存可移植 Markdown，请同时发送 .md 和 assets 文件夹",
    chooseExportFolder: "请选择用于保存 Markdown 和图片资源的文件夹",
    editor: "编辑器",
    edit: "编辑",
    preview: "预览",
    outline: "大纲",
    documentOutline: "文档大纲",
    outlineEmpty: "添加标题后会自动生成大纲",
    livePreview: "实时预览",
    insertDiagram: "插入 Mermaid 图",
    diagramTemplatesShort: "图表",
    insert: "插入",
    undo: "撤销",
    redo: "重做",
    heading1: "一级标题",
    heading2: "二级标题",
    heading3: "三级标题",
    bold: "粗体",
    italic: "斜体",
    strikethrough: "删除线",
    inlineCode: "行内代码",
    insertLink: "插入链接",
    insertImage: "插入图片",
    quote: "引用",
    unorderedList: "无序列表",
    orderedList: "有序列表",
    taskList: "任务列表",
    codeBlock: "代码块",
    table: "表格",
    horizontalRule: "分隔线",
    math: "数学公式",
    imageDialogDesc: "把本地图片保存到 Feather 素材库，或使用网络图片地址。",
    chooseLocalImage: "选择本地图片",
    imageEmbedHint: "支持 PNG、JPG、GIF、WebP、SVG；正文只保留简短引用",
    orUseImageUrl: "或使用网络图片",
    imageDescription: "图片说明",
    imageUrl: "图片地址",
    imagePasteHint: "也可以直接向编辑器粘贴或拖入图片",
    dropImagesHere: "松开以插入图片",
    imagesInserted: "已插入 {count} 张本地图片",
    imageTooLarge: "图片“{name}”超过 8 MiB，未插入",
    imageReadFailed: "无法读取图片“{name}”",
    imageStorageFailed: "无法保存图片“{name}”到本地素材库",
    embeddedImagesCompacted: "已将 {count} 张内嵌图片转换为简短引用，请保存文档",
    imageUrlInvalid: "请输入有效的 HTTP 或 HTTPS 图片地址",
    draftStorageFull: "文档较大，草稿无法写入本地缓存；请及时保存到文件",
    settings: "设置",
    fullscreen: "全屏",
    enterFullscreen: "进入全屏",
    exitFullscreen: "退出全屏",
    fullscreenHint: "按 Esc 退出全屏",
    fullscreenFailed: "无法进入全屏模式",
    maximizeWindow: "最大化",
    restoreWindow: "还原窗口",
    personalize: "个性化",
    close: "关闭",
    settingsCategories: "设置分类",
    general: "通用",
    appearance: "外观",
    keyboard: "快捷键",
    settingsSaved: "设置会自动保存在本机",
    generalDesc: "选择语言和编辑偏好。",
    language: "界面语言",
    languageDesc: "切换后立即生效，不会改变文档内容。",
    editorFontSize: "编辑器字号",
    editorFontSizeDesc: "只调整源码编辑区。",
    syncScroll: "同步滚动",
    syncScrollDesc: "编辑器滚动时同步预览位置。",
    appearanceDesc: "分别设置应用界面与 Markdown 阅读风格。",
    interfaceTheme: "界面主题",
    interfaceThemeDesc: "跟随系统或固定明暗模式",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
    readingStyle: "Markdown 风格",
    readingStyleDesc: "改变预览区的字体、间距和元素样式",
    styleFeather: "温润、适合长文",
    styleGithub: "紧凑、代码友好",
    academic: "学术",
    styleAcademic: "衬线、论文排版",
    minimal: "极简",
    styleMinimal: "留白、无边框阅读",
    accentColor: "强调色",
    accentColorDesc: "用于链接、选中状态和光标。",
    shortcutDesc: "点击组合键后直接按下新快捷键。",
    restoreDefaults: "恢复默认",
    shortcutTip: "按 Esc 取消录入，按 Backspace 清除快捷键。",
    diagramTemplates: "选择图表模板",
    diagramTemplatesDesc: "选择一种图表，将示例代码插入光标位置。",
    searchTemplates: "搜索模板",
    templateHint: "插入后可直接修改节点与文字，右侧会实时渲染。",
    cancel: "取消",
    saved: "已保存",
    unsaved: "未保存",
    saving: "保存中",
    saveRetry: "保存失败，点击重试",
    lineColumn: "第 {line} 行，第 {column} 列",
    documentStats: "{characters} 字符 · {lines} 行",
    untitled: "未命名.md",
    unnamedHeading: "未命名标题",
    themeCurrent: "主题：{theme}",
    themeChanged: "主题：{theme}",
    diagramsCount: "{count} 个模板",
    noTemplates: "没有匹配的模板",
    listening: "请按下快捷键…",
    unassigned: "未设置",
    shortcutConflict: "“{shortcut}” 已用于“{action}”，请换一个组合键。",
    shortcutsReset: "快捷键已恢复默认",
    templateInserted: "已插入{template}模板",
    mermaidSyntaxError: "Mermaid 语法有误",
    mermaidRenderFailed: "Mermaid 渲染失败：{message}",
    linkOpenFailed: "无法使用系统浏览器打开链接",
    unsupportedLink: "暂不支持打开相对路径或该类型的链接",
    showEditor: "显示编辑器",
    hideEditor: "隐藏编辑器",
    showOutline: "展开大纲",
    hideOutline: "收起大纲",
    editorShown: "已显示编辑器",
    readerMode: "已切换到阅读模式",
    outlineShown: "已展开大纲",
    outlineHidden: "已收起大纲",
    actionNew: "新建文档",
    actionOpen: "打开文档",
    actionSave: "保存文档",
    actionUndo: "撤销编辑",
    actionRedo: "重做编辑",
    actionSettings: "打开设置",
    actionFullscreen: "切换全屏模式",
    actionBold: "粗体",
    actionItalic: "斜体",
    actionLink: "插入链接",
    actionCode: "行内代码",
    actionHeading: "二级标题",
    actionOutline: "切换大纲",
    actionEditor: "切换编辑器",
    actionTheme: "切换界面主题",
    actionMermaid: "打开图表模板",
    tplFlowchart: "流程图",
    tplFlowchartDesc: "步骤、判断与流程分支",
    tplSequence: "时序图",
    tplSequenceDesc: "角色之间的消息交互",
    tplClass: "类图",
    tplClassDesc: "类、属性与继承关系",
    tplState: "状态图",
    tplStateDesc: "状态与转换条件",
    tplER: "实体关系图",
    tplERDesc: "数据实体及其关系",
    tplGantt: "甘特图",
    tplGanttDesc: "项目阶段与时间计划",
    tplPie: "饼图",
    tplPieDesc: "占比和构成数据",
    tplMindmap: "思维导图",
    tplMindmapDesc: "层级化整理想法",
    tplJourney: "用户旅程",
    tplJourneyDesc: "体验阶段与满意度",
    tplGit: "Git 分支图",
    tplGitDesc: "提交、分支和合并历史",
  };
  const EN = {
    documentActions: "Document actions",
    newFile: "New",
    open: "Open",
    save: "Save",
    workspace: "Workspace",
    notes: "Notes",
    noWorkspace: "No workspace selected",
    chooseWorkspace: "Choose a local folder",
    workspaceEmptyDesc: "Subfolders become note categories",
    newNote: "New note",
    newCategory: "New category",
    refreshWorkspace: "Refresh workspace",
    workspaceSelected: "Workspace opened: {name}",
    workspaceLoadFailed: "Could not load workspace: {message}",
    workspaceSaveFailed: "Could not save workspace note: {message}",
    workspaceItemCreated: "Created {name}",
    workspaceCreateFailed: "Could not create item: {message}",
    workspaceCreateHint: "The item will be created in the selected category",
    name: "Name",
    create: "Create",
    export: "Export",
    portableMarkdown: "Portable Markdown",
    portableMarkdownDesc: "Document with an image asset folder",
    print: "Print",
    printDesc: "Use the system print dialog",
    exportPdf: "Export PDF",
    exportPdfDesc: "Create a paginated PDF file",
    exportLongImage: "Export long image",
    exportLongImageDesc: "Complete preview as a PNG image",
    exportPreparing: "Preparing export…",
    exportComplete: "Export complete",
    exportFailed: "Export failed: {message}",
    portableSaved: "Portable Markdown saved. Send both the .md file and its assets folder.",
    chooseExportFolder: "Choose a folder for the Markdown file and image assets",
    editor: "Editor",
    edit: "Edit",
    preview: "Preview",
    outline: "Outline",
    documentOutline: "Document outline",
    outlineEmpty: "Headings will appear here automatically",
    livePreview: "Live preview",
    insertDiagram: "Insert Mermaid diagram",
    diagramTemplatesShort: "Diagram",
    insert: "Insert",
    undo: "Undo",
    redo: "Redo",
    heading1: "Heading 1",
    heading2: "Heading 2",
    heading3: "Heading 3",
    bold: "Bold",
    italic: "Italic",
    strikethrough: "Strikethrough",
    inlineCode: "Inline code",
    insertLink: "Insert link",
    insertImage: "Insert image",
    quote: "Quote",
    unorderedList: "Bulleted list",
    orderedList: "Numbered list",
    taskList: "Task list",
    codeBlock: "Code block",
    table: "Table",
    horizontalRule: "Horizontal rule",
    math: "Math formula",
    imageDialogDesc: "Save local images in Feather's asset library or use an image URL.",
    chooseLocalImage: "Choose local images",
    imageEmbedHint: "PNG, JPG, GIF, WebP, or SVG; Markdown keeps only a short reference",
    orUseImageUrl: "or use an image URL",
    imageDescription: "Image description",
    imageUrl: "Image URL",
    imagePasteHint: "You can also paste or drag images directly into the editor",
    dropImagesHere: "Drop to insert images",
    imagesInserted: "Inserted {count} local image(s)",
    imageTooLarge: "“{name}” is larger than 8 MiB and was not inserted.",
    imageReadFailed: "Could not read “{name}”.",
    imageStorageFailed: "Could not save “{name}” to the local asset library.",
    embeddedImagesCompacted: "Converted {count} embedded image(s) to short references. Save the document to keep the change.",
    imageUrlInvalid: "Enter a valid HTTP or HTTPS image URL.",
    draftStorageFull: "This document is too large for local draft storage. Save it to a file soon.",
    settings: "Settings",
    fullscreen: "Fullscreen",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    fullscreenHint: "Press Esc to exit fullscreen",
    fullscreenFailed: "Could not enter fullscreen mode.",
    maximizeWindow: "Maximize",
    restoreWindow: "Restore down",
    personalize: "PERSONALIZE",
    close: "Close",
    settingsCategories: "Settings categories",
    general: "General",
    appearance: "Appearance",
    keyboard: "Keyboard",
    settingsSaved: "Settings are saved on this device",
    generalDesc: "Choose your language and editing preferences.",
    language: "Interface language",
    languageDesc: "Applies immediately without changing document content.",
    editorFontSize: "Editor font size",
    editorFontSizeDesc: "Only changes the source editor.",
    syncScroll: "Synchronized scrolling",
    syncScrollDesc: "Keep preview position in sync while editing.",
    appearanceDesc:
      "Style the app interface and Markdown reading view independently.",
    interfaceTheme: "Interface theme",
    interfaceThemeDesc: "Follow your system or use a fixed mode",
    system: "System",
    light: "Light",
    dark: "Dark",
    readingStyle: "Markdown style",
    readingStyleDesc: "Changes typography, spacing, and rendered elements",
    styleFeather: "Warm, made for long reads",
    styleGithub: "Compact and code-friendly",
    academic: "Academic",
    styleAcademic: "Serif, paper-like typesetting",
    minimal: "Minimal",
    styleMinimal: "Open space, borderless reading",
    accentColor: "Accent color",
    accentColorDesc: "Used for links, selections, and the caret.",
    shortcutDesc: "Select a shortcut, then press a new key combination.",
    restoreDefaults: "Restore defaults",
    shortcutTip:
      "Press Esc to cancel recording or Backspace to clear a shortcut.",
    diagramTemplates: "Choose a diagram template",
    diagramTemplatesDesc:
      "Pick a diagram and insert editable example code at the cursor.",
    searchTemplates: "Search templates",
    templateHint:
      "Edit nodes and labels after insertion; the preview renders in real time.",
    cancel: "Cancel",
    saved: "Saved",
    unsaved: "Unsaved",
    saving: "Saving",
    saveRetry: "Save failed — click to retry",
    lineColumn: "Line {line}, column {column}",
    documentStats: "{characters} characters · {lines} lines",
    untitled: "Untitled.md",
    unnamedHeading: "Untitled heading",
    themeCurrent: "Theme: {theme}",
    themeChanged: "Theme: {theme}",
    diagramsCount: "{count} templates",
    noTemplates: "No matching templates",
    listening: "Press a shortcut…",
    unassigned: "Unassigned",
    shortcutConflict:
      "“{shortcut}” is already assigned to “{action}”. Choose another shortcut.",
    shortcutsReset: "Shortcuts restored to defaults",
    templateInserted: "{template} template inserted",
    mermaidSyntaxError: "Invalid Mermaid syntax",
    mermaidRenderFailed: "Mermaid could not render: {message}",
    linkOpenFailed: "Could not open the link in your default browser.",
    unsupportedLink: "Relative paths and this link type are not supported yet.",
    showEditor: "Show editor",
    hideEditor: "Hide editor",
    showOutline: "Expand outline",
    hideOutline: "Collapse outline",
    editorShown: "Editor shown",
    readerMode: "Switched to reading mode",
    outlineShown: "Outline expanded",
    outlineHidden: "Outline collapsed",
    actionNew: "New document",
    actionOpen: "Open document",
    actionSave: "Save document",
    actionUndo: "Undo edit",
    actionRedo: "Redo edit",
    actionSettings: "Open settings",
    actionFullscreen: "Toggle fullscreen mode",
    actionBold: "Bold",
    actionItalic: "Italic",
    actionLink: "Insert link",
    actionCode: "Inline code",
    actionHeading: "Level 2 heading",
    actionOutline: "Toggle outline",
    actionEditor: "Toggle editor",
    actionTheme: "Cycle interface theme",
    actionMermaid: "Open diagram templates",
    tplFlowchart: "Flowchart",
    tplFlowchartDesc: "Steps, decisions, and branches",
    tplSequence: "Sequence diagram",
    tplSequenceDesc: "Messages exchanged between actors",
    tplClass: "Class diagram",
    tplClassDesc: "Classes, properties, and inheritance",
    tplState: "State diagram",
    tplStateDesc: "States and transition conditions",
    tplER: "Entity relationship",
    tplERDesc: "Data entities and relationships",
    tplGantt: "Gantt chart",
    tplGanttDesc: "Project phases and timeline",
    tplPie: "Pie chart",
    tplPieDesc: "Proportions and composition",
    tplMindmap: "Mind map",
    tplMindmapDesc: "Organize ideas hierarchically",
    tplJourney: "User journey",
    tplJourneyDesc: "Experience stages and satisfaction",
    tplGit: "Git graph",
    tplGitDesc: "Commits, branches, and merges",
  };
  const DICTIONARIES = { "zh-CN": ZH, en: EN };
  const DEFAULT_SHORTCUTS = {
    new: "Mod+N",
    open: "Mod+O",
    save: "Mod+S",
    undo: "Mod+Z",
    redo: "Mod+Y",
    settings: "Mod+Comma",
    fullscreen: "F11",
    bold: "Mod+B",
    italic: "Mod+I",
    link: "Mod+K",
    code: "Mod+Shift+C",
    heading: "Mod+2",
    outline: "Mod+Shift+L",
    editor: "Mod+Shift+E",
    theme: "Mod+Shift+T",
    mermaid: "Mod+Alt+M",
  };
  const ACTIONS = [
    ["new", "actionNew"],
    ["open", "actionOpen"],
    ["save", "actionSave"],
    ["undo", "actionUndo"],
    ["redo", "actionRedo"],
    ["settings", "actionSettings"],
    ["fullscreen", "actionFullscreen"],
    ["bold", "actionBold"],
    ["italic", "actionItalic"],
    ["link", "actionLink"],
    ["code", "actionCode"],
    ["heading", "actionHeading"],
    ["outline", "actionOutline"],
    ["editor", "actionEditor"],
    ["theme", "actionTheme"],
    ["mermaid", "actionMermaid"],
  ];
  const TEMPLATES = [
    {
      id: "flowchart",
      name: "tplFlowchart",
      desc: "tplFlowchartDesc",
      code: `flowchart LR
    A([开始]) --> B[处理数据]
    B --> C{是否通过?}
    C -- 是 --> D([完成])
    C -- 否 --> B`,
    },
    {
      id: "sequence",
      name: "tplSequence",
      desc: "tplSequenceDesc",
      code: `sequenceDiagram
    actor U as 用户
    participant A as 应用
    participant S as 服务
    U->>A: 提交请求
    A->>S: 获取数据
    S-->>A: 返回结果
    A-->>U: 展示结果`,
    },
    {
      id: "class",
      name: "tplClass",
      desc: "tplClassDesc",
      code: `classDiagram
    class Document {
      +String title
      +save()
      +render()
    }
    class MarkdownDocument
    Document <|-- MarkdownDocument`,
    },
    {
      id: "state",
      name: "tplState",
      desc: "tplStateDesc",
      code: `stateDiagram-v2
    [*] --> Draft
    Draft --> Review: 提交
    Review --> Draft: 修改
    Review --> Published: 通过
    Published --> [*]`,
    },
    {
      id: "er",
      name: "tplER",
      desc: "tplERDesc",
      code: `erDiagram
    USER ||--o{ DOCUMENT : creates
    DOCUMENT ||--o{ REVISION : contains
    USER { string id PK
      string name }
    DOCUMENT { string id PK
      string title }`,
    },
    {
      id: "gantt",
      name: "tplGantt",
      desc: "tplGanttDesc",
      code: `gantt
    title 项目计划
    dateFormat YYYY-MM-DD
    section 设计
    需求梳理 :a1, 2026-09-22, 3d
    原型设计 :after a1, 4d
    section 开发
    功能实现 :2026-09-29, 7d
    测试发布 :3d`,
    },
    {
      id: "pie",
      name: "tplPie",
      desc: "tplPieDesc",
      code: `pie showData
    title 内容类型
    "文档" : 48
    "图表" : 27
    "代码" : 25`,
    },
    {
      id: "mindmap",
      name: "tplMindmap",
      desc: "tplMindmapDesc",
      code: `mindmap
  root((产品计划))
    用户体验
      编辑器
      预览
    内容能力
      Markdown
      Mermaid`,
    },
    {
      id: "journey",
      name: "tplJourney",
      desc: "tplJourneyDesc",
      code: `journey
    title 文档编辑体验
    section 开始
      打开文档: 5: 用户
      选择模板: 4: 用户
    section 创作
      编写内容: 5: 用户
      检查预览: 4: 用户`,
    },
    {
      id: "git",
      name: "tplGit",
      desc: "tplGitDesc",
      code: `gitGraph
    commit id: "初始化"
    branch feature
    checkout feature
    commit id: "新增功能"
    checkout main
    merge feature
    commit id: "发布"`,
    },
  ];
  const defaults = {
    language: navigator.language.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : "en",
    theme: localStorage.getItem("feather.theme") || "system",
    readingStyle: "feather",
    accent: "fern",
    editorFontSize: 14,
    syncScroll: true,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  };
  let settings = loadSettings(),
    callbacks = {},
    recordingAction = null;
  const $ = (selector) => document.querySelector(selector);

  function loadSettings() {
    try {
      const value = JSON.parse(
        localStorage.getItem("feather.settings") || "{}",
      );
      return {
        ...defaults,
        ...value,
        shortcuts: { ...DEFAULT_SHORTCUTS, ...(value.shortcuts || {}) },
      };
    } catch {
      return { ...defaults, shortcuts: { ...DEFAULT_SHORTCUTS } };
    }
  }
  function saveSettings() {
    localStorage.setItem("feather.settings", JSON.stringify(settings));
    localStorage.setItem("feather.theme", settings.theme);
  }
  function t(key, values = {}) {
    let value = (DICTIONARIES[settings.language] || ZH)[key] || ZH[key] || key;
    Object.entries(values).forEach(
      ([name, replacement]) =>
        (value = value.replaceAll(`{${name}}`, String(replacement))),
    );
    return value;
  }
  function escapeHTML(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }
  function resolvedTheme() {
    return ["dark", "light"].includes(settings.theme)
      ? settings.theme
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }
  function applyLanguage() {
    document.documentElement.lang = settings.language;
    document
      .querySelectorAll("[data-i18n]")
      .forEach((node) => (node.textContent = t(node.dataset.i18n)));
    document
      .querySelectorAll("[data-i18n-title]")
      .forEach((node) => (node.title = t(node.dataset.i18nTitle)));
    document
      .querySelectorAll("[data-i18n-aria]")
      .forEach((node) =>
        node.setAttribute("aria-label", t(node.dataset.i18nAria)),
      );
    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach((node) => (node.placeholder = t(node.dataset.i18nPlaceholder)));
  }
  function apply() {
    if (settings.theme === "system")
      delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.readingStyle = settings.readingStyle;
    if (settings.accent === "fern")
      delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = settings.accent;
    const editor = $("#editor");
    if (editor) editor.style.fontSize = `${settings.editorFontSize}px`;
    const size = $("#editor-font-size"),
      output = $("#editor-font-size-value"),
      sync = $("#sync-scroll-toggle");
    if (size) size.value = settings.editorFontSize;
    if (output) output.value = `${settings.editorFontSize} px`;
    if (sync) sync.checked = settings.syncScroll;
    document
      .querySelectorAll("[data-language]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.language === settings.language,
        ),
      );
    document
      .querySelectorAll("[data-theme-choice]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.themeChoice === settings.theme,
        ),
      );
    document
      .querySelectorAll("[data-reading-style]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.readingStyle === settings.readingStyle,
        ),
      );
    document
      .querySelectorAll("[data-accent]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.accent === settings.accent,
        ),
      );
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = resolvedTheme() === "dark" ? "#141817" : "#f3f8fc";
    applyLanguage();
    renderShortcuts();
    renderTemplates($("#template-search")?.value || "");
    refreshHints();
  }
  function notify(kind) {
    apply();
    saveSettings();
    callbacks.onChange?.(kind);
  }
  function setTheme(theme, shouldNotify = true) {
    settings.theme = theme;
    if (shouldNotify) notify("theme");
    else {
      apply();
      saveSettings();
    }
    return theme;
  }
  function cycleTheme() {
    const next =
      { system: "light", light: "dark", dark: "system" }[settings.theme] ||
      "system";
    return setTheme(next);
  }
  function openSettings(page = "general") {
    selectPage(page);
    const dialog = $("#settings-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  function selectPage(page) {
    document
      .querySelectorAll("[data-settings-tab]")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.settingsTab === page),
      );
    document
      .querySelectorAll("[data-settings-page]")
      .forEach((section) =>
        section.classList.toggle(
          "active",
          section.dataset.settingsPage === page,
        ),
      );
    const content = $(".settings-content");
    if (content) content.scrollTop = 0;
  }
  function eventShortcut(event) {
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push("Mod");
    if (event.altKey) keys.push("Alt");
    if (event.shiftKey) keys.push("Shift");
    let key = event.key;
    if (["Control", "Meta", "Alt", "Shift"].includes(key)) return "";
    key =
      {
        ",": "Comma",
        ".": "Period",
        " ": "Space",
        Escape: "Esc",
        ArrowUp: "Up",
        ArrowDown: "Down",
        ArrowLeft: "Left",
        ArrowRight: "Right",
      }[key] || (key.length === 1 ? key.toUpperCase() : key);
    keys.push(key);
    return keys.join("+");
  }
  function displayShortcut(shortcut) {
    if (!shortcut) return t("unassigned");
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    return shortcut
      .split("+")
      .map(
        (part) =>
          ({
            Mod: mac ? "⌘" : "Ctrl",
            Alt: mac ? "⌥" : "Alt",
            Shift: mac ? "⇧" : "Shift",
            Comma: ",",
            Period: ".",
          })[part] || part,
      )
      .join(mac ? "" : " + ");
  }
  function renderShortcuts() {
    const list = $("#shortcut-list");
    if (!list) return;
    list.replaceChildren();
    ACTIONS.forEach(([action, label]) => {
      const row = document.createElement("div");
      row.className = "shortcut-row";
      const name = document.createElement("span");
      name.textContent = t(label);
      const key = document.createElement("button");
      key.type = "button";
      key.className = "shortcut-key";
      key.dataset.shortcutAction = action;
      key.textContent =
        recordingAction === action
          ? t("listening")
          : displayShortcut(settings.shortcuts[action]);
      key.classList.toggle("recording", recordingAction === action);
      key.addEventListener("click", () => {
        recordingAction = action;
        $("#shortcut-conflict").hidden = true;
        renderShortcuts();
        document.querySelector(`[data-shortcut-action="${action}"]`)?.focus();
      });
      row.append(name, key);
      list.append(row);
    });
  }
  function captureShortcut(event) {
    if (!recordingAction) return false;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      recordingAction = null;
      renderShortcuts();
      return true;
    }
    if (["Backspace", "Delete"].includes(event.key)) {
      settings.shortcuts[recordingAction] = "";
      recordingAction = null;
      notify("shortcuts");
      return true;
    }
    const shortcut = eventShortcut(event);
    if (!shortcut) return true;
    const conflict = Object.entries(settings.shortcuts).find(
      ([action, value]) => action !== recordingAction && value === shortcut,
    );
    if (conflict) {
      const label = ACTIONS.find(([action]) => action === conflict[0])?.[1];
      const alert = $("#shortcut-conflict");
      alert.textContent = t("shortcutConflict", {
        shortcut: displayShortcut(shortcut),
        action: t(label),
      });
      alert.hidden = false;
      return true;
    }
    settings.shortcuts[recordingAction] = shortcut;
    recordingAction = null;
    $("#shortcut-conflict").hidden = true;
    notify("shortcuts");
    return true;
  }
  function actionForEvent(event) {
    const shortcut = eventShortcut(event);
    const configured = Object.entries(settings.shortcuts).find(
      ([, value]) => value && value === shortcut,
    )?.[0];
    if (configured) return configured;
    // Ctrl/Cmd+Shift+Z is a standard redo alias on many platforms.
    if (shortcut === "Mod+Shift+Z") return "redo";
    return null;
  }
  function refreshHints() {
    const mapping = {
      "#new-button": "new",
      "#open-button": "open",
      "#save-button": "save",
      "#settings-button": "settings",
      "#fullscreen-button": "fullscreen",
    };
    Object.entries(mapping).forEach(([selector, action]) => {
      const element = $(selector);
      if (!element) return;
      const label =
          action === "new"
            ? t("newFile")
            : action === "settings"
              ? t("settings")
              : action === "fullscreen"
                ? t("enterFullscreen")
                : t(action),
        shortcut = settings.shortcuts[action];
      element.title = shortcut
        ? `${label} (${displayShortcut(shortcut)})`
        : label;
    });
  }
  function thumbnail(type) {
    const common =
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"',
      drawings = {
        flowchart:
          '<rect x="12" y="28" width="30" height="20" rx="5"/><path d="M42 38h22m8-12 14 12-14 12-14-12 14-12m14 12h18"/><rect x="104" y="28" width="30" height="20" rx="10"/>',
        sequence:
          '<path d="M25 20v48m45-48v48m45-48v48M25 30h45l-7-5m7 18h45l-7-5M115 56H70l7-5"/><circle cx="25" cy="15" r="5"/><circle cx="70" cy="15" r="5"/><circle cx="115" cy="15" r="5"/>',
        class:
          '<rect x="15" y="16" width="48" height="48" rx="3"/><path d="M15 31h48M15 45h48M80 24h48v38H80zM63 40h17"/>',
        state:
          '<circle cx="17" cy="40" r="6" fill="currentColor"/><path d="M23 40h20m-5-5 5 5-5 5"/><rect x="45" y="28" width="35" height="24" rx="12"/><path d="M80 40h20m-5-5 5 5-5 5"/><circle cx="113" cy="40" r="11"/><circle cx="113" cy="40" r="6" fill="currentColor"/>',
        er: '<rect x="9" y="21" width="42" height="34" rx="3"/><rect x="92" y="21" width="42" height="34" rx="3"/><path d="M51 38h41M58 33v10m27-10v10"/>',
        gantt:
          '<path d="M14 16v48h122M28 16v48M58 16v48M88 16v48M118 16v48" opacity=".25"/><rect x="25" y="24" width="48" height="8" rx="4" fill="currentColor" stroke="none"/><rect x="55" y="38" width="60" height="8" rx="4" fill="currentColor" stroke="none" opacity=".7"/>',
        pie: '<path d="M74 40V12a28 28 0 1 1-20 8z"/><path d="M74 40h28A28 28 0 0 0 74 12z" fill="currentColor" opacity=".35"/>',
        mindmap:
          '<circle cx="72" cy="39" r="14"/><path d="M58 34H35L24 22m34 22H35L24 56m62-22h23l11-12M86 44h23l11 12"/><circle cx="20" cy="18" r="5"/><circle cx="124" cy="60" r="5"/>',
        journey:
          '<path d="M12 58c16-4 20-29 38-27s18 21 33 16 18-26 32-25 17 11 21 18"/><circle cx="12" cy="58" r="4" fill="currentColor"/><circle cx="50" cy="31" r="4" fill="currentColor"/><circle cx="83" cy="47" r="4" fill="currentColor"/>',
        git: '<path d="M42 14v50m0-32c0 16 45 4 45 20v12M87 14v14c0 12-45 5-45 20"/><circle cx="42" cy="14" r="5" fill="currentColor"/><circle cx="42" cy="39" r="5" fill="currentColor"/><circle cx="42" cy="64" r="5" fill="currentColor"/><circle cx="87" cy="14" r="5" fill="currentColor"/><circle cx="87" cy="64" r="5" fill="currentColor"/>',
      };
    return `<svg viewBox="0 0 150 80" aria-hidden="true"><g ${common}>${drawings[type] || drawings.flowchart}</g></svg>`;
  }
  function renderTemplates(query = "") {
    const grid = $("#mermaid-templates");
    if (!grid) return;
    const normalized = query.trim().toLowerCase(),
      filtered = TEMPLATES.filter((template) =>
        `${t(template.name)} ${t(template.desc)} ${template.id}`
          .toLowerCase()
          .includes(normalized),
      );
    grid.replaceChildren();
    filtered.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "template-card";
      button.innerHTML = `<span class="diagram-thumbnail">${thumbnail(template.id)}</span><span><strong>${escapeHTML(t(template.name))}</strong><small>${escapeHTML(t(template.desc))}</small></span>`;
      button.addEventListener("click", () => insertTemplate(template));
      grid.append(button);
    });
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-hint";
      empty.textContent = t("noTemplates");
      grid.append(empty);
    }
    $("#template-count").textContent = t("diagramsCount", {
      count: filtered.length,
    });
  }
  function insertTemplate(template) {
    const editor = $("#editor"),
      start = editor.selectionStart,
      end = editor.selectionEnd,
      prefix = start && editor.value[start - 1] !== "\n" ? "\n\n" : "",
      suffix =
        end < editor.value.length && editor.value[end] !== "\n" ? "\n\n" : "\n",
      block = `${prefix}\`\`\`mermaid\n${template.code}\n\`\`\`${suffix}`;
    editor.setRangeText(block, start, end, "end");
    editor.selectionStart = start + prefix.length + 11;
    editor.selectionEnd = editor.selectionStart + template.code.length;
    $("#mermaid-dialog").close();
    editor.focus();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    callbacks.onToast?.(t("templateInserted", { template: t(template.name) }));
  }
  function openTemplates() {
    const search = $("#template-search");
    search.value = "";
    renderTemplates();
    const dialog = $("#mermaid-dialog");
    if (!dialog.open) dialog.showModal();
    setTimeout(() => search.focus(), 30);
  }
  function bind() {
    document
      .querySelectorAll("[data-close-feature-dialog]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          button.closest("dialog").close(),
        ),
      );
    document.querySelectorAll(".feature-dialog").forEach((dialog) =>
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      }),
    );
    document
      .querySelectorAll("[data-settings-tab]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          selectPage(button.dataset.settingsTab),
        ),
      );
    document.querySelectorAll("[data-language]").forEach((button) =>
      button.addEventListener("click", () => {
        settings.language = button.dataset.language;
        notify("language");
      }),
    );
    document
      .querySelectorAll("[data-theme-choice]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          setTheme(button.dataset.themeChoice),
        ),
      );
    document.querySelectorAll("[data-reading-style]").forEach((button) =>
      button.addEventListener("click", () => {
        settings.readingStyle = button.dataset.readingStyle;
        notify("style");
      }),
    );
    document.querySelectorAll("[data-accent]").forEach((button) =>
      button.addEventListener("click", () => {
        settings.accent = button.dataset.accent;
        notify("accent");
      }),
    );
    $("#editor-font-size").addEventListener("input", (event) => {
      settings.editorFontSize = Number(event.target.value);
      notify("font");
    });
    $("#sync-scroll-toggle").addEventListener("change", (event) => {
      settings.syncScroll = event.target.checked;
      notify("sync");
    });
    $("#reset-shortcuts").addEventListener("click", () => {
      settings.shortcuts = { ...DEFAULT_SHORTCUTS };
      recordingAction = null;
      notify("shortcuts");
      callbacks.onToast?.(t("shortcutsReset"));
    });
    $("#template-search").addEventListener("input", (event) =>
      renderTemplates(event.target.value),
    );
  }
  function init(options = {}) {
    callbacks = options;
    bind();
    apply();
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => {
        if (settings.theme === "system") {
          apply();
          callbacks.onChange?.("theme");
        }
      },
    );
  }
  window.FeatherPreferences = {
    init,
    t,
    apply,
    setTheme,
    cycleTheme,
    openSettings,
    openTemplates,
    captureShortcut,
    actionForEvent,
    displayShortcut,
    get settings() {
      return settings;
    },
    resolvedTheme,
  };
})();
