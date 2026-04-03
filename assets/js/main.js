// ─── Shared utilities ────────────────────────────────────────

/**
 * Shared decrypt/scramble effect.
 * Scrambles characters in `el` toward `target` string, calling `onDone` when resolved.
 *
 * Options:
 *   chars       — character pool for scrambling
 *   baseDelay   — base frames before first char resolves (default 8)
 *   perChar     — additional frames per character index (default 2.5)
 *   jitter      — random additional frames (default 8)
 *   flickerRate — frames between random char swaps for unresolved chars (default 3)
 *   nearThresh  — progress ratio after which char may flash correct (default 0.7)
 *   nearChance  — probability of showing correct char once past nearThresh (default 0.3)
 *   preserve    — string of chars to keep as-is (e.g. ' /' for spaces/slashes)
 *   randChar    — optional function(original) returning a random replacement char
 */
function decryptEffect(el, target, options, onDone) {
  const opts = options || {};
  const chars = opts.chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  const baseDelay = opts.baseDelay != null ? opts.baseDelay : 8;
  const perChar = opts.perChar != null ? opts.perChar : 2.5;
  const jitter = opts.jitter != null ? opts.jitter : 8;
  const flickerRate = opts.flickerRate != null ? opts.flickerRate : 3;
  const nearThresh = opts.nearThresh != null ? opts.nearThresh : 0.7;
  const nearChance = opts.nearChance != null ? opts.nearChance : 0.3;
  const preserve = opts.preserve || '';
  const randCharFn = opts.randChar || null;

  const len = target.length;
  const resolved = new Array(len).fill(false);
  const current = new Array(len);
  let frame = 0;

  const resolveFrames = [];
  for (let i = 0; i < len; i++) {
    resolveFrames[i] = baseDelay + i * perChar + Math.floor(Math.random() * jitter);
    if (preserve.indexOf(target[i]) >= 0) {
      current[i] = target[i];
      resolved[i] = true;
    } else if (randCharFn) {
      current[i] = randCharFn(target[i]);
    } else {
      current[i] = chars[Math.floor(Math.random() * chars.length)];
    }
  }
  el.textContent = current.join('');

  function tick() {
    frame++;
    let allDone = true;

    for (let i = 0; i < len; i++) {
      if (resolved[i]) continue;
      if (frame >= resolveFrames[i]) {
        resolved[i] = true;
        current[i] = target[i];
      } else {
        const nearResolve = frame / resolveFrames[i];
        if (nearResolve > nearThresh) {
          if (randCharFn) {
            current[i] = Math.random() < nearChance ? target[i] : randCharFn(target[i]);
          } else {
            current[i] = Math.random() < nearChance ? target[i] : chars[Math.floor(Math.random() * chars.length)];
          }
        } else if (frame % flickerRate === 0) {
          current[i] = randCharFn ? randCharFn(target[i]) : chars[Math.floor(Math.random() * chars.length)];
        }
        allDone = false;
      }
    }

    el.textContent = current.join('');

    if (allDone) {
      if (onDone) onDone();
      return null;
    }
    return requestAnimationFrame(tick);
  }

  return requestAnimationFrame(tick);
}

/**
 * Get heading text without anchor elements.
 */
function headingText(h) {
  const clone = h.cloneNode(true);
  clone.querySelectorAll('.heading-anchor').forEach(function(a) { a.remove(); });
  return clone.textContent.trim();
}

/**
 * Detect step number from heading text (e.g., "1. Title" or "Phase 3: Title").
 */
function parseStepNumber(text) {
  let m = text.match(/^(\d+)[\.\:\)]\s/);
  if (m) return m[1];
  m = text.match(/^(?:Phase|Step)\s+(\d+)/i);
  if (m) return m[1];
  return null;
}


// ─── Banner ──────────────────────────────────────────────────
(function() {
  const banner = document.getElementById('site-banner');
  if (!banner) return;

  const id = banner.getAttribute('data-banner-id');
  const key = 'banner-dismissed:' + id;

  if (localStorage.getItem(key)) {
    banner.remove();
    return;
  }

  document.body.classList.add('has-banner');

  const close = document.getElementById('site-banner-close');
  if (close) {
    close.addEventListener('click', function() {
      localStorage.setItem(key, '1');
      banner.remove();
      document.body.classList.remove('has-banner');
      // Recalculate nav bottom after banner removal
      const navEl = document.querySelector('.site-nav');
      if (navEl) document.documentElement.style.setProperty('--nav-bottom', navEl.getBoundingClientRect().bottom + 'px');
    });
  }
})();

// ─── Navigation ──────────────────────────────────────────────
const nav = document.querySelector('.site-nav');
if (nav) {
  function updateNavBottom() {
    document.documentElement.style.setProperty('--nav-bottom', nav.getBoundingClientRect().bottom + 'px');
  }
  updateNavBottom();
  window.addEventListener('resize', updateNavBottom, { passive: true });

  // scroll-state() container queries handle this in CSS for Chrome 133+.
  // JS scroll listener is the fallback for other browsers.
  if (!CSS.supports('container-type', 'scroll-state')) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }
}

// ─── Mobile menu ─────────────────────────────────────────────
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  let savedScroll = 0;
  function getFocusable(container) {
    return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(function(el) {
      return el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0;
    });
  }

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    links.classList.add('open');
    document.body.classList.add('nav-open');
    document.documentElement.classList.add('nav-open');
    var first = getFocusable(links)[0];
    if (first) first.focus();
  }
  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    links.classList.remove('open');
    document.body.classList.remove('nav-open');
    document.documentElement.classList.remove('nav-open');
    toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeNav(); else openNav();
  });

  // Close menu on link click
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Focus trap + Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) {
      closeNav();
      return;
    }
    if (e.key === 'Tab' && links.classList.contains('open')) {
      const focusable = getFocusable(links);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Close if viewport resizes beyond mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && links.classList.contains('open')) closeNav();
  }, { passive: true });
}

