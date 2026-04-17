export function getSharedStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      font-size: 13px;
    }

    .emboss-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-light),
        inset -1px -1px 2px var(--emboss-dark),
        0 4px 16px var(--shadow);
    }

    .emboss-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 18px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .emboss-btn-primary {
      background: linear-gradient(145deg, var(--accent-hover), var(--accent));
      color: #ffffff;
      box-shadow:
        inset 1px 1px 1px var(--emboss-light),
        2px 2px 6px var(--shadow);
    }
    .emboss-btn-primary:hover {
      opacity: 0.9;
      box-shadow:
        inset -1px -1px 1px var(--emboss-dark),
        1px 1px 3px var(--shadow);
    }

    .emboss-btn-danger {
      background: linear-gradient(145deg, var(--danger-hover), var(--danger));
      color: #ffffff;
      box-shadow:
        inset 1px 1px 1px var(--emboss-light),
        2px 2px 6px var(--shadow);
    }
    .emboss-btn-danger:hover {
      opacity: 0.9;
    }

    .emboss-btn-ghost {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      box-shadow:
        inset 1px 1px 1px var(--emboss-light),
        inset -1px -1px 1px var(--emboss-dark);
    }
    .emboss-btn-ghost:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .emboss-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      box-shadow:
        inset 1px 1px 3px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
      transition: border-color 0.15s ease;
    }
    .emboss-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .emboss-input::placeholder {
      color: var(--text-muted);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .divider {
      height: 1px;
      background: var(--border);
      margin: 12px 0;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-dot.running {
      background: var(--success);
      box-shadow: 0 0 6px var(--success);
    }
    .status-dot.stopped {
      background: var(--danger);
    }

    .toast {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: var(--accent);
      color: white;
      border-radius: 6px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 9999;
    }
    .toast.show { opacity: 1; }
    .toast.error { background: var(--danger); }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
  `;
}
