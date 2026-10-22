import {createRouter, createWebHashHistory} from 'vue-router';

import {
  ColorWrap,
  Light,
  CMYK,
  Halftone,
  Art,
  Twelve,
  FortyEight,
  NinetySix,
  Itten,
  Harmony,
  Picker,
  Palette,
  RandomPalette,
  ProgressivePalette,
  Compositing,
  Gamma,
  Perceptual,
  ColorBlind,
  Contrast,
  Yuv,
  Spectrum,
  Cie,
  WhiteBalance,
  Illusion,
  ToneMap,
  Dither,
  Munsell,
  DeltaE,
  GamutMap,
  ColorScale,
  CssColor,
  Illuminant,
  Lms,
  Subtractive,
  HsLuv,
  Luv,
  Cam16,
  Solid,
  Opponent,
  Matching,
  Scotopic,
  Ncs,
  ThinFilm,
  Sky,
  Kubelka,
  Bayer,
  Subpixel,
  Apca,
  ColorName
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
    path: '/halftone',
    name: 'halftone',
    label: '印刷网点（CMYK半色调）',
    component: Halftone
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
    label: '伊登十二色环（RYB近似）',
    component: Itten
  },
  {
    path: '/art',
    name: 'art',
    label: '美术三原色（RYB模型）',
    component: Art
  },
  {
    path: '/harmony',
    name: 'harmony',
    label: '配色和谐（色环与角度）',
    component: Harmony
  },
  {
    path: '/picker',
    name: 'picker',
    label: 'HSV/HSL拾色盘',
    component: Picker
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
    path: '/compositing',
    name: 'compositing',
    label: '混合（Compositing）',
    component: Compositing
  },
  {
    path: '/gamma',
    name: 'gamma',
    label: 'Gamma与线性光',
    component: Gamma
  },
  {
    path: '/perceptual',
    name: 'perceptual',
    label: '感知均匀空间（Lab/OKLCH）',
    component: Perceptual
  },
  {
    path: '/colorblind',
    name: 'colorblind',
    label: '色盲模拟',
    component: ColorBlind
  },
  {
    path: '/contrast',
    name: 'contrast',
    label: '亮度与对比度（WCAG）',
    component: Contrast
  },
  {
    path: '/yuv',
    name: 'yuv',
    label: '视频色彩模型（YUV）',
    component: Yuv
  },
  {
    path: '/spectrum',
    name: 'spectrum',
    label: '光谱与色温',
    component: Spectrum
  },
  {
    path: '/cie',
    name: 'cie',
    label: 'CIE 1931 色度图',
    component: Cie
  },
  {
    path: '/whitebalance',
    name: 'whitebalance',
    label: '色彩恒常与白平衡',
    component: WhiteBalance
  },
  {
    path: '/illusion',
    name: 'illusion',
    label: '同时对比与色彩错觉',
    component: Illusion
  },
  {
    path: '/tonemap',
    name: 'tonemap',
    label: '色调映射与HDR',
    component: ToneMap
  },
  {
    path: '/dither',
    name: 'dither',
    label: '抖动与色彩量化',
    component: Dither
  },
  {
    path: '/munsell',
    name: 'munsell',
    label: 'Munsell色立体切片',
    component: Munsell
  },
  {
    path: '/deltae',
    name: 'deltae',
    label: '色差公式（ΔE）',
    component: DeltaE
  },
  {
    path: '/gamutmap',
    name: 'gamutmap',
    label: '色域映射',
    component: GamutMap
  },
  {
    path: '/colorscale',
    name: 'colorscale',
    label: '色阶生成器（OKLCH）',
    component: ColorScale
  },
  {
    path: '/csscolor',
    name: 'csscolor',
    label: 'CSS颜色写法',
    component: CssColor
  },
  {
    path: '/illuminant',
    name: 'illuminant',
    label: '光源与显色指数',
    component: Illuminant
  },
  {
    path: '/lms',
    name: 'lms',
    label: '三色视锥响应（LMS）',
    component: Lms
  },
  {
    path: '/subtractive',
    name: 'subtractive',
    label: '光谱减色混合',
    component: Subtractive
  },
  {
    path: '/hsluv',
    name: 'hsluv',
    label: 'HSLuv：更均匀的HSL',
    component: HsLuv
  },
  {
    path: '/luv',
    name: 'luv',
    label: 'CIELUV与色度均匀性',
    component: Luv
  },
  {
    path: '/cam16',
    name: 'cam16',
    label: 'CAM16与HDR色彩空间',
    component: Cam16
  },
  {
    path: '/solid',
    name: 'solid',
    label: '色立体3D浏览器',
    component: Solid
  },
  {
    path: '/opponent',
    name: 'opponent',
    label: '对立色理论与后像',
    component: Opponent
  },
  {
    path: '/matching',
    name: 'matching',
    label: '颜色匹配实验（CIE RGB）',
    component: Matching
  },
  {
    path: '/scotopic',
    name: 'scotopic',
    label: '暗视觉与浦肯野效应',
    component: Scotopic
  },
  {
    path: '/ncs',
    name: 'ncs',
    label: 'NCS自然色系统（近似）',
    component: Ncs
  },
  {
    path: '/thinfilm',
    name: 'thinfilm',
    label: '结构色与薄膜干涉',
    component: ThinFilm
  },
  {
    path: '/sky',
    name: 'sky',
    label: '天空蓝与日落',
    component: Sky
  },
  {
    path: '/kubelka',
    name: 'kubelka',
    label: 'Kubelka–Munk颜料混合',
    component: Kubelka
  },
  {
    path: '/bayer',
    name: 'bayer',
    label: '拜耳滤镜与去马赛克',
    component: Bayer
  },
  {
    path: '/subpixel',
    name: 'subpixel',
    label: '显示器子像素',
    component: Subpixel
  },
  {
    path: '/apca',
    name: 'apca',
    label: 'APCA对比度',
    component: Apca
  },
  {
    path: '/colorname',
    name: 'colorname',
    label: '颜色命名与Berlin–Kay',
    component: ColorName
  }
];

const catalogList: {label: string; value: string}[] = [];
routes.forEach(({label, name}) => {
  if (label && name) {
    catalogList.push({
      label,
      value: name.toUpperCase()
    });
  }
});

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;

export {
  catalogList
};
