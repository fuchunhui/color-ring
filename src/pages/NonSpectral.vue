<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {rgbToOklch, oklchToRgb} from '../utils/space';
import {
  CHART_W,
  CHART_H,
  BROWN_W,
  BROWN_H,
  GRID_W,
  GRID_H,
  ORANGE,
  describePurple,
  drawPurple,
  drawBrown,
  drawLcGrid,
  cellAt,
  cellL,
  cellC,
  perceivedName
} from '../composables/nonspectral';
import type {PurpleState, BrownState} from '../composables/nonspectral';
import {formatDominant} from '../composables/grassmann';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const purple = reactive<PurpleState>({lambdaRed: 650, lambdaBlue: 450, redShare: 0.5});
const brown = reactive<BrownState>({surround: 0.75});
const orangeHue = Math.round(rgbToOklch(ORANGE)[2]);
const hue = ref(orangeHue);

const drawPurpleChart = (ctx: CanvasRenderingContext2D) => {
  drawPurple(ctx, purple);
};
const drawBrownChart = (ctx: CanvasRenderingContext2D) => {
  drawBrown(ctx, brown);
};
const drawGrid = (ctx: CanvasRenderingContext2D) => {
  drawLcGrid(ctx, hue.value);
};

const purpleInfo = computed(() => describePurple(purple));

const picked = ref<{L: number; C: number; hex: string; name: string} | null>(null);
const onPickGrid = ({x, y}: PickEvent) => {
  const cell = cellAt(x, y);
  if (!cell) {
    return;
  }
  const L = cellL(cell.row);
  const C = cellC(cell.col);
  const result = oklchToRgb([L, C, hue.value]);
  picked.value = {
    L,
    C,
    hex: '#' + result.rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(),
    name: result.inGamut ? perceivedName(L, C) : '超出 sRGB 色域，显示不出来'
  };
};

const surroundText = computed(() => {
  const v = brown.surround;
  return v > 0.66 ? '亮背景' : v > 0.25 ? '中等背景' : '暗背景';
});
</script>

<template>
  <demo-page>
    <demo-section
      title="没有对应波长的颜色：紫线"
      desc="光谱轨迹（马蹄形的弧线）上的每个点都对应一个波长。但马蹄形底部还有一条直线，连接着最红的 700 nm 和最紫的 380 nm，叫紫线。线上和线与白点之间的区域（图中粉色三角形）是品红、紫红一类颜色，从白点向它们画射线，打到的是紫线而不是弧线，所以这些颜色没有主波长，不对应任何单色光。它们只能靠两束光混合得到，比如红光 + 蓝光。拖动滑块选两个波长和比例，混合点落在连线上；一旦落进粉色区域，就变成“补色波长”。白色、灰色也不是光谱色，它们是各种波长按一定比例混合的结果。"
    >
      <div class="demo-controls">
        <label>
          红端波长
          <input v-model.number="purple.lambdaRed" type="range" min="600" max="700" step="1">
          <span class="demo-code">{{ purple.lambdaRed }} nm</span>
        </label>
        <label>
          蓝端波长
          <input v-model.number="purple.lambdaBlue" type="range" min="380" max="480" step="1">
          <span class="demo-code">{{ purple.lambdaBlue }} nm</span>
        </label>
        <label>
          红光占比
          <input v-model.number="purple.redShare" type="range" min="0" max="1" step="0.01">
          <span class="demo-code">{{ Math.round(purple.redShare * 100) }}%</span>
        </label>
      </div>
      <demo-canvas :width="CHART_W" :height="CHART_H" :draw="drawPurpleChart"/>
      <p class="nonspectral-note">
        <span class="demo-swatch" :style="{background: purpleInfo.hex}"/>
        混合点 x = {{ purpleInfo.mixed[0].toFixed(3) }}，y = {{ purpleInfo.mixed[1].toFixed(3) }}。
        {{ purpleInfo.inPurple ? '落在粉色区域：没有主波长，补色波长为 ' : '落在马蹄形的光谱一侧：主波长 ' }}{{ formatDominant(purpleInfo.dominant) }}。
        色块按最大通道归一显示。
      </p>
    </demo-section>

    <demo-section
      title="棕色是暗了的橙色"
      desc="棕色不是一个独立的色相，它是橙色 / 黄色在较暗、且周围更亮时被我们感知成的颜色。这里的橙色块完全相同，只是背景不同：多数人看到的是，在近黑背景上它是明亮的橙色，在白色背景上更像棕色，（感知因人而异，这是一个常被引用的演示，不是严格的定量结论）。所以你找不到“棕色光”：舞台上的棕色灯光只会被看成暗橙色。拖动滑块改变中间那块的背景。"
    >
      <div class="demo-controls">
        <label>
          中间背景亮度
          <input v-model.number="brown.surround" type="range" min="0" max="1" step="0.01">
          <span class="demo-code">{{ surroundText }}</span>
        </label>
      </div>
      <demo-canvas :width="BROWN_W" :height="BROWN_H" :draw="drawBrownChart"/>
    </demo-section>

    <demo-section
      title="橙色色相上的明度 × 彩度"
      desc="在 OKLCH 里固定橙色的色相，横轴是彩度 C，纵轴是明度 L。上半部分（较亮）是橙色、米色，下半部分（较暗）彩度中等的那一块，是我们叫作“棕”的颜色，再暗就成了深褐、近黑。命名的边界是随手画的示意线，不同的人、不同的语言划线的位置不一样。点击任意一格查看。斜线格表示这个明度和彩度超出了 sRGB 的范围。"
    >
      <div class="demo-controls">
        <label>
          OKLCH 色相
          <input v-model.number="hue" type="range" min="20" max="110" step="1">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <span>橙色块的色相约 {{ orangeHue }}°</span>
      </div>
      <demo-canvas :width="GRID_W" :height="GRID_H" :draw="drawGrid" @pick="onPickGrid"/>
      <p v-if="picked" class="nonspectral-note">
        <span class="demo-swatch" :style="{background: picked.hex}"/>
        L = {{ picked.L.toFixed(2) }}，C = {{ picked.C.toFixed(3) }}，{{ picked.hex }}：{{ picked.name }}
      </p>
    </demo-section>

    <demo-section
      title="其他“不可能”的颜色"
      desc="还有一些颜色，在正常情况下看不到。比如“红绿同时出现的红绿色”和“黄蓝同时出现的黄蓝色”：按对立色理论，红和绿共用同一条神经通道，不能同时出现。有人报告在特殊的实验里（比如把红色和绿色条纹紧挨着放、并稳定住视网膜上的像）短暂体验过，这类颜色被称为“虚构色”（chimerical colors），也可以借助后像产生。这是需要专门实验条件的主观报告，本页不尝试用屏幕绘制它们。"
    />
  </demo-page>
</template>

<style lang="less">
.nonspectral-note {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 22px;
  color: #555;
}
</style>
