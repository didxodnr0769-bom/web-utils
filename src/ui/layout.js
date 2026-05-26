import { renderSidebar } from './sidebar.js';

export function mountLayout(root, views) {
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <h1>Web Utils</h1>
  `;
  root.appendChild(header);

  const app = document.createElement('div');
  app.className = 'app';

  const sidebar = document.createElement('nav');
  sidebar.className = 'sidebar';
  renderSidebar(sidebar, views);
  app.appendChild(sidebar);

  const main = document.createElement('main');
  main.className = 'main';
  app.appendChild(main);

  root.appendChild(app);
  return main;
}
