// public/js/terminal.js
// Web Terminal with xterm.js

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

let terminal = null;
let fitAddon = null;
let ws = null;

export function initTerminal() {
  const terminalContainer = document.getElementById('terminal-view');
  if (!terminalContainer) {
    console.error('Terminal container not found');
    return;
  }

  // Create terminal
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowTransparency: true,
    scrollback: 10000,
    tabStopWidth: 4
  });

  // Add addons
  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());

  // Open terminal
  terminal.open(terminalContainer);
  fitAddon.fit();

  // Connect to WebSocket
  connectTerminal();

  // Handle resize
  window.addEventListener('resize', () => {
    if (fitAddon) {
      fitAddon.fit();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: terminal.cols,
          rows: terminal.rows
        }));
      }
    }
  });

  // Handle terminal input
  terminal.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input',
        data: data
      }));
    }
  });

  console.log('✅ Terminal initialized');
}

function connectTerminal() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/terminal`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Terminal WebSocket connected');
    terminal.write('\r\n\x1b[1;32m✓ Connected to terminal\x1b[0m\r\n\r\n');
        
    // Send initial size
    ws.send(JSON.stringify({
      type: 'resize',
      cols: terminal.cols,
      rows: terminal.rows
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        terminal.write(data.data);
      }
    } catch (e) {
      // Raw data
      terminal.write(event.data);
    }
  };

  ws.onerror = (error) => {
    console.error('Terminal WebSocket error:', error);
    terminal.write('\r\n\x1b[1;31m✗ Connection error\x1b[0m\r\n');
  };

  ws.onclose = () => {
    console.log('Terminal WebSocket closed');
    terminal.write('\r\n\x1b[1;33m✗ Connection closed\x1b[0m\r\n');
        
    // Reconnect after 3 seconds
    setTimeout(() => {
      terminal.write('\r\n\x1b[1;36m↻ Reconnecting...\x1b[0m\r\n');
      connectTerminal();
    }, 3000);
  };
}

export function clearTerminal() {
  if (terminal) {
    terminal.clear();
  }
}

export function focusTerminal() {
  if (terminal) {
    terminal.focus();
  }
}

export function disposeTerminal() {
  if (ws) {
    ws.close();
  }
  if (terminal) {
    terminal.dispose();
  }
}
