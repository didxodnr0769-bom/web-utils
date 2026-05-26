import { initRouter } from './router.js';
import { mountLayout } from './ui/layout.js';
import { views } from './views/index.js';

const root = document.getElementById('app');
const slot = mountLayout(root, views);
initRouter(slot, views);
