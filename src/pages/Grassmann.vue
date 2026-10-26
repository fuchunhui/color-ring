<script setup lang="ts">
import {computed, reactive} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {rgbToXyz} from '../utils/space';
import {xyzToXy} from '../utils/cie';
import type {Point} from '../utils/cie';
import {dominantWavelength} from '../utils/colorimetry';
import {
  CHART_W,
  CHART_H,
  drawMix,
  drawProbe,
  pickXy,
  describeMix,
  formatDominant,
  whiteOf,
  hexOfXyY
} from '../composables/grassmann';
import type {MixState, ProbeState} from '../composables/grassmann';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const mix = reactive<MixState>({
  a: [0.64, 0.33],
  b: [0.15, 0.06],
  ya: 0.3,
  yb: 0.5,
  target: 'A',
  white: 'D65'
});

const probe = reactive<ProbeState>({
  point: [0.64, 0.33],
  white: 'D65'
});

const drawMixChart = (ctx: CanvasRenderingContext2D) => {
  drawMix(ctx, mix);
};

const drawProbeChart = (ctx: CanvasRenderingContext2D) => {
  drawProbe(ctx, probe);
};

const onPickMix = ({x, y}: PickEvent) => {
  const p = pickXy(x, y);
  if (mix.target === 'A') {
    mix.a = p;
  } else {
    mix.b = p;
  }
};

const onPickProbe = ({x, y}: PickEvent) => {
  probe.point = pickXy(x, y);
};

const readout = computed(() => describeMix(mix));

const probeInfo = computed(() => {
  if (!probe.point) {
    return null;
  }
  return dominantWavelength(probe.point, whiteOf(probe.white));
});

const srgbXy = (rgb: [number, number, number]): Point => xyzToXy(rgbToXyz(rgb));

const presets: {label: string; xy: Point}[] = [
  {label: 'sRGB 红', xy: srgbXy([255, 0, 0])},
  {label: 'sRGB 绿', xy: srgbXy([0, 255, 0])},
  {label: 'sRGB 蓝', xy: srgbXy([0, 0, 255])},
  {label: 'sRGB 青', xy: srgbXy([0, 255, 255])},
  {label: 'sRGB 品红', xy: srgbXy([255, 0, 255])},
  {label: 'sRGB 黄', xy: srgbXy([255, 255, 0])}
];

const setProbe = (xy: Point) => {
  probe.point = xy;
};

const fmt = (n: number, digits = 4): string => n.toFixed(digits);
</script>

