<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {HUE_LIST, munsellToRgb, notation} from '../utils/munsell';
import {toHex} from '../utils/csscolor';
import {
  DrawFn,
  CHART_W,
  CHART_H,
  drawMunsellChart,
  drawHslChart,
  drawHueRing,
  munsellHslHue,
  locateMunsell,
  locateHsl
} from '../composables/munsell';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const hueIndex = ref(1);
const chroma = ref(4);
const picked = ref('点击任一色块，查看记号与十六进制值');

const hslHue = computed(() => munsellHslHue(hueIndex.value));

const drawMunsell: DrawFn = ctx => drawMunsellChart(ctx, hueIndex.value);
const drawHsl: DrawFn = ctx => drawHslChart(ctx, hslHue.value);
const ringDraw = (value: number): DrawFn => (ctx, w, h) => drawHueRing(ctx, w, h, value, chroma.value);

const onMunsellPick = ({x, y}: PickEvent) => {
  const hit = locateMunsell(x, y);
  if (!hit) {
    return;
  }
  const {rgb, inGamut} = munsellToRgb(hueIndex.value, hit.value, hit.chroma);
  const note = notation(hueIndex.value, hit.value, hit.chroma);
  picked.value = inGamut ? `${note}  ≈  ${toHex(rgb).toUpperCase()}` : `${note}  超出 sRGB 色域，无法显示`;
};

const onHslPick = ({x, y, color}: PickEvent) => {
  const hit = locateHsl(x, y);
  if (hit) {
    picked.value = `hsl(${hslHue.value}, ${hit.s}%, ${hit.l}%)  =  ${color}`;
  }
};
</script>

<template>
  <demo-page>
    <demo-section
      title="孟塞尔色相页（近似，非孟塞尔重新标定数据）"
      desc="孟塞尔系统用三个属性描述颜色：色相(Hue，分 R、YR、Y、GY、G、BG、B、PB、P、RP 十个主色相，每个再分 2.5/5/7.5/10 共 40 档)、明度(Value，0 黑到 10 白，视觉上等间隔)、彩度(Chroma，离灰色轴的距离，步长为 2)。真正的孟塞尔数据来自大量人眼实验的“重新标定表”，这里只是用 OKLCH 做近似：色相角按主色相锚点插值，明度按 ASTM D1535 公式换算成亮度，彩度按固定比例换算。斜纹格子表示超出 sRGB 色域。"
    >
      <div class="demo-controls">
        <label>
          色相
          <select v-model.number="hueIndex">
            <option v-for="(label, i) in HUE_LIST" :key="label" :value="i">{{ label }}</option>
          </select>
        </label>
        <span class="demo-code">{{ picked }}</span>
      </div>
      <demo-canvas
        :title="`孟塞尔 ${HUE_LIST[hueIndex]} 色相页：横轴彩度，纵轴明度`"
        :width="CHART_W"
        :height="CHART_H"
        :draw="drawMunsell"
        @pick="onMunsellPick"
      />
      <demo-canvas
        :title="`同色相的 HSL 页（hue = ${hslHue}°）：横轴饱和度，纵轴 HSL 亮度，格内是 Lab L*`"
        :width="CHART_W"
        :height="CHART_H"
        :draw="drawHsl"
        @pick="onHslPick"
      />
    </demo-section>

    <demo-section
      title="HSL 对比：为什么孟塞尔的明度行更“整齐”"
      desc="左边每一行的明度相同，感知亮度也基本相同，所以同一行的颜色深浅看起来一致；右边每一行的 HSL 亮度相同，但格子里标出的 Lab L* 从左到右、从一个色相到另一个色相差别很大(例如 HSL 的 L=50%、S=100% 时，黄色的 L* 约 97，蓝色只有约 32)。这就是 HSL 的“亮度”不等于人眼感受到的明度。"
    />

    <demo-section
      title="40 个色相的色相环（色立体的一个水平切片）"
      desc="同一明度、同一彩度下，把 40 个色相排成一圈。三个圆分别是明度 3、5、7。灰色格子是该明度和彩度下 sRGB 显示不出来的颜色：色立体不是规则的圆柱，不同色相能达到的最大彩度和对应明度各不相同(例如黄色在高明度处彩度很大，蓝紫色在低明度处彩度才大)，所以孟塞尔色立体是一棵“歪树”。"
    >
      <div class="demo-controls">
        <label>
          彩度
          <input v-model.number="chroma" type="range" min="2" max="16" step="2">
          {{ chroma }}
        </label>
      </div>
      <demo-canvas
        v-for="v in [3, 5, 7]"
        :key="v"
        :title="`明度 V = ${v}`"
        :width="260"
        :height="260"
        :draw="ringDraw(v)"
      />
    </demo-section>
  </demo-page>
</template>
