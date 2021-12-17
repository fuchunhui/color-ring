import {createRouter, createWebHistory} from 'vue-router';

import {
  ColorWrap,
  Light,
  CMYK,
  Art,
  Twelve,
  Newton
} from '../pages';

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
    path: '/art',
    name: 'art',
    component: Art
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
