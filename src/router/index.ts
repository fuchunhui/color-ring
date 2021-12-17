import {createRouter, createWebHistory} from 'vue-router';

import ColorWrap from '../pages/ColorWrap.vue';
import Twelve from '../pages/Twelve.vue';
import Newton from '../pages/Newton.vue';
import Template from '../pages/Template.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: ColorWrap
  },
  {
    path: '/twelve',
    name: 'twelve',
    component: Twelve
  },
  {
    path: '/cmyk',
    name: 'cmyk',
    component: Template
  },
  {
    path: '/newton',
    name: 'newton',
    component: Newton
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
