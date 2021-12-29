import {createRouter, createWebHistory} from 'vue-router';

import {
  ColorWrap,
  Light,
  CMYK,
  Art,
  Twelve,
  FortyEight,
  NinetySix,
  Itten,
  Palette,
  RandomPalette,
  ProgressivePalette
} from '../pages';

const routes = [
  {
    path: '/',
    name: 'home',
    label: '色彩的世界',
    component: ColorWrap
  },
  {
    path: '/rgb',
    name: 'rgb',
    label: '光的三原色（RGB模型）',
    component: Light
  },
  {
    path: '/cmyk',
    name: 'cmyk',
    label: '印刷四色（CMYK模型）',
    component: CMYK
  },
  {
    path: '/twelve',
    name: 'twelve',
    label: '十二色环（RGB模型）',
    component: Twelve
  },
  {
    path: '/fortyeight',
    name: 'fortyeight',
    label: '四十八色环（RGB模型）',
    component: FortyEight
  },
  {
    path: '/ninetysix',
    name: 'ninetysix',
    label: '九十六色环（RGB模型）',
    component: NinetySix
  },
  {
    path: '/itten',
    name: 'itten',
    label: '伊登十二色环（RYB模型）',
    component: Itten
  },
  {
    path: '/palette',
    name: 'palette',
    label: '调色板',
    component: Palette
  },
  {
    path: '/random',
    name: 'random',
    label: '嘿，动起来',
    component: RandomPalette
  },
  {
    path: '/progress',
    name: 'progress',
    label: '渐进式的调色板',
    component: ProgressivePalette
  },
  {
    path: '/art',
    name: 'art',
    label: '美术三原色（RYB模型测试中）',
    component: Art
  }
];

const catalogList = routes.map(({label, name}) => {
  return {
    label,
    value: name.toUpperCase()
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;

export {
  catalogList
};