// ─── Tab widgets (HiW, docs hub, etc.) ───────────────────────
(function() {
  const tablist = document.querySelector('.hiw-tabs');
  const tabs = document.querySelectorAll('.hiw-tab');
  const panels = document.querySelectorAll('.hiw-panel');
  if (!tabs.length) return;

  function activate(tab) {
    const target = tab.getAttribute('data-hiw-tab');
    tabs.forEach(function(t) {
      const isActive = t.getAttribute('data-hiw-tab') === target;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach(function(p) {
      const isActive = p.getAttribute('data-hiw-panel') === target;
      p.classList.toggle('active', isActive);
      p.hidden = !isActive;
    });
    tab.focus();
  }

  // Set initial hidden state for inactive panels
  panels.forEach(function(p) { if (!p.classList.contains('active')) p.hidden = true; });

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() { activate(tab); });
  });

  // Arrow key navigation between tabs
  if (tablist) {
    tablist.addEventListener('keydown', function(e) {
      const tabArr = Array.from(tabs);
      const idx = tabArr.indexOf(document.activeElement);
      if (idx < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        activate(tabArr[(idx + 1) % tabArr.length]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        activate(tabArr[(idx - 1 + tabArr.length) % tabArr.length]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activate(tabArr[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        activate(tabArr[tabArr.length - 1]);
      }
    });
  }
})();

// ─── Mega-menu — shared panel with hover activation ─────────
(function() {
  var mega = document.getElementById('nav-mega');
  var triggers = document.querySelectorAll('.nav-mega-trigger');
  var panels = mega ? mega.querySelectorAll('.nav-mega-panel') : [];
  var inner = mega ? mega.querySelector('.nav-mega-inner') : null;
  if (!mega || !triggers.length || !panels.length) return;

  var activePanel = null;
  var activeTrigger = null;
  var closeTimer = null;
  var isDesktop = function() { return window.innerWidth > 768; };

  function measureHeight(panel) {
    // Temporarily make panel visible to measure
    panel.style.position = 'relative';
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
    var h = panel.offsetHeight;
    panel.style.position = '';
    panel.style.opacity = '';
    panel.style.pointerEvents = '';
    return h;
  }

  function showPanel(panelId, direction) {
    var panel = mega.querySelector('#mega-' + panelId);
    if (!panel || panel === activePanel) return;

    var prevPanel = activePanel;
    var exitClass = direction === 'right' ? 'is-exit-left' : 'is-exit-right';
    var enterOffset = direction === 'right' ? 'translateX(30px)' : 'translateX(-30px)';

    // Slide out previous panel
    if (prevPanel) {
      prevPanel.classList.remove('is-active');
      prevPanel.classList.add(exitClass);
      setTimeout(function() {
        prevPanel.classList.remove('is-exit-left', 'is-exit-right');
      }, 300);
    }

    // Slide in new panel — set starting position, reflow, then animate to center
    panel.classList.remove('is-exit-left', 'is-exit-right');
    panel.style.transform = enterOffset;
    panel.style.opacity = '0';
    panel.offsetHeight; // force reflow to commit starting position
    panel.style.transform = '';
    panel.style.opacity = '';
    panel.classList.add('is-active');

    // Animate container height
    if (inner) {
      inner.style.height = panel.scrollHeight + 'px';
    }

    activePanel = panel;
  }

  function open(panelId, trigger) {
    clearTimeout(closeTimer);

    // Determine slide direction from trigger order
    var direction = 'right';
    if (activeTrigger) {
      var trigArr = Array.from(triggers);
      var oldIdx = trigArr.indexOf(activeTrigger);
      var newIdx = trigArr.indexOf(trigger);
      direction = newIdx > oldIdx ? 'right' : 'left';
    }

    // Update triggers
    triggers.forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
    trigger.setAttribute('aria-expanded', 'true');
    activeTrigger = trigger;

    // Open container if not already open
    if (!mega.classList.contains('is-open')) {
      // Set initial panel without transition
      var panel = mega.querySelector('#mega-' + panelId);
      if (panel) {
        panels.forEach(function(p) { p.classList.remove('is-active', 'is-exit-left'); });
        panel.classList.add('is-active');
        activePanel = panel;
        if (inner) inner.style.height = panel.scrollHeight + 'px';
      }
      mega.classList.add('is-open');
      mega.setAttribute('aria-hidden', 'false');
    } else {
      showPanel(panelId, direction);
    }
  }

  function close() {
    mega.classList.remove('is-open');
    mega.setAttribute('aria-hidden', 'true');
    triggers.forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
    panels.forEach(function(p) { p.classList.remove('is-active', 'is-exit-left', 'is-exit-right'); });
    activeTrigger = null;
    activePanel = null;
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 250);
  }

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  // ─── Hover activation (desktop only) ────────────────────────

  triggers.forEach(function(trigger) {
    var panelId = trigger.getAttribute('data-mega');

    trigger.addEventListener('mouseenter', function() {
      if (!isDesktop()) return;
      cancelClose();
      open(panelId, trigger);
    });

    trigger.addEventListener('mouseleave', function() {
      if (!isDesktop()) return;
      scheduleClose();
    });

    // Click toggle (keyboard and touch)
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      if (mega.classList.contains('is-open') && trigger === activeTrigger) {
        close();
      } else {
        open(panelId, trigger);
        // Focus first item on keyboard activation
        var panel = mega.querySelector('#mega-' + panelId);
        if (panel) {
          var first = panel.querySelector('.nav-mega-hub, .nav-mega-card');
          if (first) first.focus();
        }
      }
    });
  });

  // Keep mega open when hovering over it
  mega.addEventListener('mouseenter', cancelClose);
  mega.addEventListener('mouseleave', function() {
    if (isDesktop()) scheduleClose();
  });

  // Close on click outside
  document.addEventListener('click', function(e) {
    if (!mega.contains(e.target) && !e.target.closest('.nav-has-mega')) {
      close();
    }
  });

  // ─── Keyboard navigation ────────────────────────────────────

  mega.addEventListener('keydown', function(e) {
    if (!activePanel) return;
    var items = Array.from(activePanel.querySelectorAll('.nav-mega-hub, .nav-mega-card'));
    var idx = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < items.length - 1) items[idx + 1].focus();
      else items[0].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) items[idx - 1].focus();
      else items[items.length - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // Switch between panels with left/right arrows
      var trigArr = Array.from(triggers);
      var curIdx = activeTrigger ? trigArr.indexOf(activeTrigger) : 0;
      var nextIdx = e.key === 'ArrowRight'
        ? (curIdx + 1) % trigArr.length
        : (curIdx - 1 + trigArr.length) % trigArr.length;
      var nextTrigger = trigArr[nextIdx];
      var nextPanelId = nextTrigger.getAttribute('data-mega');
      open(nextPanelId, nextTrigger);
      var panel = mega.querySelector('#mega-' + nextPanelId);
      if (panel) {
        var first = panel.querySelector('.nav-mega-hub, .nav-mega-card');
        if (first) first.focus();
      }
    }
  });

  // Escape — close and return focus
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mega.classList.contains('is-open')) {
      close();
      if (activeTrigger) activeTrigger.focus();
    }
  });

  // Mobile nav is now flat inline (no dropdowns to toggle).
})();

// ─── Scrollable regions + tab bar wheel ──────────────────────
function addScrollKeys(el) {
  el.addEventListener('keydown', function(e) {
    switch (e.key) {
      case 'ArrowRight': el.scrollLeft += 40; break;
      case 'ArrowLeft':  el.scrollLeft -= 40; break;
      case 'Home':       el.scrollLeft = 0; break;
      case 'End':        el.scrollLeft = el.scrollWidth; break;
      default: return;
    }
    e.preventDefault();
  });
}

document.querySelectorAll('pre').forEach(function(pre) {
  if (pre.scrollWidth > pre.clientWidth) {
    pre.setAttribute('tabindex', '0');
    pre.setAttribute('role', 'region');
    pre.setAttribute('aria-label', 'Code example (scroll horizontally)');
    addScrollKeys(pre);
  }
});

document.querySelectorAll('.compare-wrap').forEach(function(wrap) {
  if (wrap.scrollWidth > wrap.clientWidth) {
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Comparison table (scroll horizontally)');
    addScrollKeys(wrap);
  }
});

document.querySelectorAll('.dispatch-tabs, .hiw-tabs, .docs-hub-tabs, .code-tabs-nav, .docs-tabs-bar').forEach(function(bar) {
  bar.addEventListener('wheel', function(e) {
    if (bar.scrollWidth <= bar.clientWidth) return;
    e.preventDefault();
    bar.scrollLeft += e.deltaY || e.deltaX;
  }, { passive: false });
});

