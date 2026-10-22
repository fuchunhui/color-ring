<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {NCS_HUES, nuanceColor, pureColor, notation} from '../utils/ncs';
import {Vec3} from '../utils/space';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
type PickEvent = {x: number; y: number};

const TRI_W = 520;
const TRI_H = 460;
const SIDE = 440;
const HEIGHT = SIDE * Math.sqrt(3) / 2;
const TOP: [number, number] = [TRI_W / 2, 36];
const CHIP = 36;

const hueIndex = ref(5);
const sel = ref({s: 20, c: 30});

const hex = (rgb: Vec3): string => {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const selected = computed(() => {
  const {s, c} = sel.value;
  const rgb = nuanceColor(hueIndex.value, s, c);
  return {
    hex: hex(rgb),
    name: c >= 100 ? `纯色（c=100）-${NCS_HUES[hueIndex.value]}` : notation(hueIndex.value, s, c),
    w: Math.max(0, 100 - s - c)
  };
});

const pureHex = computed(() => hex(pureColor(hueIndex.value).rgb));

const isDark = (rgb: Vec3): boolean => {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] < 140;
};

const toXy = (s: number, c: number): [number, number] => {
  const u = s / 100;
  const v = c / 100;
  return [TOP[0] + (v - u) * SIDE / 2, TOP[1] + (u + v) * HEIGHT];
};

const drawTriangle: DrawFn = ctx => {
  const index = hueIndex.value;
  const current = sel.value;
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const [bx, by] = toXy(100, 0);
  const [cx, cy] = toXy(0, 100);
  ctx.moveTo(TOP[0], TOP[1]);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let s = 0; s <= 100; s += 10) {
    for (let c = 0; c <= 100 - s; c += 10) {
      const [x, y] = toXy(s, c);
      const rgb = nuanceColor(index, s, c);
      ctx.fillStyle = hex(rgb);
      ctx.fillRect(x - CHIP / 2, y - CHIP / 2, CHIP, CHIP);
      ctx.fillStyle = isDark(rgb) ? '#FFF' : '#333';
      ctx.fillText(c >= 100 ? '纯' : s >= 100 ? '黑' : `${String(s).padStart(2, '0')}${String(c).padStart(2, '0')}`, x, y);
    }
  }

  const [sx, sy] = toXy(current.s, current.c);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#111';
  ctx.strokeRect(sx - CHIP / 2 - 1, sy - CHIP / 2 - 1, CHIP + 2, CHIP + 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(sx - CHIP / 2 + 1, sy - CHIP / 2 + 1, CHIP - 2, CHIP - 2);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#333';
  ctx.fillText('W 白（s=0, c=0）', TOP[0], 14);
  ctx.textAlign = 'left';
  ctx.fillText('S 黑', bx - CHIP / 2, by + CHIP / 2 + 10);
  ctx.textAlign = 'right';
  ctx.fillText(`C 纯色 ${NCS_HUES[index]}`, cx + CHIP / 2, cy + CHIP / 2 + 10);
};

const onTriangle = ({x, y}: PickEvent) => {
  const a = (y - TOP[1]) / HEIGHT;
  const b = (x - TOP[0]) / (SIDE / 2);
  let s = Math.round((a - b) / 2 * 10) * 10;
  let c = Math.round((a + b) / 2 * 10) * 10;
  s = Math.min(100, Math.max(0, s));
  c = Math.min(100, Math.max(0, c));
  if (s + c > 100) {
    c = 100 - s;
  }
  sel.value = {s, c};
};

const RING = 360;
const RING_R = 138;

const drawRing: DrawFn = ctx => {
  const cx = RING / 2;
  const cy = RING / 2;
  const step = Math.PI * 2 / 40;
  ctx.lineWidth = 34;
  for (let i = 0; i < 40; i++) {
    const start = -Math.PI / 2 + (i - 0.5) * step;
    ctx.strokeStyle = hex(pureColor(i).rgb);
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, start - 0.004, start + step + 0.004);
    ctx.stroke();
  }

  const mid = -Math.PI / 2 + hueIndex.value * step;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, RING_R + 19, mid - step / 2, mid + step / 2);
  ctx.arc(cx, cy, RING_R - 19, mid + step / 2, mid - step / 2, true);
  ctx.closePath();
  ctx.stroke();

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['Y', 'R', 'B', 'G'].forEach((letter, k) => {
    const angle = -Math.PI / 2 + k * 10 * step;
    ctx.fillText(letter, cx + Math.cos(angle) * (RING_R + 34), cy + Math.sin(angle) * (RING_R + 34));
  });
  ctx.fillText(NCS_HUES[hueIndex.value], cx, cy);
};

const onRing = ({x, y}: PickEvent) => {
  const angle = Math.atan2(y - RING / 2, x - RING / 2) + Math.PI / 2;
  const turn = (angle / (Math.PI * 2) + 1) % 1;
  hueIndex.value = Math.round(turn * 40) % 40;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="NCS 自然色系统（近似，非官方数据）"
      desc="NCS 是一套以赫林对立色理论为基础的色彩体系：人眼觉得黄、红、蓝、绿是四种“不带别的色调”的原色，再加上黑和白。任何颜色都可以用“像黑多少、像彩色多少、是什么色调”来描述：黑度 s、彩度 c、白度 w 三者之和为 100，所以同一色相的所有颜色可以排进一个三角形，三个顶点是白、黑和该色相的纯色。记号 S 2030-Y90R 表示：黑度 20、彩度 30、色相 Y90R（黄加 90% 的红，已接近红）。官方 NCS 的色值是商业数据，这里只是用 OKLCH 做的近似，用来说明结构。"
    >
      <div class="demo-controls">
        <label>
          色相
          <select v-model.number="hueIndex">
            <option v-for="(name, index) in NCS_HUES" :key="name" :value="index">
              {{ name }}
            </option>
          </select>
        </label>
        <label>
          <input v-model.number="hueIndex" type="range" min="0" max="39">
        </label>
        <span class="demo-swatch" :style="{background: selected.hex}"/>
        <span class="demo-code">{{ selected.name }}&emsp;{{ selected.hex }}&emsp;白度 {{ selected.w }}&emsp;黑度 {{ sel.s }}&emsp;彩度 {{ sel.c }}</span>
      </div>
      <demo-canvas title="NCS 三角形（点击色块选择；每块 10% 一档，标签为“黑度+彩度”）" :width="TRI_W" :height="TRI_H" :draw="drawTriangle" @pick="onTriangle"/>
      <demo-canvas title="40 档色相环（点击选择色相）" :width="RING" :height="RING" :draw="drawRing" @pick="onRing"/>
    </demo-section>
    <demo-section
      title="怎么得到这些颜色"
      desc="色相：用 OKLCH 色相环上 Y≈100°、R≈25°、B≈250°、G≈155° 四个锚点分段插值，每两个原色之间分 10 档。纯色：取该色相在 sRGB 色域内彩度最大的点（色域尖点）。其余颜色：白、黑、纯色按白度、黑度、彩度的比例在 OKLab 中线性混合。与 RGB 色环不同，NCS 里相对的两色是红 ↔ 绿、黄 ↔ 蓝，这正是对立色理论的结构。"
    >
      <p class="demo-code">
        当前色相 {{ NCS_HUES[hueIndex] }} 的纯色：{{ pureHex }}
      </p>
    </demo-section>
  </demo-page>
</template>
