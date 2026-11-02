<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {Vec3} from '../utils/space';
import {parseHex} from '../utils/csscolor';
import {analyse} from '../utils/gradientspace';
import {
  BARS_W,
  BARS_H,
  PLOT_W,
  PLOT_H,
  ALPHA_W,
  ALPHA_H,
  METRIC_STEPS,
  drawBars,
  drawProfile,
  drawAlpha
} from '../composables/gradientspace';

interface Preset {
  name: string;
  a: string;
  m: string;
  b: string;
}

const PRESETS: Preset[] = [
  {name: '蓝 → 黄', a: '#0000ff', m: '#ffffff', b: '#ffff00'},
  {name: '红 → 绿', a: '#ff0000', m: '#ffff00', b: '#00ff00'},
  {name: '蓝 → 白', a: '#0000ff', m: '#00ffff', b: '#ffffff'},
  {name: '黑 → 白', a: '#000000', m: '#ff0000', b: '#ffffff'},
  {name: '红 → 蓝', a: '#ff0000', m: '#ffffff', b: '#0000ff'}
];

const presetIndex = ref(0);
const hexA = ref(PRESETS[0].a);
const hexM = ref(PRESETS[0].m);
const hexB = ref(PRESETS[0].b);
const three = ref(false);

watch(presetIndex, i => {
  const p = PRESETS[i];
  hexA.value = p.a;
  hexM.value = p.m;
  hexB.value = p.b;
});

const rgbOf = (hex: string): Vec3 => parseHex(hex) ?? [0, 0, 0];

const stops = computed<Vec3[]>(() => {
  const a = rgbOf(hexA.value);
  const b = rgbOf(hexB.value);
  return three.value ? [a, rgbOf(hexM.value), b] : [a, b];
});

const results = computed(() => analyse(stops.value));

const drawBarsFn = drawBars(() => results.value, () => stops.value);
const drawLuminance = drawProfile(() => results.value, r => r.luminance, '相对亮度 Y', 1);
const drawChroma = drawProfile(() => results.value, r => r.chroma, 'OKLab 彩度');
const drawAlphaFn = drawAlpha(() => rgbOf(hexA.value));