// ─── Search (Cmd+K) ─────────────────────────────────────────
(function() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const resultsList = document.getElementById('search-results');
  const trigger = document.getElementById('search-trigger');
  if (!overlay || !input) return;

  let index = null;
  let activeIdx = -1;
  let searchController = null;

  // Live region for search result count
  const searchStatus = document.createElement('div');
  searchStatus.setAttribute('role', 'status');
  searchStatus.setAttribute('aria-live', 'polite');
  searchStatus.className = 'sr-only';
  overlay.querySelector('.search-modal').appendChild(searchStatus);

  function open() {
    overlay.classList.add('open');
    input.value = '';
    while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
    activeIdx = -1;
    input.focus();
    if (!index) {
      if (searchController) searchController.abort();
      searchController = new AbortController();
      fetch('/search.json', { signal: searchController.signal })
        .then(function(r) { return r.json(); })
        .then(function(data) { index = data; })
        .catch(function(e) { if (e.name !== 'AbortError') throw e; });
    }
  }

  function close() {
    overlay.classList.remove('open');
    if (trigger) trigger.focus();
  }

  function createResult(item, query) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    const a = document.createElement('a');
    a.href = item.url;

    const section = document.createElement('div');
    section.className = 'search-result-section';
    section.textContent = item.section;

    const title = document.createElement('div');
    title.className = 'search-result-title';
    title.textContent = item.title;

    a.appendChild(section);
    a.appendChild(title);

    let snippetText = item.excerpt || '';
    const q = query.toLowerCase();
    if (item.content && item.content.toLowerCase().indexOf(q) >= 0
        && item.title.toLowerCase().indexOf(q) < 0
        && (!item.excerpt || item.excerpt.toLowerCase().indexOf(q) < 0)) {
      const idx = item.content.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      const end = Math.min(item.content.length, idx + query.length + 60);
      snippetText = (start > 0 ? '\u2026' : '') + item.content.substring(start, end) + (end < item.content.length ? '\u2026' : '');
    }

    if (snippetText) {
      const excerpt = document.createElement('div');
      excerpt.className = 'search-result-excerpt';
      excerpt.textContent = snippetText;
      a.appendChild(excerpt);
    }

    li.appendChild(a);
    return li;
  }

  function search(query) {
    while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
    if (!index || !query) { activeIdx = -1; return; }
    const q = query.toLowerCase();
    const matches = index.filter(function(item) {
      return item.title.toLowerCase().indexOf(q) >= 0
        || item.excerpt.toLowerCase().indexOf(q) >= 0
        || item.section.toLowerCase().indexOf(q) >= 0
        || (item.content && item.content.toLowerCase().indexOf(q) >= 0);
    }).slice(0, 10);

    if (!matches.length) {
      const empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = 'No results for \u201c' + query + '\u201d';
      resultsList.appendChild(empty);
      searchStatus.textContent = 'No results found.';
      activeIdx = -1;
      return;
    }

    matches.forEach(function(item) {
      resultsList.appendChild(createResult(item, query));
    });
    searchStatus.textContent = matches.length + ' result' + (matches.length === 1 ? '' : 's') + ' found.';
    activeIdx = -1;
  }

  function setActive(idx) {
    const searchLinks = resultsList.querySelectorAll('a');
    if (!searchLinks.length) return;
    activeIdx = Math.max(0, Math.min(idx, searchLinks.length - 1));
    searchLinks.forEach(function(a, i) {
      var isActive = i === activeIdx;
      a.classList.toggle('active', isActive);
      a.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    searchLinks[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  // Debounced search input
  let searchTimer;
  input.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() { search(input.value); }, 150);
  });

  input.addEventListener('keydown', function(e) {
    const searchLinks = resultsList.querySelectorAll('a');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIdx - 1);
    } else if (e.key === 'Enter' && activeIdx >= 0 && searchLinks[activeIdx]) {
      e.preventDefault();
      searchLinks[activeIdx].click();
    }
  });

  if (trigger) trigger.addEventListener('click', open);

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('open')) close(); else open();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    // Focus trap within search overlay
    if (e.key === 'Tab' && overlay.classList.contains('open')) {
      const focusable = Array.from(overlay.querySelectorAll('input, a[href], button:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });
})();

// ─── Docs: TOC + stepped guides ──────────────────────────────

// 1. Right-side TOC — populate from h2/h3 headings + scroll spy
(function() {
  const tocList = document.querySelector('.docs-toc-list');
  const article = document.querySelector('.docs-content article');
  if (!tocList || !article) return;

  const headings = article.querySelectorAll('h2:not(.docs-related-label), h3');
  if (headings.length < 2) {
    const toc = document.querySelector('.docs-toc');
    if (toc) toc.style.display = 'none';
    return;
  }

  headings.forEach(function(h) {
    const text = headingText(h);
    if (!h.id) {
      h.id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const li = document.createElement('li');
    if (h.tagName === 'H3') li.className = 'toc-h3';
    const a = document.createElement('a');
    a.href = '#' + h.id;

    // Step number in TOC
    const stepNum = (h.tagName === 'H2') ? parseStepNumber(text) : null;
    if (stepNum) {
      li.className = 'toc-step';
      const numSpan = document.createElement('span');
      numSpan.className = 'toc-step-number';
      numSpan.textContent = stepNum;
      a.appendChild(numSpan);
      // Show title without the number prefix
      const titleSpan = document.createElement('span');
      titleSpan.textContent = text.replace(/^(\d+[\.\:\)]\s*|(?:Phase|Step)\s+\d+[:\s]*)/i, '');
      a.appendChild(titleSpan);
    } else {
      a.textContent = text;
    }

    li.appendChild(a);
    tocList.appendChild(li);
  });

  const tocLinks = tocList.querySelectorAll('a');
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocLinks.forEach(function(link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
        const activeLink = tocList.querySelector('a.active');
        if (activeLink) {
          const li = activeLink.parentElement;
          tocList.style.setProperty('--toc-indicator-y', li.offsetTop + 'px');
          tocList.style.setProperty('--toc-indicator-h', li.offsetHeight + 'px');
        }
      }
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

  headings.forEach(function(h) { observer.observe(h); });
})();

// 1b. Stepped guide layout — wrap numbered h2 sections in timeline chrome
(function() {
  const article = document.querySelector('.docs-content article');
  if (!article) return;

  const h2s = article.querySelectorAll('h2');
  const stepHeadings = [];
  h2s.forEach(function(h) {
    const num = parseStepNumber(headingText(h));
    if (num) stepHeadings.push({ el: h, num: num });
  });

  if (stepHeadings.length < 2) return;

  // For each step heading, collect all sibling elements until the next h2
  stepHeadings.forEach(function(step) {
    const h = step.el;

    // Create step wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'docs-step';

    // Create number circle
    const circle = document.createElement('span');
    circle.className = 'docs-step-number';
    circle.textContent = step.num;

    // Strip number prefix from heading text
    const firstText = h.firstChild;
    if (firstText && firstText.nodeType === 3) {
      firstText.textContent = firstText.textContent.replace(/^(\d+[\.\:\)]\s*|(?:Phase|Step)\s+\d+[:\s]*)/i, '');
    }

    // Insert wrapper before the heading
    h.parentNode.insertBefore(wrapper, h);
    wrapper.appendChild(circle);
    wrapper.appendChild(h);

    // Move siblings into wrapper until next h2 or another docs-step
    let next = wrapper.nextSibling;
    while (next) {
      const curr = next;
      next = curr.nextSibling;
      if (curr.nodeType === 1 && (curr.tagName === 'H2' || curr.classList.contains('docs-step'))) break;
      wrapper.appendChild(curr);
    }
  });

  // Highlight active step circle on scroll
  const steps = article.querySelectorAll('.docs-step');
  const stepObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      entry.target.classList.toggle('active', entry.isIntersecting);
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

  steps.forEach(function(s) {
    const h = s.querySelector('h2');
    if (h) stepObserver.observe(h);
  });
})();

// ─── Shared copy live region ──────────────────────────────────
var copyLiveRegion = (function() {
  var el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.className = 'sr-only';
  document.body.appendChild(el);
  var timer = null;
  return function(msg) {
    if (timer) clearTimeout(timer);
    el.textContent = msg;
    timer = setTimeout(function() { el.textContent = ''; timer = null; }, 3000);
  };
})();

// ─── Docs: TOC actions (copy link/markdown) ──────────────────
(function() {
  function flashCopied(btn) {
    var orig = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('docs-toc-action-copied');
    copyLiveRegion('Copied to clipboard');
    setTimeout(function() {
      btn.textContent = orig;
      btn.classList.remove('docs-toc-action-copied');
    }, 1500);
  }

  const copyLink = document.getElementById('toc-copy-link');
  if (copyLink) {
    copyLink.addEventListener('click', function() {
      navigator.clipboard.writeText(window.location.href).then(function() {
        flashCopied(copyLink);
      });
    });
  }

  let mdController = null;
  const copyMd = document.getElementById('toc-copy-md');
  if (copyMd) {
    copyMd.addEventListener('click', function() {
      const src = copyMd.getAttribute('data-src');
      if (!src) return;
      copyMd.textContent = 'Fetching...';
      if (mdController) mdController.abort();
      mdController = new AbortController();
      fetch(src, { signal: mdController.signal })
        .then(function(r) { return r.ok ? r.text() : Promise.reject(); })
        .then(function(text) {
          return navigator.clipboard.writeText(text);
        })
        .then(function() { flashCopied(copyMd); })
        .catch(function(e) {
          if (e && e.name === 'AbortError') return;
          copyMd.textContent = 'Copy as Markdown';
        });
    });
  }
})();

// ─── Docs: language labels + shell highlighting ──────────────
(function() {
  const langNames = {
    'rust': 'Rust', 'go': 'Go', 'python': 'Python', 'java': 'Java',
    'typescript': 'TypeScript', 'javascript': 'JavaScript', 'ts': 'TypeScript',
    'js': 'JavaScript', 'csharp': 'C#', 'cs': 'C#', 'ruby': 'Ruby',
    'php': 'PHP', 'elixir': 'Elixir', 'c': 'C', 'cpp': 'C++',
    'bash': 'Shell', 'shell': 'Shell', 'sh': 'Shell', 'zsh': 'Shell',
    'yaml': 'YAML', 'yml': 'YAML', 'json': 'JSON', 'toml': 'TOML',
    'ini': 'TOML', 'sql': 'SQL', 'hcl': 'HCL', 'terraform': 'HCL',
    'xml': 'XML', 'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS',
    'markdown': 'Markdown', 'md': 'Markdown', 'protobuf': 'Protobuf',
    'proto': 'Protobuf', 'wat': 'WAT', 'plaintext': '',
  };
  document.querySelectorAll('.highlighter-rouge').forEach(function(block) {
    const classes = block.className.split(' ');
    let lang = '';
    classes.forEach(function(cls) {
      const match = cls.match(/^language-(.+)$/);
      if (match) lang = match[1];
    });
    const name = langNames[lang];
    if (name) {
      const label = document.createElement('span');
      label.className = 'code-lang';
      label.textContent = name;
      const pre = block.querySelector('pre');
      if (pre) {
        pre.style.position = 'relative';
        pre.appendChild(label);
      }
    }
  });
})();

// Shell command name highlighting
(function() {
  document.querySelectorAll('.language-bash .highlight code, .language-shell .highlight code, .language-sh .highlight code').forEach(function(code) {
    const nodes = Array.prototype.slice.call(code.childNodes);
    let atLineStart = true;

    nodes.forEach(function(node) {
      if (node.nodeType !== 3) {
        if (node.classList && node.classList.contains('c')) atLineStart = true;
        return;
      }
      const text = node.textContent;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length <= 1 && !atLineStart) return;

      const frag = document.createDocumentFragment();
      lines.forEach(function(line, i) {
        if (i > 0) frag.appendChild(document.createTextNode('\n'));

        const isStart = (i > 0) || atLineStart;
        const trimmed = line.replace(/^\s+/, '');
        const leading = line.substring(0, line.length - trimmed.length);

        if (isStart && trimmed.length > 0 && !trimmed.startsWith('#')) {
          const firstSpace = trimmed.indexOf(' ');
          const cmd = firstSpace >= 0 ? trimmed.substring(0, firstSpace) : trimmed;
          const rest = firstSpace >= 0 ? trimmed.substring(firstSpace) : '';

          if (leading) frag.appendChild(document.createTextNode(leading));
          const span = document.createElement('span');
          span.className = 'sh-cmd';
          span.textContent = cmd;
          frag.appendChild(span);
          if (rest) frag.appendChild(document.createTextNode(rest));
        } else {
          frag.appendChild(document.createTextNode(line));
        }
      });

      atLineStart = text.endsWith('\n');
      node.parentNode.replaceChild(frag, node);
    });
  });
})();

