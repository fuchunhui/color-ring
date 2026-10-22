<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {Vec3} from '../utils/space';
import {
  CONE_W,
  CONE_H,
  BAR_W,
  BAR_H,
  SIM_W,
  SIM_H,
  CONE_NAMES,
  cone,
  rgbToLms,
  xToWavelength,
  drawCones,
  drawLmsBars,
  drawSimulation
} from '../composables/lms';

const wavelength = ref(560);
const hex = ref('#e8643c');

const rgb = computed<Vec3>(() => {
  const n = parseInt(hex.value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});

const response = computed(() => cone(wavelength.value).map(v => v.toFixed(3)));
const lms = computed(() => rgbToLms(rgb.value).map(v => v.toFixed(3)));

const drawConePlot = drawCones(() => wavelength.value);
const drawBars = drawLmsBars(() => rgb.value);

const onPick = ({x}: {x: number}) => {
  wavelength.value = xToWavelength(x);
};

const types = [
  {key: 'protanopia', label: '红色盲（缺 L 视锥）', draw: drawSimulation('protanopia')},
  {key: 'deuteranopia', label: '绿色盲（缺 M 视锥）', draw: drawSimulation('deuteranopia')},
  {key: 'tritanopia', label: '蓝黄色盲（缺 S 视锥）', draw: drawSimulation('tritanopia')}
];
</script>

<template>
  <demo-page>
    <demo-section
      title="三种视锥的光谱响应"
      desc="人眼视网膜上有三种负责颜色的视锥细胞，分别对长波（L，偏红黄）、中波（M，偏绿）和短波（S，偏蓝紫）最敏感，它们的响应范围大幅重叠。大脑比较三者的相对强弱来判断颜色，所以任何一束光对眼睛来说只是 L、M、S 三个数，这也是 RGB 三原色足够用的原因。曲线是 CIE 1931 颜色匹配函数经 Hunt–Pointer–Estevez 矩阵换算的近似，各自峰值归一化为 1。"
    >
      <div class="demo-controls">
        <label>
          波长
          <input v-model.number="wavelength" type="range" min="380" max="780" step="1">
          <span class="demo-code">{{ wavelength }} nm</span>
        </label>
        <span class="demo-code">{{ CONE_NAMES[0] }} {{ response[0] }}</span>
        <span class="demo-code">{{ CONE_NAMES[1] }} {{ response[1] }}</span>
        <span class="demo-code">{{ CONE_NAMES[2] }} {{ response[2] }}</span>
      </div>
      <demo-canvas :width="CONE_W" :height="CONE_H" :draw="drawConePlot" @pick="onPick"/>
    </demo-section>

    <demo-section
      title="一个 RGB 颜色在三种视锥上的刺激"
      desc="选一个颜色，把线性 sRGB 先换成 XYZ，再用 HPE 矩阵换成 L、M、S 三个数。白色三者都接近 1；纯蓝几乎只刺激 S 视锥；纯红主要刺激 L，但也会刺激一部分 M。"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="hex" type="color">
          <span class="demo-code">{{ hex.toUpperCase() }}</span>
        </label>
        <span class="demo-code">L {{ lms[0] }}</span>
        <span class="demo-code">M {{ lms[1] }}</span>
        <span class="demo-code">S {{ lms[2] }}</span>
      </div>
      <demo-canvas :width="BAR_W" :height="BAR_H" :draw="drawBars"/>
    </demo-section>

    <demo-section
      title="色盲模拟的原理：去掉一种视锥"
      desc="二色视者缺少一种视锥，相当于把它的响应用另外两种视锥“补”出来。Viénot 等人（1999）的做法是：线性 RGB → LMS，保持白色和两条不变色相（约 475nm 与 575nm）不变，用另外两个分量线性重构缺失的那个，再换回 RGB。它与前面色盲模拟页用的 Machado（2009）矩阵结论相近，只是 Machado 把整个过程合并成了一个 3×3 矩阵，并且可以调节严重程度。"
    >
      <div class="demo-code">
        红色盲：L' = 2.02344·M − 2.52581·S
      </div>
      <div class="demo-code">
        绿色盲：M' = 0.494207·L + 1.24827·S
      </div>
      <div class="demo-code">
        蓝黄色盲：S' = −0.395913·L + 0.801109·M
      </div>
      <p class="demo-section-desc">
        这里的 LMS 是 Viénot 论文使用的 RGB→LMS 矩阵所在的空间，与上面画曲线用的 HPE 空间不是同一个，所以公式系数不能互换。
      </p>
      <demo-canvas
        v-for="t in types"
        :key="t.key"
        :title="t.label"
        :width="SIM_W"
        :height="SIM_H"
        :draw="t.draw"
      />
    </demo-section>
  </demo-page>
</template>
