<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {Mode, PLANE_SIZE, planeColor, drawPlane, drawMarker, drawHueBar} from '../composables/picker';

const BAR_WIDTH = PLANE_SIZE * 2 + 16;
const BAR_HEIGHT = 28;

const mode = ref<Mode>('hsv');
const hue = ref(210);
const sat = ref(0.8);
const level = ref(0.9); // 当前模式下的 V 或 L

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

const color = computed(() => planeColor(mode.value, hue.value, sat.value, level.value));

const readout = computed(() => {
  const c = color.value;
  const [r, g, b] = c.rgb().map(Math.round);
  const {s: hsvS, v} = c.toHSV();
  const {s: hslS, l} = c.toHSL();
  return {
    hex: c.toHex().toUpperCase(),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsv: `hsv(${hue.value}°, ${pct(hsvS)}, ${pct(v)})`,
    hsl: `hsl(${hue.value}°, ${pct(hslS)}, ${pct(l)})`
  };
});

const setMode = (next: Mode) => {
  if (next === mode.value) {
    return;
  }
  const c = color.value;
  if (next === 'hsv') {
    const {s, v} = c.toHSV();
    sat.value = s;
    level.value = v;
  } else {
    const {s, l} = c.toHSL();
    sat.value = s;
    level.value = l;
  }
  mode.value = next;
};

const drawHsv = (ctx: CanvasRenderingContext2D) => {
  drawPlane(ctx, 'hsv', hue.value);
  const {s, v} = color.value.toHSV();
  drawMarker(ctx, s, v);
};

const drawHsl = (ctx: CanvasRenderingContext2D) => {
  drawPlane(ctx, 'hsl', hue.value);
  const {s, l} = color.value.toHSL();
  drawMarker(ctx, s, l);
};

const drawBar = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  drawHueBar(ctx, width, height, hue.value);
};

const pickPlane = (target: Mode, {x, y}: {x: number; y: number}) => {
  const last = PLANE_SIZE - 1;
  mode.value = target;
  sat.value = clamp01(x / last);
  level.value = clamp01(1 - y / last);
};

const pickBar = ({x}: {x: number}) => {
  hue.value = Math.min(359, Math.round(clamp01(x / BAR_WIDTH) * 360));
};
</script>

<template>
  <demo-page>
    <demo-section
      title="HSV 与 HSL 拾色盘"
      desc="色环只是 S=V=1（或 S=1、L=0.5）的那一圈。固定色相后，剩下的两个维度可以铺成一张平面：HSV 的 V=1 是“最亮的纯色”，顶边是各个明度最高的颜色；HSL 的 L=0.5 才是纯色，L=1 一律为白、L=0 一律为黑，所以上下两边各收缩成一个点。点击任一平面即可取色，并切换到该平面对应的模型。"
    >
      <div class="demo-controls">
        <label>
          色相
          <input v-model.number="hue" type="range" min="0" max="359">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <label>
          <input type="radio" name="picker-mode" :checked="mode === 'hsv'" @change="setMode('hsv')">
          以 HSV 为准
        </label>
        <label>
          <input type="radio" name="picker-mode" :checked="mode === 'hsl'" @change="setMode('hsl')">
          以 HSL 为准
        </label>
      </div>
      <div class="picker-body">
        <demo-canvas
          :width="PLANE_SIZE"
          :height="PLANE_SIZE"
          title="HSV：横轴 S，纵轴 V"
          :draw="drawHsv"
          @pick="pickPlane('hsv', $event)"
        />
        <demo-canvas
          :width="PLANE_SIZE"
          :height="PLANE_SIZE"
          title="HSL：横轴 S，纵轴 L"
          :draw="drawHsl"
          @pick="pickPlane('hsl', $event)"
        />
        <div class="picker-readout">
          <p class="picker-readout-title">
            当前颜色
          </p>
          <span class="demo-swatch picker-swatch" :style="{background: readout.hex}"/>
          <p class="demo-code">
            {{ readout.hex }}
          </p>
          <p class="demo-code">
            {{ readout.rgb }}
          </p>
          <p class="demo-code">
            {{ readout.hsv }}
          </p>
          <p class="demo-code">
            {{ readout.hsl }}
          </p>
        </div>
      </div>
      <demo-canvas
        :width="BAR_WIDTH"
        :height="BAR_HEIGHT"
        title="色相条（点击选择色相）"
        :draw="drawBar"
        @pick="pickBar"
      />
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.picker-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}
.picker-readout {
  min-width: 200px;
  &-title {
    height: 28px;
    line-height: 28px;
    font-size: 14px;
  }
  p {
    line-height: 24px;
  }
}
.picker-swatch {
  width: 120px;
  height: 56px;
  margin-bottom: 8px;
}
</style>