// ─── Docs: copy-to-clipboard ─────────────────────────────────
(function() {
  document.querySelectorAll('.docs-content pre, .post-body pre').forEach(function(pre) {
    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function() {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        copyLiveRegion('Copied to clipboard');
        setTimeout(function() {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
})();

// ─── Docs: heading anchors ───────────────────────────────────
(function() {
  function createLinkIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('d', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71');
    svg.appendChild(p1);
    svg.appendChild(p2);
    return svg;
  }

  document.querySelectorAll('.docs-content article h2, .docs-content article h3, .post-body h2, .post-body h3').forEach(function(h) {
    if (h.closest('.card, .docs-hub-card, .docs-hub, .card-grid')) return;
    if (!h.id) {
      h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + h.id;
    anchor.setAttribute('aria-label', 'Copy link to ' + h.textContent.trim());
    anchor.appendChild(createLinkIcon());
    h.appendChild(anchor);
  });
})();

// ─── Docs: sidebar (scroll + collapsible) ────────────────────
(function() {
  const sidebar = document.querySelector('.docs-sidebar');
  if (!sidebar) return;
  const key = 'docs-sidebar-scroll';
  const saved = sessionStorage.getItem(key);
  if (saved) sidebar.scrollTop = parseInt(saved, 10);
  sidebar.addEventListener('scroll', function() {
    sessionStorage.setItem(key, sidebar.scrollTop);
  }, { passive: true });
})();

// Collapsible sidebar sections (with sessionStorage persistence)
(function() {
  const groups = document.querySelectorAll('.docs-nav-group');
  if (!groups.length) return;

  const storageKey = 'docs-sidebar-sections';
  const saved = sessionStorage.getItem(storageKey);
  let savedState = null;

  if (saved) {
    try { savedState = JSON.parse(saved); } catch (e) { /* ignore */ }
  }

  // Restore saved state if available, otherwise keep Liquid-rendered defaults
  if (savedState && savedState.length === groups.length) {
    groups.forEach(function(group, i) {
      if (savedState[i]) {
        group.classList.add('open');
      } else {
        group.classList.remove('open');
      }
    });
  }

  // Always ensure the section containing the active page is open
  groups.forEach(function(group) {
    if (group.querySelector('a.active')) {
      group.classList.add('open');
    }
  });

  function persistState() {
    const state = [];
    groups.forEach(function(group) {
      state.push(group.classList.contains('open'));
    });
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }

  groups.forEach(function(group) {
    const btn = group.querySelector('.docs-nav-heading');
    if (!btn) return;
    const isOpen = group.classList.contains('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    btn.addEventListener('click', function() {
      const wasOpen = group.classList.contains('open');
      group.classList.toggle('open');
      btn.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
      persistState();
    });
  });
})();

// ─── Docs: feedback widget ───────────────────────────────────
(function() {
  const container = document.getElementById('docs-feedback');
  if (!container) return;

  const key = 'docs-feedback:' + window.location.pathname;
  const saved = localStorage.getItem(key);
  const thanks = container.querySelector('.docs-feedback-thanks');
  const buttons = container.querySelectorAll('.docs-feedback-btn');

  if (saved) {
    buttons.forEach(function(btn) {
      var isSelected = btn.dataset.value === saved;
      if (isSelected) btn.classList.add('selected');
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.disabled = true;
    });
    thanks.hidden = false;
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const value = btn.dataset.value;
      localStorage.setItem(key, value);
      buttons.forEach(function(b) {
        b.classList.toggle('selected', b.dataset.value === value);
        b.setAttribute('aria-pressed', b.dataset.value === value ? 'true' : 'false');
        b.disabled = true;
      });
      thanks.hidden = false;
    });
  });
})();

// ─── Docs: tabs + code tabs ──────────────────────────────────

// Docs Tabs
(function() {
  const tabGroups = document.querySelectorAll('.docs-tabs');
  if (!tabGroups.length) return;

  tabGroups.forEach(function(group) {
    const tabs = group.querySelectorAll('.docs-tab');
    const panels = group.querySelectorAll('.docs-tab-panel');
    const id = group.dataset.tabsId;

    function activateTab(idx) {
      tabs.forEach(function(t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      panels.forEach(function(p) { p.classList.remove('active'); p.hidden = true; });
      tabs[idx].classList.add('active');
      tabs[idx].setAttribute('aria-selected', 'true');
      tabs[idx].setAttribute('tabindex', '0');
      panels[idx].classList.add('active');
      panels[idx].hidden = false;
      localStorage.setItem('docs-tab:' + id, idx);
    }

    // Set initial hidden state for inactive panels
    panels.forEach(function(p) { if (!p.classList.contains('active')) p.hidden = true; });

    const savedTab = localStorage.getItem('docs-tab:' + id);
    if (savedTab !== null) {
      const idx = parseInt(savedTab, 10);
      if (idx >= 0 && idx < tabs.length) activateTab(idx);
    }

    tabs.forEach(function(tab, i) {
      tab.addEventListener('click', function() { activateTab(i); });
    });

    // Arrow key navigation for tablist
    group.querySelector('.docs-tabs-bar').addEventListener('keydown', function(e) {
      const current = Array.prototype.indexOf.call(tabs, document.activeElement);
      if (current < 0) return;
      let next = -1;
      if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next >= 0) {
        e.preventDefault();
        activateTab(next);
        tabs[next].focus();
      }
    });
  });
})();

// Code Tabs
(function() {
  const STORAGE_KEY = 'inferadb-docs-lang';

  function activateTab(group, lang) {
    const buttons = group.querySelectorAll('.code-tabs-nav button');
    const panels = group.querySelectorAll('.code-tabs-panel');
    buttons.forEach(function(btn) {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach(function(panel) {
      panel.classList.toggle('active', panel.getAttribute('data-lang') === lang);
    });
    // Update SDK link if present
    const activeBtn = group.querySelector('.code-tabs-nav button.active');
    const sdkLink = group.querySelector('.code-tabs-sdk-link');
    if (activeBtn && sdkLink) {
      const url = activeBtn.getAttribute('data-sdk-url');
      const name = activeBtn.getAttribute('data-sdk-name');
      if (url && name) {
        const a = sdkLink.querySelector('a');
        if (a) {
          a.href = url;
          a.textContent = name;
        }
      }
    }
  }

  function syncAll(lang) {
    document.querySelectorAll('.code-tabs').forEach(function(group) {
      const hasLang = group.querySelector('[data-lang="' + lang + '"]');
      if (hasLang) activateTab(group, lang);
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.code-tabs-nav button');
    if (!btn) return;
    const lang = btn.getAttribute('data-lang');
    if (lang) syncAll(lang);
  });

  // On page load, restore preference, set ARIA roles, and add keyboard nav
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  document.querySelectorAll('.code-tabs').forEach(function(group) {
    const nav = group.querySelector('.code-tabs-nav');
    if (!nav) return;
    nav.setAttribute('role', 'tablist');
    const buttons = nav.querySelectorAll('button');
    buttons.forEach(function(btn) { btn.setAttribute('role', 'tab'); });

    const first = buttons[0];
    if (!first) return;
    const lang = saved && group.querySelector('[data-lang="' + saved + '"]')
      ? saved
      : first.getAttribute('data-lang');
    activateTab(group, lang);

    // Roving tabindex keyboard navigation
    nav.addEventListener('keydown', function(e) {
      const arr = Array.from(buttons);
      const idx = arr.indexOf(document.activeElement);
      if (idx < 0) return;
      var next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % arr.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + arr.length) % arr.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = arr.length - 1;
      if (next >= 0) {
        e.preventDefault();
        var nextLang = arr[next].getAttribute('data-lang');
        if (nextLang) syncAll(nextLang);
        arr[next].focus();
      }
    });
  });
})();

// ─── Constellation canvas ────────────────────────────────────
(function() {
  const canvas = document.getElementById('constellation');
  if (!canvas) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    canvas.style.display = 'none';
    return;
  }
  const ctx = canvas.getContext('2d');
  let W, H, isMobile;
  let nodes = [], edges = [], pulses = [];
  let mouseX = -1000, mouseY = -1000;
  let raf = null, running = false, time = 0;

  const amber = [200, 164, 78];
  const teal = [86, 182, 194];
  const green = [106, 158, 74];
  const red = [212, 88, 88];

  const types = [
    { c: amber, r: 2.5 }, { c: teal, r: 2 },
    { c: green, r: 1.8 }, { c: amber, r: 1.5 },
  ];

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    isMobile = W < 768;
    canvas.width = W;
    canvas.height = H;
  }

  function buildEdges() {
    edges = [];
    for (let a = 0; a < nodes.length; a++) {
      let c = 0;
      for (let b = a + 1; b < nodes.length; b++) {
        if (c >= 4) break;
        const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
        const maxDist = isMobile ? 120 : 200;
        if (Math.sqrt(dx * dx + dy * dy) < maxDist && Math.random() < 0.5) {
          edges.push([a, b]);
          c++;
        }
      }
    }
  }

  let adj = [];
  function buildAdj() {
    adj = [];
    for (let i = 0; i < nodes.length; i++) adj[i] = [];
    for (let e = 0; e < edges.length; e++) {
      adj[edges[e][0]].push(edges[e][1]);
      adj[edges[e][1]].push(edges[e][0]);
    }
  }

  function init() {
    resize();
    nodes = []; pulses = [];
    const count = isMobile
      ? Math.max(12, Math.min(25, Math.floor(W * H / 15000)))
      : Math.max(30, Math.min(70, Math.floor(W * H / 6000)));
    for (let i = 0; i < count; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        c: t.c, r: t.r, glow: 0
      });
    }
    buildEdges();
    buildAdj();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function fireQuery() {
    if (!adj.length) return;

    const start = Math.floor(Math.random() * nodes.length);
    if (!adj[start] || !adj[start].length) return;

    const branches = [];
    const maxDepth = 3 + Math.floor(Math.random() * 4);
    const branchCount = Math.min(adj[start].length, 2 + Math.floor(Math.random() * 2));
    const startNeighbors = adj[start].slice();
    shuffle(startNeighbors);

    for (let b = 0; b < branchCount; b++) {
      if (b >= startNeighbors.length) break;
      const path = [start];
      let cur = startNeighbors[b];
      path.push(cur);
      const localVisited = {};
      localVisited[start] = 1;
      localVisited[cur] = 1;

      for (let d = 0; d < maxDepth - 1; d++) {
        const neighbors = [];
        for (let n = 0; n < adj[cur].length; n++) {
          if (!localVisited[adj[cur][n]]) neighbors.push(adj[cur][n]);
        }
        if (!neighbors.length) break;
        if (neighbors.length > 1 && Math.random() < 0.3 && d < maxDepth - 2) {
          shuffle(neighbors);
          const fork = path.slice();
          fork.push(neighbors[1]);
          branches.push({ path: fork, isFork: true });
          cur = neighbors[0];
        } else {
          cur = neighbors[Math.floor(Math.random() * neighbors.length)];
        }
        path.push(cur);
        localVisited[cur] = 1;
      }

      branches.push({ path: path, isFork: false });
    }

    if (!branches.length) return;

    const allowedBranch = Math.floor(Math.random() * branches.length);
    const queryAllowed = Math.random() < 0.75;

    for (let i = 0; i < branches.length; i++) {
      if (branches[i].path.length < 2) continue;
      const isWinner = (i === allowedBranch) && queryAllowed;
      let branchColor = isWinner ? green : (queryAllowed ? amber : red);
      if (!queryAllowed && i === branches.length - 1) branchColor = red;

      pulses.push({
        path: branches[i].path,
        t: 0,
        spd: 0.015 + Math.random() * 0.008,
        c: branchColor,
        age: 0,
        ttl: 140,
        delay: i * 12,
        isWinner: isWinner
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Static edges
    ctx.lineWidth = 0.5;
    for (let e = 0; e < edges.length; e++) {
      const a = nodes[edges[e][0]], b = nodes[edges[e][1]];
      ctx.strokeStyle = rgba(amber, 0.03);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Query pulses
    for (let p = 0; p < pulses.length; p++) {
      const pl = pulses[p];
      if (pl.delay > 0) continue;
      const seg = Math.floor(pl.t), frac = pl.t - seg;
      const fade = pl.age > 0 ? Math.max(0, 1 - pl.age / pl.ttl) : 1;
      const lineW = pl.isWinner ? 1.5 : 0.8;

      // Lit edges
      ctx.lineWidth = lineW;
      for (let s = 0; s < Math.min(seg + 1, pl.path.length - 1); s++) {
        const ea = (s < seg ? 0.15 : frac * 0.15) * fade;
        ctx.strokeStyle = rgba(pl.c, ea);
        ctx.beginPath();
        ctx.moveTo(nodes[pl.path[s]].x, nodes[pl.path[s]].y);
        ctx.lineTo(nodes[pl.path[s+1]].x, nodes[pl.path[s+1]].y);
        ctx.stroke();
      }

      // Moving dot
      if (seg < pl.path.length - 1) {
        const f = nodes[pl.path[seg]], t = nodes[pl.path[seg+1]];
        const px = f.x + (t.x - f.x) * frac, py = f.y + (t.y - f.y) * frac;
        const dotR = pl.isWinner ? 2.5 : 1.8;
        ctx.fillStyle = rgba(pl.c, 0.5);
        ctx.beginPath(); ctx.arc(px, py, dotR, 0, 6.28); ctx.fill();
        ctx.fillStyle = rgba(pl.c, 0.06);
        ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.28); ctx.fill();

        nodes[pl.path[seg]].glow = Math.max(nodes[pl.path[seg]].glow, 0.15);
        t.glow = Math.max(t.glow, frac * 0.25);
      }

      // Terminal flash
      if (pl.age > 0 && pl.age < 30) {
        const tn = nodes[pl.path[pl.path.length - 1]];
        const flashR = pl.isWinner ? 12 : 8;
        const flashA = (1 - pl.age / 30) * (pl.isWinner ? 0.3 : 0.15);
        ctx.fillStyle = rgba(pl.c, flashA);
        ctx.beginPath(); ctx.arc(tn.x, tn.y, flashR, 0, 6.28); ctx.fill();
      }
    }

    // Nodes
    for (let k = 0; k < nodes.length; k++) {
      const n = nodes[k];
      const mdx = n.x - mouseX, mdy = n.y - mouseY;
      const md = Math.sqrt(mdx * mdx + mdy * mdy);
      const mg = md < 180 ? (1 - md / 180) * 0.15 : 0;
      const na = Math.min(0.08 + n.glow + mg, 0.4);
      ctx.fillStyle = rgba(n.c, na);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.28); ctx.fill();
      if (n.glow > 0.08) {
        ctx.strokeStyle = rgba(n.c, n.glow * 0.2);
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3, 0, 6.28); ctx.stroke();
      }
    }
  }

  function update() {
    time++;
    if (isMobile) {
      if (time % 120 === 0) fireQuery();
    } else {
      if (time % 45 === 0) fireQuery();
      if (time % 70 === 20) fireQuery();
      if (time % 100 === 50) fireQuery();
    }

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].glow *= 0.94;
    }

    for (let p = pulses.length - 1; p >= 0; p--) {
      const pl = pulses[p];
      if (pl.delay > 0) { pl.delay--; continue; }
      if (pl.t < pl.path.length - 1) {
        pl.t += pl.spd;
        if (pl.t >= pl.path.length - 1) { pl.t = pl.path.length - 1; pl.age = 1; }
      } else {
        pl.age++;
        if (pl.age > pl.ttl) pulses.splice(p, 1);
      }
    }

  }

  const FRAME_INTERVAL = 1000 / 60;
  let lastFrame = 0;
  function loop(timestamp) {
    if (!running) return;
    if (timestamp - lastFrame < FRAME_INTERVAL) { raf = requestAnimationFrame(loop); return; }
    lastFrame = timestamp;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }

  let heroVisible = true;

  canvas.parentElement.addEventListener('mousemove', function(e) {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
  }, { passive: true });
  canvas.parentElement.addEventListener('mouseleave', function() { mouseX = mouseY = -1000; });
  window.addEventListener('resize', function() { resize(); }, { passive: true });

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stop(); else if (heroVisible) start();
  });

  // Pause when hero is scrolled out of view
  const heroObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      heroVisible = entry.isIntersecting;
      if (heroVisible) start();
      else stop();
    });
  }, { threshold: 0 });
  heroObserver.observe(canvas.parentElement);

  init();
  start();
})();

