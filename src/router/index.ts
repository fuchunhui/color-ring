import {createRouter, createWebHistory} from 'vue-router';

import ImageWrap from '../pages/ColorWrap.vue';

const routes = [
  {
    path: '/',
    component: ImageWrap
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
