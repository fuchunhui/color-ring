<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {schemes, schemeHues, hsvToColor, hsvToHex, normalizeHue} from '../composables/harmony';

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER = 170;
const INNER = 110;
const DOT_RADIUS = 92;

const schemeKey = ref('triadic');
const hue = ref(30);
const sat = ref(85);
const val = ref(95);

const hues = computed(() => schemeHues(schemeKey.value, hue.value));

const swatches = computed(() => hues.value.map(h => {
  const color = hsvToColor(h, sat.value / 100, val.value / 100);
  const [r, g, b] = color.rgb();
  return {
    hue: Math.round(h),
    hex: hsvToHex(h, sat.value / 100, val.value / 100),
    text: r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#222' : '#FFF'
  };
}));

const angle = (h: number) => (h - 90) * Math.PI / 180;

const draw = (ctx: CanvasRenderingContext2D) => {
  const s = sat.value / 100;
  const v = val.value / 100;

  ctx.lineWidth = OUTER - INNER;
  for (let h = 0; h < 360; h++) {
    ctx.beginPath();
    ctx.strokeStyle = hsvToHex(h, s, v);
    ctx.arc(CX, CY, (OUTER + INNER) / 2, angle(h - 0.6), angle(h + 0.6));
    ctx.stroke();
  }

  const points = hues.value.map(h => ({
    h,
    x: CX + DOT_RADIUS * Math.cos(angle(h)),
    y: CY + DOT_RADIUS * Math.sin(angle(h))
  }));

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  points.forEach(({x, y}, index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.stroke();

  points.forEach(({h, x, y}, index) => {
    ctx.beginPath();
    ctx.arc(x, y, index === hues.value.indexOf(normalizeHue(hue.value)) ? 11 : 8, 0, 2 * Math.PI);
    ctx.fillStyle = hsvToHex(h, s, v);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFF';
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#333';
    ctx.stroke();
  });
};

const onPick = ({x, y}: {x: number; y: number}) => {
  const dx = x - CX;
  const dy = y - CY;
  const distance = Math.hypot(dx, dy);
  if (distance < INNER - 10 || distance > OUTER + 10) {
    return;
  }
  hue.value = Math.round(normalizeHue(Math.atan2(dy, dx) * 180 / Math.PI + 90)) % 360;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="色环上的配色和谐"
      desc="经典配色方案其实就是色环上的几何图形：互补色是对径的两点，三角配色是正三角形，四角配色是正方形，矩形配色是两对互补色。选好基色，把图形旋转到对应位置，各顶点的色相就是搭配色。点击色环可以重新选择基色。"
    >
      <div class="demo-controls">
        <label>
          方案
          <select v-model="schemeKey">
            <option v-for="item in schemes" :key="item.key" :value="item.key">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          色相
          <input v-model.number="hue" type="range" min="0" max="359">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <label>
          饱和度
          <input v-model.number="sat" type="range" min="0" max="100">
          <span class="demo-code">{{ sat }}%</span>
        </label>
        <label>
          明度
          <input v-model.number="val" type="range" min="0" max="100">
          <span class="demo-code">{{ val }}%</span>
        </label>
      </div>
      <div class="harmony-body">
        <demo-canvas :width="SIZE" :height="SIZE" :draw="draw" @pick="onPick"/>
        <div class="harmony-swatches">
          <div
            v-for="(item, index) in swatches"
            :key="index"
            class="harmony-swatch"
            :style="{background: item.hex, color: item.text}"
          >
            <span class="demo-code">{{ item.hex }}</span>
            <span class="demo-code">H {{ item.hue }}°</span>
          </div>
        </div>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.harmony-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0 24px;
}
.harmony-swatches {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}
.harmony-swatch {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 200px;
  height: 64px;
  padding: 0 12px;
  border: 1px solid #DDDEE4;
  border-radius: 4px;
}
</style>
