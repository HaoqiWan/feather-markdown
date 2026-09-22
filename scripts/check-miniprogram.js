const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mini = path.join(root, 'wechat-miniprogram');
const required = [
  'app.js',
  'app.json',
  'app.wxss',
  'assets/logo.svg',
  'project.config.json',
  'sitemap.json',
  'pages/index/index.js',
  'pages/index/index.json',
  'pages/index/index.wxml',
  'pages/index/index.wxss',
  'utils/markdown.js'
];

for (const relative of required) {
  const filename = path.join(mini, relative);
  if (!fs.existsSync(filename)) throw new Error(`Missing mini program file: ${relative}`);
}

for (const relative of required.filter(file => file.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(path.join(mini, relative), 'utf8'));
}

for (const relative of required.filter(file => file.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(mini, relative), 'utf8');
  new Function('require', 'module', 'exports', 'App', 'Page', 'wx', source);
}

const markdown = require(path.join(mini, 'utils/markdown'));
const rendered = markdown.renderMarkdown(`# 标题

- [x] 完成

| A | B |
| --- | --- |
| 1 | 2 |

<script>alert('unsafe')</script>`);

if (!rendered.includes('<h1>标题</h1>')) throw new Error('Heading rendering failed');
if (!rendered.includes('<table>')) throw new Error('Table rendering failed');
if (!rendered.includes('☑')) throw new Error('Task rendering failed');
if (rendered.includes('<script>')) throw new Error('Raw HTML was not escaped');

const pageTemplate = fs.readFileSync(path.join(mini, 'pages/index/index.wxml'), 'utf8');
if (!pageTemplate.includes('wx:if="{{!editing}}"') || !pageTemplate.includes('wx:else class="editor-view"')) {
  throw new Error('Preview/editor replacement flow is missing');
}

console.log('WeChat mini program checks passed.');
