<script setup lang="ts">
import {ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {rgbToLab, Vec3} from '../utils/space';
import {rgbToHsluv, rgbToHpluv} from '../utils/hsluv';
import {
  PLANE_SIZE,
  RING_W,
  RING_H,
  STRIP_W,
  STRIP_H,
  RAMP_W,
  RAMP_H,
  drawPlane,
  drawRing,
  drawHueStrips,
  drawRamps
} from '../composables/hsluv';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const hue = ref(240);
const picked = ref<{hex: string; lab: number; hsluv: Vec3; hpluv: Vec3} | null>(null);

const drawHsl = (ctx: CanvasRenderingContext2D, w: number, h: number) => drawPlane('hsl', hue.value)(ctx, w, h);
const drawHsluv = (ctx: CanvasRenderingContext2D, w: number, h: number) => drawPlane('hsluv', hue.value)(ctx, w, h);
const drawHpluv = (ctx: CanvasRenderingContext2D, w: number, h: number) => drawPlane('hpluv', hue.value)(ctx, w, h);

const ringHsl = drawRing('hsl');
const ringHsluv = drawRing('hsluv');
const ringHpluv = drawRing('hpluv');

const onPick = ({color}: PickEvent) => {
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as Vec3;
  picked.value = {
    hex: color,
    lab: rgbToLab(rgb)[0],
    hsluv: rgbToHsluv(rgb),
    hpluv: rgbToHpluv(rgb)
  };
};
</script>

<template>
  <demo-page>
    <demo-section
      title="HSLuv：亮度真正一致的 HSL"
      desc="HSL 的“亮度 L”只是 RGB 的数学平均，并不对应人眼的明暗：L=50% 时，黄色其实比蓝色亮得多。HSLuv 把色相和饱和度重新定义在 CIELUV 空间里：亮度就是 CIE 的 L*，饱和度是“当前亮度和色相下，sRGB 能达到的最大色度的百分比”，所以 S=100% 总是刚好贴着色域边界，而不会跑出色域。HPLuv 更保守，取对所有色相都安全的最大色度，只能得到柔和的颜色。拖动色相，在平面上点击取色。"
    >
      <div class="demo-controls">
        <label>
          色相
          <input v-model.number="hue" type="range" min="0" max="359">
          <span class="demo-code">{{ hue }}°</span>
        </label>
      </div>
      <demo-canvas
        title="HSL（横轴 S，纵轴 L）"
        :width="PLANE_SIZE"
        :height="PLANE_SIZE"
        :draw="drawHsl"
        @pick="onPick"
      />
      <demo-canvas
        title="HSLuv（横轴 S，纵轴 L）"
        :width="PLANE_SIZE"
        :height="PLANE_SIZE"
        :draw="drawHsluv"
        @pick="onPick"
      />
      <demo-canvas
        title="HPLuv（横轴 S，纵轴 L）"
        :width="PLANE_SIZE"
        :height="PLANE_SIZE"
        :draw="drawHpluv"
        @pick="onPick"
      />
      <div v-if="picked" class="hsluv-info">
        <span class="demo-swatch" :style="{background: picked.hex}"/>
        <code class="demo-code">{{ picked.hex }}</code>
        <p>Lab L* = {{ picked.lab.toFixed(1) }}</p>
        <p>HSLuv = {{ picked.hsluv[0].toFixed(1) }}°, {{ picked.hsluv[1].toFixed(1) }}, {{ picked.hsluv[2].toFixed(1) }}</p>
        <p>HPLuv = {{ picked.hpluv[0].toFixed(1) }}°, {{ picked.hpluv[1].toFixed(1) }}, {{ picked.hpluv[2].toFixed(1) }}</p>
      </div>
    </demo-section>

    <demo-section
      title="12 个色相：S = 100，L = 50"
      desc="同样是“饱和度 100%、亮度 50%”的 12 色环。下方柱子是每个色相的 Lab L*：HSL 里黄色约 97、蓝色只有约 32，明暗差别很大；HSLuv 的 12 个颜色亮度都是 50，看起来明暗一致。代价是 HSLuv 的颜色在蓝紫、红等色相上饱和度更低（因为 sRGB 的这些角落本来就没有那么亮的高饱和色）。HPLuv 的亮度同样一致，但颜色更柔和。"
    >
      <demo-canvas title="HSL" :width="RING_W" :height="RING_H" :draw="ringHsl"/>
      <demo-canvas title="HSLuv" :width="RING_W" :height="RING_H" :draw="ringHsluv"/>
      <demo-canvas title="HPLuv" :width="RING_W" :height="RING_H" :draw="ringHpluv"/>
    </demo-section>

    <demo-section
      title="扫过色相：颜色条与亮度曲线"
      desc="沿色相 0°~360° 扫一遍，上面是颜色条，下面是对应的 Lab L* 曲线。HSL 的曲线起伏很大（橙线）；HSLuv 是一条水平线（蓝线）。这就是设计系统愿意用它来生成主题色的原因：只改色相，不会改变对比度。"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawHueStrips"/>
    </demo-section>

    <demo-section
      title="固定色相的亮度渐变（S = 100）"
      desc="每个色相两行：上面是 HSL，下面是 HSLuv，亮度从 0 到 100。HSLuv 的渐变在不同色相间的明暗节奏更一致，纯色出现的位置也不再固定在 50%。"
    >
      <demo-canvas :width="RAMP_W" :height="RAMP_H" :draw="drawRamps"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.hsluv-info {
  display: inline-block;
  vertical-align: top;
  margin-top: 28px;
  font-size: 14px;
  line-height: 24px;
}
</style>