// ─── Decrypt effects (numeric, text, hero) ───────────────────

// Numeric decrypt effect — [data-decrypt-num]
(function() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const digits = '0123456789';
  const elements = document.querySelectorAll('[data-decrypt-num]');
  if (!elements.length) return;

  if (reducedMotion) {
    elements.forEach(function(el) { el.textContent = el.getAttribute('data-decrypt-num'); });
    return;
  }

  const active = new Map();

  // Characters that should stay fixed (non-digits)
  function isDigit(ch) { return digits.indexOf(ch) >= 0; }

  function scramble(el) {
    const target = el.getAttribute('data-decrypt-num');
    // Cancel any existing animation
    if (active.has(el)) { cancelAnimationFrame(active.get(el)); }
    const rafId = decryptEffect(el, target, {
      chars: digits,
      baseDelay: 15,
      perChar: 5,
      jitter: 20,
      flickerRate: 2,
      nearThresh: 0.6,
      nearChance: 0.25,
      preserve: target.split('').filter(function(ch) { return !isDigit(ch); }).join('')
    }, function() { active.delete(el); });
    active.set(el, rafId);
  }

  function randomFill(target) {
    let out = '';
    for (let i = 0; i < target.length; i++) {
      if (isDigit(target[i])) {
        out += digits[Math.floor(Math.random() * digits.length)];
      } else {
        out += target[i];
      }
    }
    return out;
  }

  function reset(el) {
    if (active.has(el)) { cancelAnimationFrame(active.get(el)); active.delete(el); }
    el.textContent = randomFill(el.getAttribute('data-decrypt-num'));
  }

  const timeouts = new Map();
  const idleAnims = new Map();

  function startIdle(el) {
    const target = el.getAttribute('data-decrypt-num');
    function tick() {
      el.textContent = randomFill(target);
      idleAnims.set(el, requestAnimationFrame(tick));
    }
    idleAnims.set(el, requestAnimationFrame(tick));
  }

  function stopIdle(el) {
    if (idleAnims.has(el)) {
      cancelAnimationFrame(idleAnims.get(el));
      idleAnims.delete(el);
    }
  }

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.getAttribute('data-decrypt-delay') || '0', 10);
        startIdle(entry.target);
        const tid = setTimeout(function() {
          stopIdle(entry.target);
          scramble(entry.target);
          timeouts.delete(entry.target);
        }, delay);
        timeouts.set(entry.target, tid);
      } else {
        if (timeouts.has(entry.target)) {
          clearTimeout(timeouts.get(entry.target));
          timeouts.delete(entry.target);
        }
        stopIdle(entry.target);
        reset(entry.target);
      }
    });
  }, { threshold: 0.5 });

  elements.forEach(function(el) {
    el.textContent = randomFill(el.getAttribute('data-decrypt-num'));
    observer.observe(el);
  });
})();