<template>
  <demo-page>
    <demo-section
      title="Grassmann 定律：光可以像向量一样相加"
      desc="1853 年，Grassmann 总结了颜色混合的几条规律：一、三色性，任何颜色都能用三种原色按一定比例匹配出来；二、叠加性，两个看起来一样的颜色各加上同一束光，结果依然一样；三、比例性（亮度可加性），把光强同时放大或缩小，颜色匹配关系不变。所以颜色可以用 XYZ 这样的三维向量表示，两束光混合就是向量相加。换成色度坐标，混合点会落在两点连线上，位置按 Y/y 加权的重心决定：x = (x1·Y1/y1 + x2·Y2/y2) / (Y1/y1 + Y2/y2)，y 同理。点击色度图设置光源 A 或 B（先在下面选择要设置哪一个），拖动亮度滑块看混合点怎么在连线上移动。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="mix.target" type="radio" value="A">
          <span>点击设置 A</span>
        </label>
        <label>
          <input v-model="mix.target" type="radio" value="B">
          <span>点击设置 B</span>
        </label>
        <label>
          A 的亮度 Y
          <input v-model.number="mix.ya" type="range" min="0.05" max="1" step="0.01">
          <span class="demo-code">{{ mix.ya.toFixed(2) }}</span>
        </label>
        <label>
          B 的亮度 Y
          <input v-model.number="mix.yb" type="range" min="0.05" max="1" step="0.01">
          <span class="demo-code">{{ mix.yb.toFixed(2) }}</span>
        </label>
        <label>
          参考白点
          <select v-model="mix.white">
            <option value="D65">D65 日光</option>
            <option value="E">E 等能白</option>
          </select>
        </label>
      </div>
      <demo-canvas
        :width="CHART_W"
        :height="CHART_H"
        :draw="drawMixChart"
        @pick="onPickMix"
      />
      <div class="grassmann-info">
        <div class="grassmann-row">
          <span class="demo-swatch" :style="{background: readout.hexA}"/>
          <span>A：x = {{ fmt(mix.a[0]) }}，y = {{ fmt(mix.a[1]) }}，Y = {{ mix.ya.toFixed(2) }}</span>
        </div>
        <div class="grassmann-row">
          <span class="demo-swatch" :style="{background: readout.hexB}"/>
          <span>B：x = {{ fmt(mix.b[0]) }}，y = {{ fmt(mix.b[1]) }}，Y = {{ mix.yb.toFixed(2) }}</span>
        </div>
        <div class="grassmann-row">
          <span class="demo-swatch" :style="{background: readout.hexMix}"/>
          <span>A + B：x = {{ fmt(readout.mixed[0]) }}，y = {{ fmt(readout.mixed[1]) }}，Y = {{ readout.Y.toFixed(2) }}</span>
        </div>
        <p>
          验证叠加性：把 A、B 的 XYZ 直接相加再换算色度，得到 ({{ fmt(readout.mixedByXyz[0]) }}, {{ fmt(readout.mixedByXyz[1]) }})，
          与重心公式的结果相差 {{ readout.additivityError.toExponential(1) }}，只是浮点误差。亮度 Y 也是简单相加：{{ mix.ya.toFixed(2) }} + {{ mix.yb.toFixed(2) }} = {{ readout.Y.toFixed(2) }}。
        </p>
        <p>
          主波长：A {{ formatDominant(readout.domA) }}；B {{ formatDominant(readout.domB) }}；A + B {{ formatDominant(readout.domMix) }}。
          色块按最大通道归一显示，所以只表现色度，亮度请看数值。
        </p>
      </div>
    </demo-section>

    <demo-section
      title="主波长与色纯度"
      desc="色度图上的任何一个颜色，都可以看成一束单色光和白光按比例混合：从白点出发，经过这个颜色画一条射线，射线与光谱轨迹相交的位置就是主波长；颜色到白点的距离与交点到白点的距离之比就是兴奋纯度（光谱色为 1，白点为 0）。如果射线落在连接红端和紫端的紫线上，就没有主波长，只能反向延长，用对面的光谱色给出补色波长（数字后加 c）。点击色度图任意位置，或者用下面的按钮选一个 sRGB 颜色。"
    >
      <div class="demo-controls">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="grassmann-preset"
          @click="setProbe(preset.xy)"
        >
          {{ preset.label }}
        </button>
        <label>
          参考白点
          <select v-model="probe.white">
            <option value="D65">D65 日光</option>
            <option value="E">E 等能白</option>
          </select>
        </label>
      </div>
      <demo-canvas
        :width="CHART_W"
        :height="CHART_H"
        :draw="drawProbeChart"
        @pick="onPickProbe"
      />
      <div v-if="probe.point && probeInfo" class="grassmann-info">
        <div class="grassmann-row">
          <span class="demo-swatch" :style="{background: hexOfXyY(probe.point)}"/>
          <span>x = {{ fmt(probe.point[0]) }}，y = {{ fmt(probe.point[1]) }}</span>
        </div>
        <p>
          {{ probeInfo.complementary ? '补色波长' : '主波长' }}：{{ formatDominant(probeInfo) }}
        </p>
        <p>兴奋纯度：{{ Number.isNaN(probeInfo.purity) ? '在马蹄形之外' : fmt(probeInfo.purity, 3) }}</p>
        <p v-if="probeInfo.complementary">
          射线落在紫线上：这个颜色没有对应的单色光（见“光谱外的颜色”），补色波长表示在白点另一侧的光谱色与它互补。
        </p>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.grassmann-info {
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 22px;
  color: #555;
  .grassmann-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
}
.grassmann-preset {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #D9D9D9;
  border-radius: 4px;
  background: #FFF;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    border-color: #4B98F8;
    color: #4B98F8;
  }
}
</style>
