const menuToggle = document.querySelector('.menu-toggle');
const siteNavigation = document.querySelector('#site-navigation');

if (menuToggle && siteNavigation) {
  const mobileLayout = window.matchMedia('(max-width: 660px)');
  const closeMenu = (returnFocus = false) => {
    menuToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuToggle.focus();
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  siteNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });

  mobileLayout.addEventListener('change', () => closeMenu());
  document.documentElement.classList.add('menu-ready');
}

const projectFilters = document.querySelector('.filters');

if (projectFilters) {
  const filterButtons = [...projectFilters.querySelectorAll('[data-filter]')];
  const projects = [...document.querySelectorAll('.project[data-category]')];
  const filterStatus = document.querySelector('[data-filter-status]');

  projectFilters.addEventListener('click', (event) => {
    const activeButton = event.target.closest('[data-filter]');
    if (!activeButton) return;

    const filter = activeButton.dataset.filter;
    let shown = 0;

    for (const project of projects) {
      project.hidden = filter !== 'all' && !project.dataset.category.split(' ').includes(filter);
      if (!project.hidden) shown += 1;
    }

    for (const button of filterButtons) {
      button.setAttribute('aria-pressed', String(button === activeButton));
    }

    filterStatus.textContent = `Showing ${shown} of ${projects.length} projects.`;
  });

  projectFilters.hidden = false;
}
