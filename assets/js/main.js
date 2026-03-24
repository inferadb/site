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
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !expanded);
    links.classList.toggle('open');
  });

  // Close menu on link click
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

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
