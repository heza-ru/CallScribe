(function () {
  if (window.__callscribe_panel_init__) return;
  window.__callscribe_panel_init__ = true;

  const PANEL_WIDTH = 400;
  const PANEL_HEIGHT = 620;
  const HANDLE_WIDTH = 22;
  const TOTAL_WIDTH = PANEL_WIDTH + HANDLE_WIDTH;

  let rootEl = null;
  let isDragging = false;
  let dragOverlay = null;
  let dragStartX = 0, dragStartY = 0;
  let panelStartLeft = 0, panelStartTop = 0;
  let positioned = false; // false = using right/top CSS; true = using left/top after drag

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #callscribe-root * { box-sizing: border-box; }

      #callscribe-root {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%) translateX(${TOTAL_WIDTH + 20}px);
        z-index: 2147483647;
        display: flex;
        align-items: stretch;
        opacity: 0;
        transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        will-change: transform, opacity;
      }

      #callscribe-root.cs-visible {
        opacity: 1;
        transform: translateY(-50%) translateX(0px);
      }

      #callscribe-root.cs-dragging {
        transition: none !important;
        cursor: grabbing;
      }

      #callscribe-root.cs-hide {
        opacity: 0;
        transform: translateY(-50%) translateX(60px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }

      #callscribe-root.cs-dragged {
        /* after first drag, top/left/transform managed by JS */
        transform: none !important;
      }

      #callscribe-handle {
        width: ${HANDLE_WIDTH}px;
        background: #2B21BA;
        border-radius: 10px 0 0 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        cursor: grab;
        user-select: none;
        flex-shrink: 0;
      }

      #callscribe-handle:active { cursor: grabbing; }

      #callscribe-close-btn {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.18);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 13px;
        line-height: 1;
        padding: 0;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      #callscribe-close-btn:hover { background: rgba(255,255,255,0.35); }

      #callscribe-grip {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .cs-dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(255,255,255,0.55);
      }

      #callscribe-iframe {
        width: ${PANEL_WIDTH}px;
        height: ${PANEL_HEIGHT}px;
        border: none;
        border-radius: 0 12px 12px 0;
        display: block;
        background: #fff;
        box-shadow: -4px 0 32px rgba(0,0,0,0.16), 0 4px 24px rgba(0,0,0,0.10);
      }
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if (rootEl) return;

    injectStyles();

    rootEl = document.createElement('div');
    rootEl.id = 'callscribe-root';

    // Drag handle
    const handle = document.createElement('div');
    handle.id = 'callscribe-handle';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.id = 'callscribe-close-btn';
    closeBtn.title = 'Close CallScribe';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', hidePanel);

    // Grip dots
    const grip = document.createElement('div');
    grip.id = 'callscribe-grip';
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('div');
      dot.className = 'cs-dot';
      grip.appendChild(dot);
    }

    // Spacer for balance
    const spacer = document.createElement('div');
    spacer.style.height = '18px';

    handle.appendChild(closeBtn);
    handle.appendChild(grip);
    handle.appendChild(spacer);
    handle.addEventListener('pointerdown', startDrag);

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'callscribe-iframe';
    iframe.src = (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('index.html') : '';
    iframe.allow = 'clipboard-write';

    rootEl.appendChild(handle);
    rootEl.appendChild(iframe);
    document.body.appendChild(rootEl);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rootEl.classList.add('cs-visible');
      });
    });

    // Listen for close message from React app
    window.addEventListener('message', onIframeMessage);
  }

  function onIframeMessage(e) {
    if (e.data?.type === 'CALLSCRIBE_CLOSE') {
      hidePanel();
    }
  }

  function hidePanel() {
    if (!rootEl) return;
    rootEl.classList.remove('cs-visible');
    rootEl.classList.add('cs-hide');
    setTimeout(() => {
      rootEl?.remove();
      rootEl = null;
      positioned = false;
      window.removeEventListener('message', onIframeMessage);
    }, 280);
  }

  function startDrag(e) {
    e.preventDefault();
    isDragging = true;

    const rect = rootEl.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panelStartLeft = rect.left;
    panelStartTop = rect.top;

    // Switch to left/top absolute positioning so we can freely position
    if (!positioned) {
      rootEl.style.transition = 'none';
      rootEl.style.transform = 'none';
      rootEl.style.right = 'auto';
      rootEl.style.top = panelStartTop + 'px';
      rootEl.style.left = panelStartLeft + 'px';
      rootEl.classList.add('cs-dragged');
      positioned = true;
    } else {
      rootEl.style.transition = 'none';
    }

    rootEl.classList.add('cs-dragging');

    // Full-screen invisible overlay to capture pointer events over the iframe
    dragOverlay = document.createElement('div');
    dragOverlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2147483646;
      cursor: grabbing;
    `;
    dragOverlay.addEventListener('pointermove', onDrag);
    dragOverlay.addEventListener('pointerup', stopDrag);
    dragOverlay.addEventListener('pointercancel', stopDrag);
    document.body.appendChild(dragOverlay);
  }

  function onDrag(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const newLeft = Math.max(0, Math.min(window.innerWidth - TOTAL_WIDTH, panelStartLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - PANEL_HEIGHT, panelStartTop + dy));
    rootEl.style.left = newLeft + 'px';
    rootEl.style.top = newTop + 'px';
  }

  function stopDrag() {
    isDragging = false;
    rootEl.classList.remove('cs-dragging');
    dragOverlay?.remove();
    dragOverlay = null;
  }

  function togglePanel() {
    if (rootEl) {
      hidePanel();
    } else {
      createPanel();
    }
  }

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_PANEL') {
        togglePanel();
      }
    });
  } catch { /* extension context invalidated — ignore */ }
})();