const dipText = (minChroma: number, dip: number | null): string => {
  return dip === null ? minChroma.toFixed(3) : `${minChroma.toFixed(3)}（端点的 ${Math.round(dip * 100)}%）`;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="同一对颜色，八种插值方式"
      desc="渐变就是在两个颜色之间按比例取中间值，区别在于在哪个空间里取。浏览器的 CSS 渐变默认在 gamma 编码的 sRGB 数值上直接线性插值：蓝到黄的中点是 (128, 128, 128) 的灰色，因为蓝 (0, 0, 255) 和黄 (255, 255, 0) 的三个分量正好互补，彩度在中点被抵消，这就是常说的灰色死区。在线性光 RGB 里插值，中点是物理上的 50% 混光，更亮但仍然偏灰；Lab 和 OKLab 的亮度更均匀，但直线路径同样穿过低彩度区。OKLCH 和 HSL 沿色相环走，彩度不掉，代价是要经过中间色相：蓝→黄的短弧经过青绿，长弧经过紫红。勾上“三段”可以在中间插一个颜色：每一段各自线性插值，亮度曲线在中间色处出现折角，眼睛会在折角处看到一条偏亮或偏暗的线（Mach 带），数据里并没有这条线。"
    >
      <div class="demo-controls">
        <label>
          预设
          <select v-model.number="presetIndex">
            <option v-for="(p, i) in PRESETS" :key="p.name" :value="i">{{ p.name }}</option>
          </select>
        </label>
        <label>
          起点色
          <input v-model="hexA" type="color">
        </label>
        <label v-if="three">
          中间色
          <input v-model="hexM" type="color">
        </label>
        <label>
          终点色
          <input v-model="hexB" type="color">
        </label>
        <label>
          <input v-model="three" type="checkbox">
          三段（加一个中间色）
        </label>
      </div>
      <demo-canvas :width="BARS_W" :height="BARS_H" :draw="drawBarsFn"/>
      <table class="gs-table">
        <thead>
          <tr>
            <th>插值空间</th>
            <th>最大一步</th>
            <th>不均匀度</th>
            <th>最低彩度</th>
            <th>超色域步数</th>
            <th>CSS 写法</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in results" :key="r.key">
            <td>{{ r.name }}</td>
            <td class="demo-code">
              {{ r.maxStep.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ r.unevenness.toFixed(2) }}×
            </td>
            <td class="demo-code">
              {{ dipText(r.minChroma, r.dip) }}
            </td>
            <td class="demo-code">
              {{ r.clippedSteps }} / {{ METRIC_STEPS + 1 }}
            </td>
            <td class="demo-code">
              {{ r.css }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="gs-note">
        统计方法：把渐变分成 {{ METRIC_STEPS }} 步，共 {{ METRIC_STEPS + 1 }} 个颜色。“最大一步”是相邻两个颜色在 OKLab 里的距离（乘 100，大致对应 ΔE）的最大值；“不均匀度”是最大一步除以平均一步，越接近 1 越均匀；“最低彩度”是整条路径上 OKLab 彩度 √(a²+b²) 的最小值，括号里是它相对各端点中最低彩度的比例，端点本身接近灰色时不给比例；“超色域步数”是算出的颜色超出 sRGB、被截断到边界的个数，只有 Lab、OKLab、OKLCH 这类允许超出 sRGB 的空间才会出现。CSS 写法里的 A、B 换成你的两个颜色；单个颜色的混合可以用 <span class="demo-code">color-mix(in oklab, A, B)</span>。
      </p>
    </demo-section>

    <demo-section
      title="亮度和彩度沿路径怎么变"
      desc="上图是各条渐变的相对亮度 Y（线性光的亮度，0 是黑，1 是白）。线性光 RGB 里 Y 严格是一条直线；直接在 sRGB 数值上插值时，Y 的曲线低于两端的连线，中间偏暗；Lab、OKLab 让感知明度 L 成为直线，换算成 Y 之后曲线同样低于两端连线。下图是 OKLab 彩度，也就是颜色离灰色轴有多远：彩度掉到接近 0 的位置，就是渐变里发灰的地方。沿色相环走的 OKLCH 和 HSL 彩度基本保持，所以颜色鲜艳，但 HSL 里的 L 看似均匀，实际亮度随色相变化很大（纯黄的 Y 约 0.93，纯蓝只有约 0.07），OKLCH 的明度则是直线。"
    >
      <demo-canvas title="相对亮度 Y" :width="PLOT_W" :height="PLOT_H" :draw="drawLuminance"/>
      <demo-canvas title="OKLab 彩度" :width="PLOT_W" :height="PLOT_H" :draw="drawChroma"/>
    </demo-section>

    <demo-section
      title="渐变到透明：预乘与非预乘"
      desc="颜色加上透明度后，插值还要多做一个选择。非预乘：R、G、B、A 四个分量各自线性插值。白色渐变到“透明黑”(0, 0, 0, 0) 时，颜色分量一路降向黑，中点是 rgba(128, 128, 128, 0.5)，叠在背景上就是一圈发灰的晕。换成“透明白”则晕变成发白的雾。预乘：先把 R、G、B 乘上 A 再插值，终点 (0, 0, 0, 0) 乘出来还是全零，路径上取回显示色后颜色始终是起点色，只有透明度在变，所以终点写成什么透明色都一样。CSS 渐变按预乘处理，而 Canvas 的 createLinearGradient 是非预乘的，把同样的颜色停靠点交给两者，结果会不同。下面叠在灰白棋盘格上，起点色就是上面选的起点色。"
    >
      <demo-canvas :width="ALPHA_W" :height="ALPHA_H" :draw="drawAlphaFn"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.gs-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 4px 12px;
    border: 1px solid #DDDEE4;
    text-align: left;
    white-space: nowrap;
  }
  th {
    background: #F4F5F8;
    font-weight: 600;
  }
}
.gs-note {
  max-width: 880px;
  font-size: 13px;
  line-height: 22px;
  color: #666;
}
</style>
