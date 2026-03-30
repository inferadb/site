// Announcement banner
(function() {
  var banner = document.getElementById('site-banner');
  if (!banner) return;

  var id = banner.getAttribute('data-banner-id');
  var key = 'banner-dismissed:' + id;

  if (localStorage.getItem(key)) {
    banner.remove();
    return;
  }

  document.body.classList.add('has-banner');

  var close = document.getElementById('site-banner-close');
  if (close) {
    close.addEventListener('click', function() {
      localStorage.setItem(key, '1');
      banner.remove();
      document.body.classList.remove('has-banner');
    });
  }
})();

// Navigation scroll effect
const nav = document.querySelector('.site-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// Mobile menu toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  var savedScroll = 0;
  function openNav() {
    savedScroll = window.scrollY;
    document.body.style.top = -savedScroll + 'px';
    toggle.setAttribute('aria-expanded', 'true');
    links.classList.add('open');
    document.body.classList.add('nav-open');
  }
  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScroll);
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeNav(); else openNav();
  });

  // Close menu on link click
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) closeNav();
  });

  // Close if viewport resizes beyond mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && links.classList.contains('open')) closeNav();
  }, { passive: true });
}

// How-it-works perspective tabs
(function() {
  var tabs = document.querySelectorAll('.hiw-tab');
  var panels = document.querySelectorAll('.hiw-panel');
  if (!tabs.length) return;

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = tab.getAttribute('data-hiw-tab');
      tabs.forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-hiw-tab') === target); });
      panels.forEach(function(p) { p.classList.toggle('active', p.getAttribute('data-hiw-panel') === target); });
    });
  });
})();

// Mega-menu dropdowns
(function() {
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  if (!dropdowns.length) return;

  function closeAll() {
    dropdowns.forEach(function(d) {
      d.classList.remove('open');
      var trigger = d.querySelector('.nav-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  dropdowns.forEach(function(dropdown) {
    var trigger = dropdown.querySelector('.nav-dropdown-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('open');
      closeAll();
      if (!isOpen) {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    // Close on mouse leave (with delay for tolerance)
    var closeTimer;
    dropdown.addEventListener('mouseenter', function() {
      clearTimeout(closeTimer);
    });
    dropdown.addEventListener('mouseleave', function() {
      closeTimer = setTimeout(function() {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }, 200);
    });
  });

  // Close on click outside
  document.addEventListener('click', function() { closeAll(); });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAll();
  });
})();

// Scrollable code blocks — make keyboard-accessible
document.querySelectorAll('pre').forEach(function(pre) {
  if (pre.scrollWidth > pre.clientWidth) {
    pre.setAttribute('tabindex', '0');
    pre.setAttribute('role', 'region');
    pre.setAttribute('aria-label', 'Code example (scroll horizontally)');
  }
});

// ─── Docs search (Cmd+K) ─────────────────────────────────────
(function() {
  var overlay = document.getElementById('search-overlay');
  var input = document.getElementById('search-input');
  var resultsList = document.getElementById('search-results');
  var trigger = document.getElementById('search-trigger');
  if (!overlay || !input) return;

  var index = null;
  var activeIdx = -1;

  function open() {
    overlay.classList.add('open');
    input.value = '';
    while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
    activeIdx = -1;
    input.focus();
    if (!index) {
      fetch('/search.json').then(function(r) { return r.json(); }).then(function(data) {
        index = data;
      });
    }
  }

  function close() {
    overlay.classList.remove('open');
  }

  function createResult(item, query) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = item.url;

    var section = document.createElement('div');
    section.className = 'search-result-section';
    section.textContent = item.section;

    var title = document.createElement('div');
    title.className = 'search-result-title';
    title.textContent = item.title;

    a.appendChild(section);
    a.appendChild(title);

    var snippetText = item.excerpt || '';
    var q = query.toLowerCase();
    if (item.content && item.content.toLowerCase().indexOf(q) >= 0
        && item.title.toLowerCase().indexOf(q) < 0
        && (!item.excerpt || item.excerpt.toLowerCase().indexOf(q) < 0)) {
      var idx = item.content.toLowerCase().indexOf(q);
      var start = Math.max(0, idx - 40);
      var end = Math.min(item.content.length, idx + query.length + 60);
      snippetText = (start > 0 ? '\u2026' : '') + item.content.substring(start, end) + (end < item.content.length ? '\u2026' : '');
    }

    if (snippetText) {
      var excerpt = document.createElement('div');
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
    var q = query.toLowerCase();
    var matches = index.filter(function(item) {
      return item.title.toLowerCase().indexOf(q) >= 0
        || item.excerpt.toLowerCase().indexOf(q) >= 0
        || item.section.toLowerCase().indexOf(q) >= 0
        || (item.content && item.content.toLowerCase().indexOf(q) >= 0);
    }).slice(0, 10);

    if (!matches.length) {
      var empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = 'No results for \u201c' + query + '\u201d';
      resultsList.appendChild(empty);
      activeIdx = -1;
      return;
    }

    matches.forEach(function(item) {
      resultsList.appendChild(createResult(item, query));
    });
    activeIdx = -1;
  }

  function setActive(idx) {
    var links = resultsList.querySelectorAll('a');
    if (!links.length) return;
    activeIdx = Math.max(0, Math.min(idx, links.length - 1));
    links.forEach(function(a, i) { a.classList.toggle('active', i === activeIdx); });
    links[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function() { search(input.value); });

  input.addEventListener('keydown', function(e) {
    var links = resultsList.querySelectorAll('a');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIdx - 1);
    } else if (e.key === 'Enter' && activeIdx >= 0 && links[activeIdx]) {
      e.preventDefault();
      links[activeIdx].click();
    }
  });

  if (trigger) trigger.addEventListener('click', open);

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('open')) close(); else open();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });
})();