// Cipher decrypt effect — [data-decrypt]
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-decrypt]').forEach(function(el) {
      el.textContent = el.getAttribute('data-decrypt');
    });
    return;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  const elements = document.querySelectorAll('[data-decrypt]');
  if (!elements.length) return;

  const active = new Map();

  function scramble(el) {
    const target = el.getAttribute('data-decrypt');
    if (active.has(el)) { cancelAnimationFrame(active.get(el)); }
    const rafId = decryptEffect(el, target, {
      chars: chars,
      preserve: ' /'
    }, function() { active.delete(el); });
    active.set(el, rafId);
  }

  function reset(el) {
    if (active.has(el)) { cancelAnimationFrame(active.get(el)); active.delete(el); }
    const target = el.getAttribute('data-decrypt');
    let out = '';
    for (let i = 0; i < target.length; i++) {
      if (target[i] === ' ' || target[i] === '/') {
        out += target[i];
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;
  }

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        scramble(entry.target);
      } else {
        reset(entry.target);
      }
    });
  }, { threshold: 0.5 });

  elements.forEach(function(el) {
    reset(el);
    observer.observe(el);
  });
})();

// Hero title decrypt + phrase cycling — [data-hero-decrypt]
(function() {
  const hero = document.querySelector('[data-hero-decrypt]');
  if (!hero) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const statics = hero.querySelectorAll('[data-hero-static]');
  const cycleEl = hero.querySelector('[data-hero-cycle]');
  if (!cycleEl) return;

  const phrases = cycleEl.getAttribute('data-phrases').split(',');
  const charsUpper = 'ABCDEFGHJKLNPRSTUX';
  const charsLower = 'abcdefghjklmnprstux0123456789';
  let currentPhrase = 0;

  function randChar(original) {
    if (original === original.toUpperCase()) {
      return charsUpper[Math.floor(Math.random() * charsUpper.length)];
    }
    return charsLower[Math.floor(Math.random() * charsLower.length)];
  }

  let cycleInterval = null;
  let animFrame = null;

  function heroDecryptText(el, text, onDone) {
    // Reuse the shared decryptEffect with hero-specific params
    animFrame = decryptEffect(el, text, {
      baseDelay: 8,
      perChar: 2.5,
      jitter: 8,
      flickerRate: 3,
      nearThresh: 0.7,
      nearChance: 0.3,
      preserve: ' ',
      randChar: randChar
    }, onDone);
  }

  function encryptThenDecrypt(el, newText, onDone) {
    const oldText = el.textContent;
    let frame = 0;
    const encryptFrames = 20;
    const current = oldText.split('');

    function tick() {
      frame++;
      if (frame <= encryptFrames) {
        const corruption = frame / encryptFrames;
        for (let i = 0; i < current.length; i++) {
          if (current[i] === ' ') continue;
          if (Math.random() < corruption * 0.5) {
            current[i] = randChar(current[i]);
          }
        }
        el.textContent = current.join('');
        animFrame = requestAnimationFrame(tick);
      } else {
        heroDecryptText(el, newText, onDone);
      }
    }
    animFrame = requestAnimationFrame(tick);
  }

  function startCycling() {
    cycleInterval = setInterval(function() {
      currentPhrase = (currentPhrase + 1) % phrases.length;
      const newText = phrases[currentPhrase];

      cycleEl.style.transition = 'filter 0.4s ease-out, opacity 0.4s ease-out';
      cycleEl.style.filter = 'blur(6px)';
      cycleEl.style.opacity = '0.3';

      setTimeout(function() {
        cycleEl.textContent = newText;
        cycleEl.style.filter = 'blur(0px)';
        cycleEl.style.opacity = '1';
      }, 400);
    }, 4000);
  }

  function stopCycling() {
    if (cycleInterval) { clearInterval(cycleInterval); cycleInterval = null; }
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  if (reducedMotion) {
    let phraseIdx = 0;
    setInterval(function() {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      cycleEl.textContent = phrases[phraseIdx];
    }, 4000);
    return;
  }

  // Keep the real text in the DOM for correct layout.
  const allParts = Array.prototype.slice.call(statics);
  allParts.push(cycleEl);

  // Hide all parts with CSS
  allParts.forEach(function(el) {
    el.style.filter = 'blur(8px)';
    el.style.opacity = '0';
    el.style.transition = 'none';
  });

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        let delay = 0;
        allParts.forEach(function(el) {
          setTimeout(function() {
            el.style.transition = 'filter 0.8s ease-out, opacity 0.8s ease-out';
            el.style.filter = 'blur(0px)';
            el.style.opacity = '1';
          }, delay);
          delay += 250;
        });
        setTimeout(function() {
          startCycling();
        }, delay + 3000);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(hero);

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stopCycling();
    else if (!cycleInterval) startCycling();
  });
})();

