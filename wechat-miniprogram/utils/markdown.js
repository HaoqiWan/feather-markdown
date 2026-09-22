const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ESCAPES[character]);
}

function safeURL(value, image) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url)) return escapeHTML(url);
  if (image && /^(?:wxfile|file):\/\//i.test(url)) return escapeHTML(url);
  if (image && /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(url)) return escapeHTML(url);
  return '';
}

function renderInline(source) {
  let value = escapeHTML(source);
  value = value.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  value = value.replace(/!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, alt, url) => {
    const safe = safeURL(url, true);
    return safe ? `<img src="${safe}" alt="${alt}">` : `![${alt}](${url})`;
  });
  value = value.replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, label, url) => {
    const safe = safeURL(url, false);
    return safe ? `<a href="${safe}">${label}</a>` : label;
  });
  value = value.replace(/~~(.+?)~~/g, '<del>$1</del>');
  value = value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__(.+?)__/g, '<strong>$1</strong>');
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  value = value.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  return value;
}

function isTableDivider(line) {
  const cells = String(line || '').trim().replace(/^\||\|$/g, '').split('|');
  return cells.length > 0 && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function tableCells(line) {
  return String(line || '').trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function startsBlock(line, nextLine) {
  return !line.trim()
    || /^```/.test(line.trim())
    || /^#{1,6}\s+/.test(line)
    || /^\s*>\s?/.test(line)
    || /^\s*(?:[-+*]|\d+\.)\s+/.test(line)
    || /^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)
    || (line.includes('|') && isTableDivider(nextLine));
}

function renderMarkdown(markdown) {
  const lines = String(markdown == null ? '' : markdown).replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```\s*([^\s`]*)/);
    if (fence) {
      const language = fence[1] || '';
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const label = language.toLowerCase() === 'mermaid' ? '<div class="diagram-label">Mermaid 源码</div>' : '';
      output.push(`${label}<pre><code>${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      output.push('<hr>');
      index += 1;
      continue;
    }

    if (line.includes('|') && isTableDivider(lines[index + 1])) {
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      const head = headers.map(cell => `<th>${renderInline(cell)}</th>`).join('');
      const body = rows.map(row => `<tr>${headers.map((_header, cellIndex) => `<td>${renderInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('');
      output.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      output.push(`<blockquote>${quote.map(part => renderInline(part)).join('<br>')}</blockquote>`);
      continue;
    }

    const listMatch = line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
        if (!item || /\d+\./.test(item[1]) !== ordered) break;
        const task = item[2].match(/^\[([ xX])\]\s+(.+)$/);
        if (task) {
          const mark = task[1].toLowerCase() === 'x' ? '☑' : '☐';
          items.push(`<li><span class="task-mark">${mark}</span> ${renderInline(task[2])}</li>`);
        } else {
          items.push(`<li>${renderInline(item[2])}</li>`);
        }
        index += 1;
      }
      output.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !startsBlock(lines[index], lines[index + 1])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${paragraph.map(part => renderInline(part)).join('<br>')}</p>`);
  }

  return output.join('');
}

function documentTitle(markdown, fallback) {
  const match = String(markdown || '').match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[*_`~\[\]]/g, '').trim() : (fallback || '未命名文档');
}

function documentStats(markdown) {
  const value = String(markdown || '');
  return {
    characters: value.length,
    lines: value ? value.split(/\r\n?|\n/).length : 0
  };
}

module.exports = {
  documentStats,
  documentTitle,
  renderMarkdown
};