// ─── Docs enhancements ───────────────────────────────────────

// 1. Right-side TOC — populate from h2/h3 headings + scroll spy
(function() {
  var tocList = document.querySelector('.docs-toc-list');
  var article = document.querySelector('.docs-content article');
  if (!tocList || !article) return;

  var headings = article.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    var toc = document.querySelector('.docs-toc');
    if (toc) toc.style.display = 'none';
    return;
  }

  // Get heading text without child elements (anchor links, etc.)
  function headingText(h) {
    var clone = h.cloneNode(true);
    var anchors = clone.querySelectorAll('.heading-anchor');
    anchors.forEach(function(a) { a.remove(); });
    return clone.textContent.trim();
  }

  // Detect step number from heading text (e.g., "1. Title" or "Phase 3: Title")
  function parseStepNumber(text) {
    var m = text.match(/^(\d+)[\.\:\)]\s/);
    if (m) return m[1];
    m = text.match(/^(?:Phase|Step)\s+(\d+)/i);
    if (m) return m[1];
    return null;
  }

  headings.forEach(function(h) {
    var text = headingText(h);
    if (!h.id) {
      h.id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    var li = document.createElement('li');
    if (h.tagName === 'H3') li.className = 'toc-h3';
    var a = document.createElement('a');
    a.href = '#' + h.id;

    // Step number in TOC
    var stepNum = (h.tagName === 'H2') ? parseStepNumber(text) : null;
    if (stepNum) {
      li.className = 'toc-step';
      var numSpan = document.createElement('span');
      numSpan.className = 'toc-step-number';
      numSpan.textContent = stepNum;
      a.appendChild(numSpan);
      // Show title without the number prefix
      var titleSpan = document.createElement('span');
      titleSpan.textContent = text.replace(/^(\d+[\.\:\)]\s*|(?:Phase|Step)\s+\d+[:\s]*)/i, '');
      a.appendChild(titleSpan);
    } else {
      a.textContent = text;
    }

    li.appendChild(a);
    tocList.appendChild(li);
  });

  var tocLinks = tocList.querySelectorAll('a');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        tocLinks.forEach(function(link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
        var activeLink = tocList.querySelector('a.active');
        if (activeLink) {
          var li = activeLink.parentElement;
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
  var article = document.querySelector('.docs-content article');
  if (!article) return;

  function headingText(h) {
    var clone = h.cloneNode(true);
    var anchors = clone.querySelectorAll('.heading-anchor');
    anchors.forEach(function(a) { a.remove(); });
    return clone.textContent.trim();
  }

  function parseStepNumber(text) {
    var m = text.match(/^(\d+)[\.\:\)]\s/);
    if (m) return m[1];
    m = text.match(/^(?:Phase|Step)\s+(\d+)/i);
    if (m) return m[1];
    return null;
  }

  var h2s = article.querySelectorAll('h2');
  var stepHeadings = [];
  h2s.forEach(function(h) {
    var num = parseStepNumber(headingText(h));
    if (num) stepHeadings.push({ el: h, num: num });
  });

  if (stepHeadings.length < 2) return;

  // For each step heading, collect all sibling elements until the next h2
  stepHeadings.forEach(function(step) {
    var h = step.el;

    // Create step wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'docs-step';

    // Create number circle
    var circle = document.createElement('span');
    circle.className = 'docs-step-number';
    circle.textContent = step.num;

    // Strip number prefix from heading text
    var firstText = h.firstChild;
    if (firstText && firstText.nodeType === 3) {
      firstText.textContent = firstText.textContent.replace(/^(\d+[\.\:\)]\s*|(?:Phase|Step)\s+\d+[:\s]*)/i, '');
    }

    // Insert wrapper before the heading
    h.parentNode.insertBefore(wrapper, h);
    wrapper.appendChild(circle);
    wrapper.appendChild(h);

    // Move siblings into wrapper until next h2 or another docs-step
    var next = wrapper.nextSibling;
    while (next) {
      var curr = next;
      next = curr.nextSibling;
      if (curr.nodeType === 1 && (curr.tagName === 'H2' || curr.classList.contains('docs-step'))) break;
      wrapper.appendChild(curr);
    }
  });

  // Highlight active step circle on scroll
  var steps = article.querySelectorAll('.docs-step');
  var stepObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      entry.target.classList.toggle('active', entry.isIntersecting);
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

  steps.forEach(function(s) {
    var h = s.querySelector('h2');
    if (h) stepObserver.observe(h);
  });
})();