// ─── Viewport reveal animations ──────────────────────────────
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-reveal-delay');
        if (delay) {
          entry.target.style.transitionDelay = delay + 'ms';
        }
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(function(el) { observer.observe(el); });
})();

// ─── Smooth scroll anchors ───────────────────────────────────
document.querySelectorAll('a[href^="/#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').replace('/', '');
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      history.pushState(null, '', id);
    }
  });
});

// ─── Dispatch: load more + SVG teasers ───────────────────────

// Dispatch load more
(function() {
  const list = document.getElementById('dispatch-list');
  const btn = document.getElementById('dispatch-load-more');
  if (!list || !btn) return;

  const entries = list.querySelectorAll('.dispatch-entry');
  const perPage = parseInt(list.getAttribute('data-per-page') || '10', 10);

  function getStoredCount() {
    const match = location.hash.match(/show=(\d+)/);
    return match ? Math.min(parseInt(match[1], 10), entries.length) : perPage;
  }

  let visible = Math.max(perPage, getStoredCount());

  function showEntries(count) {
    visible = Math.min(count, entries.length);
    for (let i = 0; i < entries.length; i++) {
      entries[i].style.display = i < visible ? '' : 'none';
    }
    btn.style.display = visible >= entries.length ? 'none' : '';
  }

  function updateHash() {
    if (visible > perPage) {
      history.replaceState(null, '', '#show=' + visible);
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  showEntries(visible);

  // Live region for announcing loaded entries
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('role', 'status');
  liveRegion.className = 'sr-only';
  list.parentNode.insertBefore(liveRegion, list.nextSibling);

  btn.addEventListener('click', function() {
    const prev = visible;
    showEntries(visible + perPage);
    updateHash();
    const loaded = visible - prev;
    if (loaded > 0) {
      liveRegion.textContent = 'Loaded ' + loaded + ' more entries. Showing ' + visible + ' of ' + entries.length + '.';
    }
  });
})();

// SVG teaser injection + draw animation
(function() {
  function getLength(el) {
    try { if (el.getTotalLength) return el.getTotalLength(); } catch(e) {}
    const tag = el.tagName.toLowerCase();
    if (tag === 'line') {
      const dx = (parseFloat(el.getAttribute('x2')) || 0) - (parseFloat(el.getAttribute('x1')) || 0);
      const dy = (parseFloat(el.getAttribute('y2')) || 0) - (parseFloat(el.getAttribute('y1')) || 0);
      return Math.sqrt(dx * dx + dy * dy);
    }
    if (tag === 'circle') return 2 * Math.PI * (parseFloat(el.getAttribute('r')) || 0);
    if (tag === 'rect') {
      const w = parseFloat(el.getAttribute('width')) || 0;
      const h = parseFloat(el.getAttribute('height')) || 0;
      return 2 * (w + h);
    }
    return 300;
  }

  function setupDraw(svg) {
    const items = [];
    const all = svg.querySelectorAll('line, circle, rect, polygon, polyline, path');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const stroke = el.getAttribute('stroke');
      const fill = el.getAttribute('fill');
      if (stroke && stroke !== 'none') {
        const len = getLength(el);
        el.style.strokeDasharray = len;
        el.style.strokeDashoffset = len;
        items.push({ el: el, len: len, type: 'stroke' });
      }
      if (fill && fill !== 'none') {
        el.style.opacity = '0';
        items.push({ el: el, type: 'fill' });
      }
    }
    return items;
  }

  function play(items, dur) {
    dur = dur || 800;
    const sd = dur * 0.75;
    const fd = dur * 0.5;
    for (let i = 0; i < items.length; i++) {
      items[i].el.style.transition = 'none';
      if (items[i].type === 'stroke') items[i].el.style.strokeDashoffset = items[i].len;
      else items[i].el.style.opacity = '0';
    }
    if (items.length) items[0].el.getBoundingClientRect();
    for (let j = 0; j < items.length; j++) {
      if (items[j].type === 'stroke') {
        items[j].el.style.transition = 'stroke-dashoffset ' + sd + 'ms cubic-bezier(0.4,0,0.2,1)';
        items[j].el.style.strokeDashoffset = '0';
      } else {
        items[j].el.style.transition = 'opacity ' + (dur * 0.4) + 'ms ease ' + fd + 'ms';
        items[j].el.style.opacity = '1';
      }
    }
  }

  function injectSvg(img, cb) {
    const src = img.getAttribute('src');
    if (!src || src.indexOf('.svg') === -1) return;
    fetch(src)
      .then(function(r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function(text) {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return;
        const cls = img.className;
        svg.setAttribute('class', cls);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        img.parentNode.replaceChild(svg, img);
        cb(svg);
      })
      .catch(function() { /* SVG injection failed, keep original img */ });
  }

  // Dispatch teasers
  const teasers = document.querySelectorAll('.dispatch-entry-teaser');
  teasers.forEach(function(img) {
    if (img.tagName !== 'IMG') return;
    injectSvg(img, function(svg) {
      const items = setupDraw(svg);
      const entry = svg.closest('.dispatch-entry');
      const ob = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { play(items, 800); ob.disconnect(); }
      }, { threshold: 0.3 });
      ob.observe(svg);
      if (entry) entry.addEventListener('mouseenter', function() { play(items, 600); });
    });
  });

  // Post hero
  const heroImg = document.querySelector('img.post-hero');
  if (heroImg) {
    injectSvg(heroImg, function(svg) {
      const items = setupDraw(svg);
      play(items, 1000);
    });
  }
})();

