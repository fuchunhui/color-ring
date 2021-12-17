import {createRouter, createWebHistory} from 'vue-router';

import ColorWrap from '../pages/ColorWrap.vue';
import Twelve from '../pages/Twelve.vue';
import Newton from '../pages/Newton.vue';
import Light from '../pages/Light.vue';
import CMYK from '../pages/CMYK.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: ColorWrap
  },
  {
    path: '/rgb',
    name: 'rgb',
    component: Light
  },
  {
    path: '/cmyk',
    name: 'cmyk',
    component: CMYK
  },
  {
    path: '/twelve',
    name: 'twelve',
    component: Twelve
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
