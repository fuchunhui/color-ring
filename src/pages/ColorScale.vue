<script setup lang="ts">
import {ref, computed, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {Vec3} from '../utils/space';
import {parseHex} from '../utils/csscolor';
import {
  oklchScale,
  hslScale,
  describe,
  toCssVars,
  toJsonText,
  drawLstarChart
} from '../composables/colorscale';

interface Preset {
  name: string;
  hex: string;
}

const PRESETS: Preset[] = [
  {name: '蓝', hex: '#3b82f6'},
  {name: '红', hex: '#ef4444'},
  {name: '绿', hex: '#22c55e'},
  {name: '橙', hex: '#f97316'},
  {name: '黄', hex: '#eab308'},
  {name: '紫', hex: '#8b5cf6'},
  {name: '青', hex: '#06b6d4'},
  {name: '粉', hex: '#ec4899'},
  {name: '灰蓝', hex: '#64748b'}
];

const hex = ref('#3b82f6');
const hueShift = ref(0);
const copied = ref('');
let timer = 0;

const base = computed<Vec3>(() => parseHex(hex.value) ?? [59, 130, 246]);

const scale = computed(() => oklchScale(base.value, hueShift.value));
const oklchItems = computed(() => describe(scale.value.rgbs, scale.value.baseIndex));
const hslItems = computed(() => describe(hslScale(base.value)));

const cssText = computed(() => toCssVars(oklchItems.value));
const jsonText = computed(() => toJsonText(oklchItems.value));

const onText = (event: Event) => {
  const rgb = parseHex((event.target as HTMLInputElement).value);
  if (rgb) {
    hex.value = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  }
};

const onPreset = (event: Event) => {
  hex.value = (event.target as HTMLSelectElement).value;
};

const copy = (key: string, text: string) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  copied.value = key;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    copied.value = '';
  }, 1200);
};

onBeforeUnmount(() => window.clearTimeout(timer));

const drawChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  drawLstarChart(ctx, w, h, oklchItems.value.map(i => i.lstar), hslItems.value.map(i => i.lstar));
};
</script>

<template>
  <demo-page>
    <demo-section
      title="色阶生成器（OKLCH）"
      desc="像 Tailwind 的 50~950 那样，从一个基准色生成 11 级色阶。做法：先在 OKLCH 里让亮度按固定曲线从 0.975 降到 0.22，彩度按钟形曲线(中间高、两端低)缩放，超出 sRGB 色域的部分用二分法把彩度压回去；基准色会放到亮度最接近的那一级(带蓝框)，保持原值。色相漂移滑块让色阶从浅到深整体偏转色相(像手绘里的“暗部偏冷、亮部偏暖”)。"
    >
      <div class="demo-controls">
        <label>
          基准色
          <input v-model="hex" type="color">
        </label>
        <input class="scale-hex" :value="hex" maxlength="7" @change="onText">
        <label>
          预设
          <select @change="onPreset">
            <option v-for="p in PRESETS" :key="p.hex" :value="p.hex">{{ p.name }} {{ p.hex }}</option>
          </select>
        </label>
        <label>
          色相漂移（浅→深）
          <input v-model.number="hueShift" type="range" min="-20" max="20" step="1">
          {{ hueShift }}°
        </label>
      </div>
      <div class="scale-row">
        <div v-for="item in oklchItems" :key="item.step">
          <div
            :class="['scale-swatch', {'scale-swatch-base': item.isBase}]"
            :style="{background: item.hex, color: item.text}"
          >
            <b>{{ item.step }}</b>
            <span>{{ item.hex }}</span>
            <span>白 {{ item.white.toFixed(1) }}</span>
            <span>黑 {{ item.black.toFixed(1) }}</span>
          </div>
          <p class="scale-lstar">
            L* {{ Math.round(item.lstar) }}
          </p>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="对照：HSL 亮度均匀递减的色阶"
      desc="同一个基准色，只让 HSL 的 L 从 97% 均匀降到 10%。数值上等间隔，但 Lab L* 的间隔并不由 HSL 的 L 决定：不同色相的同一级亮度对不齐(HSL 的 L=50% 时，黄色 L* 约 97，蓝色只有约 32)，换用上方的黄、绿等预设对比，就能看到两套色阶在每一级的明度差别。"
    >
      <div class="scale-row">
        <div v-for="item in hslItems" :key="item.step">
          <div class="scale-swatch" :style="{background: item.hex, color: item.text}">
            <b>{{ item.step }}</b>
            <span>{{ item.hex }}</span>
            <span>白 {{ item.white.toFixed(1) }}</span>
            <span>黑 {{ item.black.toFixed(1) }}</span>
          </div>
          <p class="scale-lstar">
            L* {{ Math.round(item.lstar) }}
          </p>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="L* 曲线对比"
      desc="蓝线是 OKLCH 色阶、橙线是 HSL 色阶。OKLCH 色阶的亮度曲线是事先设计好的，不同基准色的曲线形状一致；HSL 色阶的曲线则随色相起伏，可以切换预设观察。"
    >
      <demo-canvas :width="640" :height="260" :draw="drawChart"/>
    </demo-section>

    <demo-section title="输出" desc="按基准色生成的 OKLCH 色阶，可以直接粘贴到样式表或 Tailwind 配置里。">
      <div class="scale-output">
        <div>
          <textarea class="demo-code" readonly rows="14" cols="34" :value="cssText"/>
          <p>
            <color-button :label="copied === 'css' ? '已复制' : '复制 CSS 变量'" @click="copy('css', cssText)"/>
          </p>
        </div>
        <div>
          <textarea class="demo-code" readonly rows="14" cols="34" :value="jsonText"/>
          <p>
            <color-button :label="copied === 'json' ? '已复制' : '复制 JSON'" @click="copy('json', jsonText)"/>
          </p>
        </div>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.scale-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.scale-swatch {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 98px;
  height: 98px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  &-base {
    box-shadow: 0 0 0 3px #FFF, 0 0 0 5px #1A73E8;
  }
}
.scale-lstar {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #666;
}
.scale-hex {
  width: 90px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #DDDEE4;
  font-family: Consolas, menlo, monaco, monospace;
}
.scale-output {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  textarea {
    padding: 8px;
    border: 1px solid #DDDEE4;
    resize: none;
  }
  p {
    margin-top: 8px;
  }
}
</style>