// ─── Changelog: node highlighting + deep-link ────────────────
// CSS position: sticky handles date/node sticking. This JS only
// manages the .is-active class on timeline dots based on scroll.
(function() {
  var MOBILE = 768;
  var cols = document.querySelectorAll('.changelog-date-col');
  if (!cols.length) return;

  var navEl = document.querySelector('.site-nav');
  var entries = [];

  for (var i = 0; i < cols.length; i++) {
    var col = cols[i];
    var rail = col.nextElementSibling;
    var node = rail ? rail.querySelector('.changelog-node') : null;
    var content = rail ? rail.nextElementSibling : null;
    entries.push({ col: col, node: node, content: content, active: false });
  }

  var ticking = false;

  function update() {
    if (window.innerWidth <= MOBILE) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].active) {
          entries[k].active = false;
          if (entries[k].node) entries[k].node.classList.remove('is-active');
        }
      }
      ticking = false;
      return;
    }

    var navBottom = navEl ? navEl.getBoundingClientRect().bottom : 60;
    var pin = navBottom + 20;
    var viewMid = window.innerHeight / 2;

    for (var j = 0; j < entries.length; j++) {
      var e = entries[j];
      var colRect = e.col.getBoundingClientRect();
      var contentRect = e.content ? e.content.getBoundingClientRect() : colRect;
      var isActive = contentRect.top < viewMid && contentRect.bottom > pin;

      if (e.active !== isActive) {
        e.active = isActive;
        if (e.node) e.node.classList.toggle('is-active', isActive);
      }
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();

// Changelog deep-link: open + scroll to entry on hash
(function() {
  function openFromHash() {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target || target.tagName !== 'DETAILS') return;
    target.open = true;
    requestAnimationFrame(function() {
      var scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    });
  }

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();

// ─── Google Analytics custom events ─────────────────────────────
(function() {
  function ga() { return typeof gtag === 'function'; }

  // Identify CTA location from DOM context
  function ctaLocation(el) {
    var section = el.closest('.cta');
    if (section) return 'cta_section';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.site-footer')) return 'footer';
    if (el.closest('.site-nav, .nav-mobile-cta')) return 'nav';
    if (el.closest('.pricing-card')) return 'pricing_card';
    return 'page';
  }

  // --- CTA button clicks ---
  document.addEventListener('click', function(e) {
    if (!ga()) return;
    var link = e.target.closest('a.btn, a.nav-cta-link');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var text = (link.textContent || '').trim();
    gtag('event', 'cta_click', {
      link_text: text,
      link_url: href,
      cta_location: ctaLocation(link)
    });
  });

  // --- Waitlist form submission ---
  var waitlistForm = document.querySelector('.waitlist-form');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', function() {
      if (!ga()) return;
      var useCases = [];
      waitlistForm.querySelectorAll('input[name="use-case"]:checked').forEach(function(cb) {
        useCases.push(cb.value);
      });
      gtag('event', 'generate_lead', {
        form_name: 'waitlist',
        use_cases: useCases.join(', ') || '(none)'
      });
    });
  }

  // --- Contact form submission ---
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function() {
      if (!ga()) return;
      var inquiryType = (contactForm.querySelector('#inquiry-type') || {}).value || '';
      var useCases = [];
      contactForm.querySelectorAll('input[name="use-case"]:checked').forEach(function(cb) {
        useCases.push(cb.value);
      });
      gtag('event', 'generate_lead', {
        form_name: 'contact',
        inquiry_type: inquiryType,
        use_cases: useCases.join(', ') || '(none)'
      });
    });
  }

  // --- Doc search usage ---
  var searchInput = document.getElementById('search-input');
  if (searchInput) {
    var searchTimeout;
    searchInput.addEventListener('input', function() {
      if (!ga()) return;
      clearTimeout(searchTimeout);
      var q = searchInput.value.trim();
      if (q.length < 2) return;
      searchTimeout = setTimeout(function() {
        gtag('event', 'search', { search_term: q });
      }, 1000);
    });
  }

  // --- Pricing tab / plan engagement ---
  document.querySelectorAll('.pricing-toggle, [data-pricing-tab]').forEach(function(el) {
    el.addEventListener('click', function() {
      if (!ga()) return;
      gtag('event', 'view_item', {
        item_name: (el.textContent || '').trim(),
        item_category: 'pricing_plan'
      });
    });
  });

  // --- Docs sidebar navigation ---
  document.querySelectorAll('.docs-sidebar a').forEach(function(link) {
    link.addEventListener('click', function() {
      if (!ga()) return;
      gtag('event', 'select_content', {
        content_type: 'docs_nav',
        item_id: link.getAttribute('href') || ''
      });
    });
  });

  // --- Dispatch category tab clicks ---
  document.querySelectorAll('.dispatch-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      if (!ga()) return;
      gtag('event', 'select_content', {
        content_type: 'dispatch_category',
        item_id: (tab.textContent || '').trim()
      });
    });
  });

  // --- How It Works tab engagement ---
  document.querySelectorAll('.hiw-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      if (!ga()) return;
      gtag('event', 'select_content', {
        content_type: 'how_it_works_tab',
        item_id: tab.getAttribute('data-hiw-tab') || (tab.textContent || '').trim()
      });
    });
  });

  // --- Copy-to-clipboard events (code blocks, sharing) ---
  document.addEventListener('click', function(e) {
    if (!ga()) return;
    var btn = e.target.closest('[data-copy], .copy-link, .copy-md');
    if (!btn) return;
    gtag('event', 'share', {
      method: btn.classList.contains('copy-md') ? 'copy_markdown' : 'copy_link',
      content_type: 'page',
      item_id: location.pathname
    });
  });
})();