// TOC actions — copy link, copy markdown
(function() {
  function flashCopied(btn) {
    var orig = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('docs-toc-action-copied');
    setTimeout(function() {
      btn.textContent = orig;
      btn.classList.remove('docs-toc-action-copied');
    }, 1500);
  }

  var copyLink = document.getElementById('toc-copy-link');
  if (copyLink) {
    copyLink.addEventListener('click', function() {
      navigator.clipboard.writeText(window.location.href).then(function() {
        flashCopied(copyLink);
      });
    });
  }

  var copyMd = document.getElementById('toc-copy-md');
  if (copyMd) {
    copyMd.addEventListener('click', function() {
      var src = copyMd.getAttribute('data-src');
      if (!src) return;
      copyMd.textContent = 'Fetching...';
      fetch(src)
        .then(function(r) { return r.ok ? r.text() : Promise.reject(); })
        .then(function(text) {
          return navigator.clipboard.writeText(text);
        })
        .then(function() { flashCopied(copyMd); })
        .catch(function() {
          copyMd.textContent = 'Copy as Markdown';
        });
    });
  }
})();

// 2. Language labels on code blocks
(function() {
  var langNames = {
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
    var classes = block.className.split(' ');
    var lang = '';
    classes.forEach(function(cls) {
      var match = cls.match(/^language-(.+)$/);
      if (match) lang = match[1];
    });
    var name = langNames[lang];
    if (name) {
      var label = document.createElement('span');
      label.className = 'code-lang';
      label.textContent = name;
      var pre = block.querySelector('pre');
      if (pre) {
        pre.style.position = 'relative';
        pre.appendChild(label);
      }
    }
  });
})();

// 2b. Shell command name highlighting
// Wraps the first word of each line in shell blocks with a span for styling.
(function() {
  document.querySelectorAll('.language-bash .highlight code, .language-shell .highlight code, .language-sh .highlight code').forEach(function(code) {
    var nodes = Array.prototype.slice.call(code.childNodes);
    var atLineStart = true;

    nodes.forEach(function(node) {
      if (node.nodeType !== 3) {
        // If it's a comment span (.c), next text node starts a new line
        if (node.classList && node.classList.contains('c')) atLineStart = true;
        return;
      }
      var text = node.textContent;
      if (!text) return;

      // Split on newlines to find line starts
      var lines = text.split('\n');
      if (lines.length <= 1 && !atLineStart) return;

      var frag = document.createDocumentFragment();
      lines.forEach(function(line, i) {
        if (i > 0) frag.appendChild(document.createTextNode('\n'));

        var isStart = (i > 0) || atLineStart;
        var trimmed = line.replace(/^\s+/, '');
        var leading = line.substring(0, line.length - trimmed.length);

        if (isStart && trimmed.length > 0 && !trimmed.startsWith('#')) {
          var firstSpace = trimmed.indexOf(' ');
          var cmd = firstSpace >= 0 ? trimmed.substring(0, firstSpace) : trimmed;
          var rest = firstSpace >= 0 ? trimmed.substring(firstSpace) : '';

          if (leading) frag.appendChild(document.createTextNode(leading));
          var span = document.createElement('span');
          span.className = 'sh-cmd';
          span.textContent = cmd;
          frag.appendChild(span);
          if (rest) frag.appendChild(document.createTextNode(rest));
        } else {
          frag.appendChild(document.createTextNode(line));
        }
      });

      // Track whether next node starts a new line
      atLineStart = text.endsWith('\n');
      node.parentNode.replaceChild(frag, node);
    });
  });
})();

// 3. Copy-to-clipboard on code blocks
(function() {
  document.querySelectorAll('.docs-content pre, .post-body pre').forEach(function(pre) {
    var btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function() {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
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

// Heading anchor links
(function() {
  function createLinkIcon() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71');
    var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    var anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + h.id;
    anchor.setAttribute('aria-label', 'Copy link to ' + h.textContent.trim());
    anchor.appendChild(createLinkIcon());
    h.appendChild(anchor);
  });
})();

// Docs sidebar scroll persistence
(function() {
  var sidebar = document.querySelector('.docs-sidebar');
  if (!sidebar) return;
  var key = 'docs-sidebar-scroll';
  var saved = sessionStorage.getItem(key);
  if (saved) sidebar.scrollTop = parseInt(saved, 10);
  sidebar.addEventListener('scroll', function() {
    sessionStorage.setItem(key, sidebar.scrollTop);
  }, { passive: true });
})();

// Collapsible sidebar sections (with sessionStorage persistence)
(function() {
  var groups = document.querySelectorAll('.docs-nav-group');
  if (!groups.length) return;

  var storageKey = 'docs-sidebar-sections';
  var saved = sessionStorage.getItem(storageKey);
  var savedState = null;

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
    var state = [];
    groups.forEach(function(group) {
      state.push(group.classList.contains('open'));
    });
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }

  groups.forEach(function(group) {
    var btn = group.querySelector('.docs-nav-heading');
    if (!btn) return;
    var isOpen = group.classList.contains('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    btn.addEventListener('click', function() {
      var wasOpen = group.classList.contains('open');
      group.classList.toggle('open');
      btn.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
      persistState();
    });
  });
})();

// Docs feedback widget
(function() {
  var container = document.getElementById('docs-feedback');
  if (!container) return;

  var key = 'docs-feedback:' + window.location.pathname;
  var saved = localStorage.getItem(key);
  var thanks = container.querySelector('.docs-feedback-thanks');
  var buttons = container.querySelectorAll('.docs-feedback-btn');

  if (saved) {
    buttons.forEach(function(btn) {
      if (btn.dataset.value === saved) btn.classList.add('selected');
      btn.disabled = true;
    });
    thanks.hidden = false;
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var value = btn.dataset.value;
      localStorage.setItem(key, value);
      buttons.forEach(function(b) {
        b.classList.toggle('selected', b.dataset.value === value);
        b.disabled = true;
      });
      thanks.hidden = false;
    });
  });
})();

