import { StatsSnapshot } from '../services/statsService';
import { Theme, generateCSSVariables } from '../assets/themes';
import { icon } from '../assets/icons';
import { getSharedStyles } from '../assets/styles';

export function getDialogHtml(
  reason: string,
  stats: StatsSnapshot,
  theme: Theme,
  showStats: boolean,
  allowImageUpload: boolean,
  allowFileReference: boolean,
): string {
  const cssVars = generateCSSVariables(theme);
  const sharedCSS = getSharedStyles();
  const escapedReason = escapeHtml(reason);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Continue</title>
  <style>
    ${sharedCSS}
    :root { ${cssVars} }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .dialog {
      max-width: 460px;
      width: 100%;
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-light),
        inset -1px -1px 2px var(--emboss-dark),
        0 8px 32px var(--shadow);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      flex-shrink: 0;
    }

    .dialog-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dialog-header-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(145deg, var(--accent-hover), var(--accent));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 8px rgba(124,108,240,0.3);
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .theme-toggle {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      transition: all 0.15s;
    }
    .theme-toggle:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    .reason-box {
      background: var(--accent-light);
      border-left: 3px solid var(--accent);
      padding: 10px 14px;
      margin-bottom: 16px;
      border-radius: 0 10px 10px 0;
      flex-shrink: 0;
    }

    .reason-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .reason-text {
      font-size: 13px;
      color: var(--text-primary);
      line-height: 1.5;
    }

    .input-section {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
    }

    .section-label {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .mention-hint {
      font-size: 10px;
      color: var(--accent);
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
    }

    .textarea-wrapper {
      position: relative;
      flex: 1;
      min-height: 100px;
    }

    textarea {
      width: 100%;
      height: 100%;
      min-height: 100px;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      resize: none;
      line-height: 1.5;
      box-shadow:
        inset 1px 1px 3px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
      transition: border-color 0.15s;
    }
    textarea::placeholder { color: var(--text-muted); }
    textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    .mention-dropdown {
      position: absolute;
      bottom: 100%;
      left: 0;
      width: 280px;
      background: var(--bg-secondary);
      border: 1px solid var(--accent);
      border-radius: 10px;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: 0 -4px 16px var(--shadow);
      z-index: 1000;
      display: none;
      margin-bottom: 4px;
    }
    .mention-dropdown.show {
      display: block;
      animation: dropUp 0.12s ease-out;
    }
    @keyframes dropUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mention-search {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
      border-radius: 10px 10px 0 0;
    }
    .mention-search::placeholder { color: var(--text-muted); }

    .mention-item {
      padding: 6px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.1s;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-primary);
      font-size: 12px;
    }
    .mention-item:last-child { border-bottom: none; }
    .mention-item:hover, .mention-item.selected { background: var(--bg-hover); }
    .mention-item .item-icon { color: var(--text-muted); flex-shrink: 0; }
    .mention-item .item-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mention-item .item-path { font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .image-section {
      flex-shrink: 0;
      margin-bottom: 12px;
      display: ${allowImageUpload ? 'block' : 'none'};
    }

    .image-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .image-list {
      background: var(--bg-tertiary);
      border: 1px dashed var(--border);
      border-radius: 10px;
      min-height: 44px;
      max-height: 80px;
      overflow-y: auto;
      padding: 6px;
      margin-bottom: 6px;
    }

    .image-empty {
      color: var(--text-muted);
      padding: 8px;
      text-align: center;
      font-size: 11px;
    }

    .image-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: var(--bg-secondary);
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 12px;
      color: var(--text-primary);
    }
    .image-item:last-child { margin-bottom: 0; }
    .image-item-name {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
    }
    .image-item-name span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .image-remove {
      background: none;
      border: none;
      color: var(--danger);
      cursor: pointer;
      padding: 2px 4px;
      display: flex;
      align-items: center;
    }

    .btn-add-image {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 12px;
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-add-image:hover {
      border-color: var(--accent);
      color: var(--text-primary);
    }

    .btn-row {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .stats-bar {
      display: ${showStats ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      font-size: 11px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .stats-bar .stat-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .stats-bar .stat-value {
      color: var(--text-secondary);
      font-weight: 600;
    }

    .shortcut-hint {
      text-align: center;
      margin-top: 8px;
      font-size: 10px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .shortcut-hint kbd {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 1px 4px;
      font-family: inherit;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="dialog">
    <div class="dialog-header">
      <div class="dialog-header-left">
        <div class="dialog-header-icon">${icon('play', 18)}</div>
        <span class="dialog-title">MCP Continue</span>
      </div>
      <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">
        ${theme.name === 'dark' ? icon('sun', 16) : icon('moon', 16)}
      </button>
    </div>

    <div class="reason-box">
      <div class="reason-label">${icon('cornerDownRight', 10)} AI 请求结束对话</div>
      <div class="reason-text">${escapedReason}</div>
    </div>

    <div class="input-section">
      <div class="section-label">
        ${icon('penLine', 12)} 指令（可选）
        ${allowFileReference ? '<span class="mention-hint">@ 引用文件</span>' : ''}
      </div>
      <div class="textarea-wrapper">
        <div class="mention-dropdown" id="mentionDropdown">
          <input type="text" class="mention-search" id="mentionSearch" placeholder="搜索文件...">
          <div id="mentionList"></div>
        </div>
        <textarea id="instruction" placeholder="输入新指令或留空继续...${allowFileReference ? ' @ 引用文件' : ''}" autofocus></textarea>
      </div>
    </div>

    <div class="image-section">
      <div class="image-header">
        <div class="section-label">${icon('imagePlus', 12)} 图片（可选）</div>
      </div>
      <div class="image-list" id="imageList">
        <div class="image-empty">拖拽或粘贴图片到此处</div>
      </div>
      <button class="btn-add-image" onclick="selectImages()">
        ${icon('paperclip', 12)} 选择图片
      </button>
    </div>

    <div class="btn-row">
      <button class="emboss-btn emboss-btn-primary" onclick="onContinue()" style="flex:1">
        ${icon('play', 14)} 继续
      </button>
      <button class="emboss-btn emboss-btn-danger" onclick="onEnd()" style="flex:1">
        ${icon('square', 14)} 结束
      </button>
    </div>

    <div class="stats-bar">
      <span class="stat-item">${icon('activity', 12)} <span class="stat-value">${stats.totalCalls}</span> 调用</span>
      <span class="stat-item">${icon('play', 10)} <span class="stat-value">${stats.continueCount}</span> 继续</span>
      <span class="stat-item">${icon('square', 10)} <span class="stat-value">${stats.endCount}</span> 结束</span>
      <span class="stat-item">${icon('clock', 12)} ${stats.sessionUptime}</span>
    </div>

    <div class="shortcut-hint">
      <kbd>Enter</kbd> 继续 · <kbd>Shift+Enter</kbd> 换行 · <kbd>Esc</kbd> 结束
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const vscode = acquireVsCodeApi();
    let imageContents = [];
    let mentionFiles = [];
    let mentionActive = false;
    let mentionSelectedIndex = 0;

    const textarea = document.getElementById('instruction');
    const mentionDropdown = document.getElementById('mentionDropdown');
    const mentionSearch = document.getElementById('mentionSearch');
    const mentionList = document.getElementById('mentionList');

    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onContinue();
        return;
      }
      if (e.key === 'Escape') {
        if (mentionActive) {
          closeMention();
          return;
        }
        onEnd();
        return;
      }
      if (mentionActive) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          mentionSelectedIndex = Math.max(0, mentionSelectedIndex - 1);
          updateMentionSelection();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          mentionSelectedIndex = Math.min(mentionFiles.length - 1, mentionSelectedIndex + 1);
          updateMentionSelection();
          return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          insertMention();
          return;
        }
      }
    });

    textarea.addEventListener('input', function(e) {
      const value = textarea.value;
      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);
      const atMatch = textBefore.match(/@([^\\s@]*)$/);

      if (atMatch && ${allowFileReference}) {
        const query = atMatch[1].toLowerCase();
        mentionActive = true;
        mentionSelectedIndex = 0;
        mentionDropdown.classList.add('show');
        mentionSearch.value = query;
        filterMentionFiles(query);
      } else {
        closeMention();
      }
    });

    mentionSearch.addEventListener('input', function() {
      filterMentionFiles(mentionSearch.value.toLowerCase());
      mentionSelectedIndex = 0;
      updateMentionSelection();
    });

    mentionSearch.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionSelectedIndex = Math.max(0, mentionSelectedIndex - 1);
        updateMentionSelection();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionSelectedIndex = Math.min(mentionFiles.length - 1, mentionSelectedIndex + 1);
        updateMentionSelection();
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention();
      }
      if (e.key === 'Escape') {
        closeMention();
        textarea.focus();
      }
    });

    function filterMentionFiles(query) {
      const filtered = ALL_FILES.filter(f => f.toLowerCase().includes(query)).slice(0, 20);
      mentionFiles = filtered;
      mentionSelectedIndex = 0;
      renderMentionList();
    }

    function renderMentionList() {
      if (mentionFiles.length === 0) {
        mentionList.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px;">无匹配文件</div>';
        return;
      }
      mentionList.innerHTML = mentionFiles.map((f, i) => {
        const name = f.split('/').pop() || f.split('\\\\').pop();
        const isDir = !name.includes('.');
        const ico = isDir ? '${icon('folder', 14)}' : '${icon('file', 14)}';
        return '<div class="mention-item' + (i === mentionSelectedIndex ? ' selected' : '') + '" onclick="selectMentionItem(' + i + ')">' +
          '<span class="item-icon">' + ico + '</span>' +
          '<span class="item-name">' + escapeHtml(name) + '</span>' +
          '<span class="item-path">' + escapeHtml(f) + '</span>' +
          '</div>';
      }).join('');
    }

    function updateMentionSelection() {
      const items = mentionList.querySelectorAll('.mention-item');
      items.forEach((item, i) => {
        item.classList.toggle('selected', i === mentionSelectedIndex);
      });
    }

    function selectMentionItem(index) {
      mentionSelectedIndex = index;
      insertMention();
    }

    function insertMention() {
      if (mentionFiles.length === 0) return;
      const file = mentionFiles[mentionSelectedIndex];
      const value = textarea.value;
      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);
      const atPos = textBefore.lastIndexOf('@');
      if (atPos === -1) return;

      const newValue = value.substring(0, atPos) + '@' + file + ' ' + value.substring(cursorPos);
      textarea.value = newValue;
      const newPos = atPos + file.length + 2;
      textarea.selectionStart = textarea.selectionEnd = newPos;
      closeMention();
      textarea.focus();
    }

    function closeMention() {
      mentionActive = false;
      mentionDropdown.classList.remove('show');
    }

    function onContinue() {
      const instruction = textarea.value.trim();
      vscode.postMessage({ type: 'continue', instruction, imageContents });
    }

    function onEnd() {
      vscode.postMessage({ type: 'end' });
    }

    function selectImages() {
      vscode.postMessage({ type: 'selectImages' });
    }

    function toggleTheme() {
      const newTheme = '${theme.name}' === 'dark' ? 'light' : 'dark';
      vscode.postMessage({ type: 'toggleTheme', theme: newTheme });
    }

    function renderImageList() {
      const list = document.getElementById('imageList');
      if (imageContents.length === 0) {
        list.innerHTML = '<div class="image-empty">拖拽或粘贴图片到此处</div>';
        return;
      }
      list.innerHTML = imageContents.map((img, i) =>
        '<div class="image-item">' +
          '<span class="image-item-name">${icon('fileImage', 12)} <span>' + escapeHtml(img.name) + '</span></span>' +
          '<button class="image-remove" onclick="removeImage(' + i + ')">${icon('x', 12)}</button>' +
        '</div>'
      ).join('');
    }

    function removeImage(index) {
      imageContents.splice(index, 1);
      renderImageList();
    }

    function showToast(msg, isError) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => t.className = 'toast', 2000);
    }

    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    document.addEventListener('paste', function(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            imageContents.push({
              name: 'clipboard_' + Date.now() + '.png',
              data: base64,
              mimeType: 'image/png',
            });
            renderImageList();
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    });

    window.addEventListener('message', function(e) {
      const msg = e.data;
      if (msg.type === 'imagesSelected' && msg.contents) {
        imageContents = imageContents.concat(msg.contents);
        renderImageList();
      }
    });

    const ALL_FILES = [];
    textarea.focus();
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
