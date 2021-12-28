import {createRouter, createWebHistory} from 'vue-router';

import {
  ColorWrap,
  Light,
  CMYK,
  Art,
  Twelve,
  FortyEight,
  Itten,
  TwentyFourth
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
    path: '/itten',
    name: 'itten',
    component: Itten
  },
  {
    path: '/fortyeight',
    name: 'fortyeight',
    component: FortyEight
  },
  {
    path: '/twentyfourth',
    name: 'twentyfourth',
    component: TwentyFourth
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