// ─── Authorization Graph Visualization ───────────────────────
// Simulates live ReBAC query resolution in the hero background.
(function() {
  var canvas = document.getElementById('constellation');
  if (!canvas) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var W, H, isMobile;
  var nodes = [], edges = [], pulses = [];
  var mouseX = -1000, mouseY = -1000;
  var raf = null, running = false, time = 0;

  var amber = [200, 164, 78];
  var teal = [86, 182, 194];
  var green = [106, 158, 74];
  var red = [212, 88, 88];

  var types = [
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
    for (var a = 0; a < nodes.length; a++) {
      var c = 0;
      for (var b = a + 1; b < nodes.length; b++) {
        if (c >= 4) break;
        var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
        var maxDist = isMobile ? 120 : 200;
        if (Math.sqrt(dx * dx + dy * dy) < maxDist && Math.random() < 0.5) {
          edges.push([a, b]);
          c++;
        }
      }
    }
  }

  function init() {
    resize();
    nodes = []; pulses = [];
    var count = isMobile
      ? Math.max(12, Math.min(25, Math.floor(W * H / 15000)))
      : Math.max(30, Math.min(70, Math.floor(W * H / 6000)));
    for (var i = 0; i < count; i++) {
      var t = types[Math.floor(Math.random() * types.length)];
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        c: t.c, r: t.r, glow: 0
      });
    }
    buildEdges();
    buildAdj();
  }

  // Build adjacency list for fast neighbor lookups
  var adj = [];
  function buildAdj() {
    adj = [];
    for (var i = 0; i < nodes.length; i++) adj[i] = [];
    for (var e = 0; e < edges.length; e++) {
      adj[edges[e][0]].push(edges[e][1]);
      adj[edges[e][1]].push(edges[e][0]);
    }
  }

  // Simulate a graph traversal query with branching exploration.
  // Models how InferaDB resolves: check(user:X, permission, resource:Y)
  // — walks the relationship graph, exploring union branches in parallel.
  function fireQuery() {
    if (!adj.length) return;

    // Pick a starting node (the "subject" — e.g., user:alice)
    var start = Math.floor(Math.random() * nodes.length);
    if (!adj[start] || !adj[start].length) return;

    // BFS/DFS traversal with branching — collect all explored paths
    var branches = [];
    var visited = {};
    visited[start] = 1;
    var maxDepth = 3 + Math.floor(Math.random() * 4); // 3-6 hops deep

    // Explore multiple branches from the start (like union evaluation)
    var branchCount = Math.min(adj[start].length, 2 + Math.floor(Math.random() * 2));
    var startNeighbors = adj[start].slice();
    shuffle(startNeighbors);

    for (var b = 0; b < branchCount; b++) {
      if (b >= startNeighbors.length) break;
      var path = [start];
      var cur = startNeighbors[b];
      path.push(cur);
      var localVisited = {};
      localVisited[start] = 1;
      localVisited[cur] = 1;

      // Walk this branch deeper
      for (var d = 0; d < maxDepth - 1; d++) {
        var neighbors = [];
        for (var n = 0; n < adj[cur].length; n++) {
          if (!localVisited[adj[cur][n]]) neighbors.push(adj[cur][n]);
        }
        if (!neighbors.length) break;
        // Occasionally branch again mid-path (tuple-to-userset traversal)
        if (neighbors.length > 1 && Math.random() < 0.3 && d < maxDepth - 2) {
          shuffle(neighbors);
          // Fork: create a sub-branch from this point
          var fork = path.slice();
          fork.push(neighbors[1]);
          branches.push({ path: fork, isFork: true });
          // Continue main branch with first neighbor
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

    // Determine result — one branch "succeeds" (allowed), others may not
    var allowedBranch = Math.floor(Math.random() * branches.length);
    var queryAllowed = Math.random() < 0.75;

    // Stagger the branch pulses slightly for visual effect
    for (var i = 0; i < branches.length; i++) {
      if (branches[i].path.length < 2) continue;
      var isWinner = (i === allowedBranch) && queryAllowed;
      var branchColor = isWinner ? green : (queryAllowed ? amber : red);
      // Denied branches use amber (explored but not the granting path)
      // The winning branch lights up green
      // If query denied overall, last branch goes red
      if (!queryAllowed && i === branches.length - 1) branchColor = red;

      pulses.push({
        path: branches[i].path,
        t: 0,
        spd: 0.015 + Math.random() * 0.008,
        c: branchColor,
        age: 0,
        ttl: 140,
        delay: i * 12, // stagger start
        isWinner: isWinner
      });
    }
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Static edges
    ctx.lineWidth = 0.5;
    for (var e = 0; e < edges.length; e++) {
      var a = nodes[edges[e][0]], b = nodes[edges[e][1]];
      ctx.strokeStyle = rgba(amber, 0.03);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Query pulses
    for (var p = 0; p < pulses.length; p++) {
      var pl = pulses[p];
      if (pl.delay > 0) continue;
      var seg = Math.floor(pl.t), frac = pl.t - seg;
      var fade = pl.age > 0 ? Math.max(0, 1 - pl.age / pl.ttl) : 1;
      var lineW = pl.isWinner ? 1.5 : 0.8;

      // Lit edges
      ctx.lineWidth = lineW;
      for (var s = 0; s < Math.min(seg + 1, pl.path.length - 1); s++) {
        var ea = (s < seg ? 0.15 : frac * 0.15) * fade;
        ctx.strokeStyle = rgba(pl.c, ea);
        ctx.beginPath();
        ctx.moveTo(nodes[pl.path[s]].x, nodes[pl.path[s]].y);
        ctx.lineTo(nodes[pl.path[s+1]].x, nodes[pl.path[s+1]].y);
        ctx.stroke();
      }

      // Moving dot
      if (seg < pl.path.length - 1) {
        var f = nodes[pl.path[seg]], t = nodes[pl.path[seg+1]];
        var px = f.x + (t.x - f.x) * frac, py = f.y + (t.y - f.y) * frac;
        var dotR = pl.isWinner ? 2.5 : 1.8;
        ctx.fillStyle = rgba(pl.c, 0.5);
        ctx.beginPath(); ctx.arc(px, py, dotR, 0, 6.28); ctx.fill();
        ctx.fillStyle = rgba(pl.c, 0.06);
        ctx.beginPath(); ctx.arc(px, py, 8, 0, 6.28); ctx.fill();

        // Light up nodes as the pulse passes through
        nodes[pl.path[seg]].glow = Math.max(nodes[pl.path[seg]].glow, 0.15);
        t.glow = Math.max(t.glow, frac * 0.25);
      }

      // Terminal flash
      if (pl.age > 0 && pl.age < 30) {
        var tn = nodes[pl.path[pl.path.length - 1]];
        var flashR = pl.isWinner ? 12 : 8;
        var flashA = (1 - pl.age / 30) * (pl.isWinner ? 0.3 : 0.15);
        ctx.fillStyle = rgba(pl.c, flashA);
        ctx.beginPath(); ctx.arc(tn.x, tn.y, flashR, 0, 6.28); ctx.fill();
      }
    }

    // Nodes
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      var mdx = n.x - mouseX, mdy = n.y - mouseY;
      var md = Math.sqrt(mdx * mdx + mdy * mdy);
      var mg = md < 180 ? (1 - md / 180) * 0.15 : 0;
      var na = Math.min(0.08 + n.glow + mg, 0.4);
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

    for (var i = 0; i < nodes.length; i++) {
      nodes[i].glow *= 0.94;
    }

    for (var p = pulses.length - 1; p >= 0; p--) {
      var pl = pulses[p];
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

  function loop() {
    if (!running) return;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() { if (!running) { running = true; loop(); } }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }

  canvas.parentElement.addEventListener('mousemove', function(e) {
    var r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
  }, { passive: true });
  canvas.parentElement.addEventListener('mouseleave', function() { mouseX = mouseY = -1000; });
  window.addEventListener('resize', function() { resize(); }, { passive: true });

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stop(); else if (!reducedMotion && heroVisible) start();
  });

  // Pause when hero is scrolled out of view
  var heroVisible = true;
  var heroObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      heroVisible = entry.isIntersecting;
      if (heroVisible && !reducedMotion) start();
      else stop();
    });
  }, { threshold: 0 });
  heroObserver.observe(canvas.parentElement);

  init();
  if (reducedMotion) {
    for (var q = 0; q < 3; q++) fireQuery();
    pulses.forEach(function(pl) { pl.t = pl.path.length - 1; pl.age = 10; });
    draw();
  } else {
    start();
  }
})();

// ─── Numeric decrypt effect ──────────────────────────────────
// Elements with [data-decrypt-num] scramble through digits/symbols
// before resolving. Resets on scroll out.
(function() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var digits = '0123456789';
  var elements = document.querySelectorAll('[data-decrypt-num]');
  if (!elements.length) return;

  if (reducedMotion) {
    elements.forEach(function(el) { el.textContent = el.getAttribute('data-decrypt-num'); });
    return;
  }

  var active = new Map();

  function scramble(el) {
    var target = el.getAttribute('data-decrypt-num');
    var len = target.length;
    var resolved = new Array(len).fill(false);
    var current = new Array(len);
    var frame = 0;

    var resolveFrames = [];
    for (var i = 0; i < len; i++) {
      resolveFrames[i] = 15 + i * 5 + Math.floor(Math.random() * 20);
      // Keep symbols/letters as-is from the start, only scramble digits
      if ('0123456789'.indexOf(target[i]) >= 0) {
        current[i] = digits[Math.floor(Math.random() * digits.length)];
      } else {
        current[i] = target[i];
        resolved[i] = true;
      }
    }
    el.textContent = current.join('');

    function tick() {
      frame++;
      var allDone = true;

      for (var i = 0; i < len; i++) {
        if (resolved[i]) continue;
        if (frame >= resolveFrames[i]) {
          resolved[i] = true;
          current[i] = target[i];
        } else {
          var nearResolve = frame / resolveFrames[i];
          if (nearResolve > 0.6) {
            current[i] = Math.random() < 0.25 ? target[i] : digits[Math.floor(Math.random() * digits.length)];
          } else if (frame % 2 === 0) {
            current[i] = digits[Math.floor(Math.random() * digits.length)];
          }
          allDone = false;
        }
      }

      el.textContent = current.join('');

      if (allDone) {
        active.delete(el);
      } else {
        active.set(el, requestAnimationFrame(tick));
      }
    }

    if (active.has(el)) { cancelAnimationFrame(active.get(el)); }
    active.set(el, requestAnimationFrame(tick));
  }

  function reset(el) {
    if (active.has(el)) { cancelAnimationFrame(active.get(el)); active.delete(el); }
    // Fill with scrambled text at correct length to preserve layout
    var target = el.getAttribute('data-decrypt-num');
    var out = '';
    for (var i = 0; i < target.length; i++) {
      if ('0123456789'.indexOf(target[i]) >= 0) {
        out += digits[Math.floor(Math.random() * digits.length)];
      } else {
        out += target[i];
      }
    }
    el.textContent = out;
  }

  var timeouts = new Map();
  var idleAnims = new Map();

  // Show cycling random digits until the real decrypt starts
  function startIdle(el) {
    var target = el.getAttribute('data-decrypt-num');
    var len = target.length;
    function tick() {
      var out = '';
      for (var i = 0; i < len; i++) {
        if ('0123456789'.indexOf(target[i]) >= 0) {
          out += digits[Math.floor(Math.random() * digits.length)];
        } else {
          out += target[i];
        }
      }
      el.textContent = out;
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

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = parseInt(entry.target.getAttribute('data-decrypt-delay') || '0', 10);
        // Start idle scrambling immediately
        startIdle(entry.target);
        // After delay, stop idle and begin real decrypt
        var tid = setTimeout(function() {
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

  // Scramble on init — real text is in DOM for crawlers, JS scrambles for visual effect
  elements.forEach(function(el) {
    var target = el.getAttribute('data-decrypt-num');
    var out = '';
    for (var i = 0; i < target.length; i++) {
      if ('0123456789'.indexOf(target[i]) >= 0) {
        out += digits[Math.floor(Math.random() * digits.length)];
      } else {
        out += target[i];
      }
    }
    el.textContent = out;
    observer.observe(el);
  });
})();

// ─── Viewport reveal animations ──────────────────────────────
// Elements with [data-reveal] fade/slide in when they enter the viewport.
// Respects prefers-reduced-motion.
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        // Apply delay if set
        var delay = entry.target.getAttribute('data-reveal-delay');
        if (delay) {
          entry.target.style.transitionDelay = delay + 'ms';
        }
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target); // only animate once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(function(el) { observer.observe(el); });
})();

// ─── Hero title decrypt + phrase cycling ─────────────────────
(function() {
  var hero = document.querySelector('[data-hero-decrypt]');
  if (!hero) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var statics = hero.querySelectorAll('[data-hero-static]');
  var cycleEl = hero.querySelector('[data-hero-cycle]');
  if (!cycleEl) return;

  var phrases = cycleEl.getAttribute('data-phrases').split(',');
  var charsUpper = 'ABCDEFGHJKLNPRSTUX';  // avoid wide M/W/O
  var charsLower = 'abcdefghjklmnprstux0123456789';
  var currentPhrase = 0;

  function randChar(original) {
    if (original === original.toUpperCase()) {
      return charsUpper[Math.floor(Math.random() * charsUpper.length)];
    }
    return charsLower[Math.floor(Math.random() * charsLower.length)];
  }
  var cycleInterval = null;
  var animFrame = null;

  function decryptText(el, text, onDone) {
    var len = text.length;
    var resolved = new Array(len).fill(false);
    var current = new Array(len);
    var frame = 0;

    // Each character gets a random number of "scramble cycles" before resolving
    // Creates a wave that moves left-to-right but with organic variation
    var resolveFrames = [];
    for (var i = 0; i < len; i++) {
      // Base delay increases per character, plus random jitter
      resolveFrames[i] = 8 + i * 2.5 + Math.floor(Math.random() * 8);
      current[i] = text[i] === ' ' ? ' ' : randChar(text[i]);
    }
    el.textContent = current.join('');

    function tick() {
      frame++;
      var done = true;
      for (var i = 0; i < len; i++) {
        if (resolved[i]) continue;
        if (text[i] === ' ') { resolved[i] = true; current[i] = ' '; continue; }
        if (frame >= resolveFrames[i]) {
          resolved[i] = true;
          current[i] = text[i];
        } else {
          var nearResolve = frame / resolveFrames[i];
          if (nearResolve > 0.7) {
            current[i] = Math.random() < 0.3 ? text[i] : randChar(text[i]);
          } else if (frame % 3 === 0) {
            current[i] = randChar(text[i]);
          }
          done = false;
        }
      }
      el.textContent = current.join('');
      if (done) {
        if (onDone) onDone();
      } else {
        animFrame = requestAnimationFrame(tick);
      }
    }
    animFrame = requestAnimationFrame(tick);
  }

  function encryptThenDecrypt(el, newText, onDone) {
    var oldText = el.textContent;
    var frame = 0;
    var encryptFrames = 20;
    var current = oldText.split('');

    function tick() {
      frame++;
      if (frame <= encryptFrames) {
        // Gradually scramble — more characters corrupt each frame
        var corruption = frame / encryptFrames;
        for (var i = 0; i < current.length; i++) {
          if (current[i] === ' ') continue;
          if (Math.random() < corruption * 0.5) {
            current[i] = randChar(current[i]);
          }
        }
        el.textContent = current.join('');
        animFrame = requestAnimationFrame(tick);
      } else {
        // Switch to decrypting new text
        decryptText(el, newText, onDone);
      }
    }
    animFrame = requestAnimationFrame(tick);
  }

  function startCycling() {
    cycleInterval = setInterval(function() {
      currentPhrase = (currentPhrase + 1) % phrases.length;
      var newText = phrases[currentPhrase];

      // Blur out, swap text, blur in — no scramble, no reflow
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
    // Just show the text, cycle without animation
    statics.forEach(function(el) { /* already has text */ });
    var phraseIdx = 0;
    setInterval(function() {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      cycleEl.textContent = phrases[phraseIdx];
    }, 4000);
    return;
  }

  // Keep the real text in the DOM for correct layout.
  // On view, scramble it in-place then decrypt back — no layout shift.
  var staticTexts = [];
  statics.forEach(function(el) { staticTexts.push(el.textContent); });
  var firstPhrase = cycleEl.textContent;

  // Initial reveal uses CSS blur/clip — no text changes, no reflow.
  // Only the cycling phrase uses text-swap decrypt after the first reveal.
  var allParts = Array.prototype.slice.call(statics);
  allParts.push(cycleEl);

  // Hide all parts with CSS
  allParts.forEach(function(el) {
    el.style.filter = 'blur(8px)';
    el.style.opacity = '0';
    el.style.transition = 'none';
  });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = 0;
        allParts.forEach(function(el) {
          setTimeout(function() {
            el.style.transition = 'filter 0.8s ease-out, opacity 0.8s ease-out';
            el.style.filter = 'blur(0px)';
            el.style.opacity = '1';
          }, delay);
          delay += 250;
        });
        // Start phrase cycling after all parts have revealed
        setTimeout(function() {
          startCycling();
        }, delay + 3000);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(hero);

  // Pause when tab hidden
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stopCycling();
    else if (!cycleInterval) startCycling();
  });
})();

// ─── Cipher decrypt effect ───────────────────────────────────
// Elements with [data-decrypt] scramble through random characters
// before resolving to their real text. Resets when scrolled out of view.
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Just show the text immediately
    document.querySelectorAll('[data-decrypt]').forEach(function(el) {
      el.textContent = el.getAttribute('data-decrypt');
    });
    return;
  }

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  var elements = document.querySelectorAll('[data-decrypt]');
  if (!elements.length) return;

  var active = new Map();

  function scramble(el) {
    var target = el.getAttribute('data-decrypt');
    var len = target.length;
    var resolved = new Array(len).fill(false);
    var current = new Array(len);
    var frame = 0;

    var resolveFrames = [];
    for (var i = 0; i < len; i++) {
      resolveFrames[i] = 8 + i * 2.5 + Math.floor(Math.random() * 8);
      current[i] = target[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
    }
    el.textContent = current.join('');

    function tick() {
      frame++;
      var allDone = true;

      for (var i = 0; i < len; i++) {
        if (resolved[i]) continue;
        if (target[i] === ' ' || target[i] === '/') {
          resolved[i] = true;
          current[i] = target[i];
          continue;
        }

        if (frame >= resolveFrames[i]) {
          resolved[i] = true;
          current[i] = target[i];
        } else {
          var nearResolve = frame / resolveFrames[i];
          if (nearResolve > 0.7) {
            current[i] = Math.random() < 0.3 ? target[i] : chars[Math.floor(Math.random() * chars.length)];
          } else if (frame % 3 === 0) {
            current[i] = chars[Math.floor(Math.random() * chars.length)];
          }
          allDone = false;
        }
      }

      el.textContent = current.join('');

      if (allDone) {
        active.delete(el);
      } else {
        active.set(el, requestAnimationFrame(tick));
      }
    }

    // Cancel any existing animation on this element
    if (active.has(el)) {
      cancelAnimationFrame(active.get(el));
    }
    active.set(el, requestAnimationFrame(tick));
  }

  function reset(el) {
    if (active.has(el)) {
      cancelAnimationFrame(active.get(el));
      active.delete(el);
    }
    // Fill with scrambled text at correct length to preserve layout
    var target = el.getAttribute('data-decrypt');
    var out = '';
    for (var i = 0; i < target.length; i++) {
      if (target[i] === ' ' || target[i] === '/') {
        out += target[i];
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        scramble(entry.target);
      } else {
        reset(entry.target);
      }
    });
  }, {
    threshold: 0.5
  });

  // Scramble on init — real text is in DOM for crawlers, JS scrambles for visual effect
  elements.forEach(function(el) {
    var target = el.getAttribute('data-decrypt');
    var out = '';
    for (var i = 0; i < target.length; i++) {
      if (target[i] === ' ' || target[i] === '/') {
        out += target[i];
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;
    observer.observe(el);
  });
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="/#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').replace('/', '');
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', id);
    }
  });
});

// ─── Docs Tabs ──────────────────────────────────────────────
(function() {
  var tabGroups = document.querySelectorAll('.docs-tabs');
  if (!tabGroups.length) return;

  tabGroups.forEach(function(group) {
    var tabs = group.querySelectorAll('.docs-tab');
    var panels = group.querySelectorAll('.docs-tab-panel');
    var id = group.dataset.tabsId;

    var saved = localStorage.getItem('docs-tab:' + id);
    if (saved !== null) {
      var idx = parseInt(saved, 10);
      if (idx >= 0 && idx < tabs.length) {
        tabs.forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        tabs[idx].classList.add('active');
        tabs[idx].setAttribute('aria-selected', 'true');
        panels[idx].classList.add('active');
      }
    }

    tabs.forEach(function(tab, i) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        panels[i].classList.add('active');
        localStorage.setItem('docs-tab:' + id, i);
      });
    });
  });
})();

// ─── Code Tabs ───────────────────────────────────────────────
(function () {
  var STORAGE_KEY = 'inferadb-docs-lang';

  function activateTab(group, lang) {
    var buttons = group.querySelectorAll('.code-tabs-nav button');
    var panels = group.querySelectorAll('.code-tabs-panel');
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-lang') === lang);
    });
    // Update SDK link if present
    var activeBtn = group.querySelector('.code-tabs-nav button.active');
    var sdkLink = group.querySelector('.code-tabs-sdk-link');
    if (activeBtn && sdkLink) {
      var url = activeBtn.getAttribute('data-sdk-url');
      var name = activeBtn.getAttribute('data-sdk-name');
      if (url && name) {
        var a = sdkLink.querySelector('a');
        if (a) {
          a.href = url;
          a.textContent = name;
        }
      }
    }
  }

  function syncAll(lang) {
    document.querySelectorAll('.code-tabs').forEach(function (group) {
      var hasLang = group.querySelector('[data-lang="' + lang + '"]');
      if (hasLang) activateTab(group, lang);
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.code-tabs-nav button');
    if (!btn) return;
    var lang = btn.getAttribute('data-lang');
    if (lang) syncAll(lang);
  });

  // On page load, restore preference or use first tab
  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  document.querySelectorAll('.code-tabs').forEach(function (group) {
    var first = group.querySelector('.code-tabs-nav button');
    if (!first) return;
    var lang = saved && group.querySelector('[data-lang="' + saved + '"]')
      ? saved
      : first.getAttribute('data-lang');
    activateTab(group, lang);
  });
})();

// Dispatch load more
(function() {
  var list = document.getElementById('dispatch-list');
  var btn = document.getElementById('dispatch-load-more');
  if (!list || !btn) return;

  var entries = list.querySelectorAll('.dispatch-entry');
  var perPage = parseInt(list.getAttribute('data-per-page') || '10', 10);
  var visible = Math.min(perPage, entries.length);

  // Hide entries beyond initial page
  for (var i = 0; i < entries.length; i++) {
    entries[i].style.display = i < visible ? '' : 'none';
  }

  // Hide button if all entries fit on first page
  if (visible >= entries.length) {
    btn.style.display = 'none';
    return;
  }

  btn.addEventListener('click', function() {
    var next = Math.min(visible + perPage, entries.length);
    for (var i = visible; i < next; i++) {
      entries[i].style.display = '';
    }
    visible = next;
    if (visible >= entries.length) {
      btn.style.display = 'none';
    }
  });
})();
