<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {Vec3, rgbToLab, rgbToXyz} from '../utils/space';
import {xyzToUv, rgbToLuv, luvToLch, deltaEuv} from '../utils/luv';
import {deltaE76, deltaE2000} from '../utils/deltae';
import {
  WIDTH,
  HEIGHT,
  ELLIPSE_Y,
  ELLIPSE_SCALE,
  GAMUTS,
  METRICS,
  ChartState,
  drawChart,
  ellipseStats
} from '../composables/luv';

const state = reactive<ChartState>({
  gamuts: {srgb: true, p3: false, rec2020: false},
  ellipses: true,
  metric: 'uv'
});

const drawXy = (ctx: CanvasRenderingContext2D) => drawChart('xy', state)(ctx);
const drawUv = (ctx: CanvasRenderingContext2D) => drawChart('uv', state)(ctx);

const stats = computed(() => ellipseStats(state.metric));
const target = computed(() => (METRICS.find(m => m.key === state.metric) as {target: number}).target);
const colorA = ref('#2f6fd6');
const colorB = ref('#4a8f3c');

const parse = (hex: string): Vec3 => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Vec3;

const describe = (hex: string) => {
  const rgb = parse(hex);
  const luv = rgbToLuv(rgb);
  const [u, v] = xyzToUv(rgbToXyz(rgb));
  const lch = luvToLch(luv);
  return {rgb, luv, u, v, lch};
};

const a = computed(() => describe(colorA.value));
const b = computed(() => describe(colorB.value));
const diffs = computed(() => ({
  uv: deltaEuv(a.value.luv, b.value.luv),
  lab76: deltaE76(rgbToLab(a.value.rgb), rgbToLab(b.value.rgb)),
  lab2000: deltaE2000(rgbToLab(a.value.rgb), rgbToLab(b.value.rgb))
}));
</script>

<template>
  <demo-page>
    <demo-section
      title="色度图的“不均匀”：xy 与 u'v'"
      desc="CIE 1931 xy 色度图上，两点的距离并不对应人眼感觉到的颜色差异：同样的“刚好能分辨”，在绿色区域对应很大一片，在蓝色区域却只有一点点。CIE 1976 的 u'v'（UCS）色度图把 xy 做了一次射影变换，目标就是让这种差异更均匀。下面两张图里的椭圆，是在 xy 平面里找出与中心点色差恰好等于某个值的所有色度（亮度固定），并放大 3 倍画出来。选不同的色差公式会得到不同的结果：用 CIELUV 自己的 ΔE*uv 时，u'v' 图里它们是正圆（这是定义），xy 图里则大小悬殊、方向各异；换成 CIELAB 的 ΔE76 或 ΔE2000，两张图的差别就小得多——没有哪个色度平面对所有色差公式都是均匀的。"
    >
      <div class="demo-controls">
        <label>
          色差公式
          <select v-model="state.metric">
            <option v-for="m in METRICS" :key="m.key" :value="m.key">
              {{ m.label }}
            </option>
          </select>
        </label>
        <label v-for="g in GAMUTS" :key="g.key">
          <input v-model="state.gamuts[g.key]" type="checkbox">
          <span :style="{color: g.color}">{{ g.label }}</span>
        </label>
        <label>
          <input v-model="state.ellipses" type="checkbox">
          <span>等色差椭圆（×{{ ELLIPSE_SCALE }}）</span>
        </label>
      </div>
      <demo-canvas title="CIE 1931 xy" :width="WIDTH" :height="HEIGHT" :draw="drawXy"/>
      <demo-canvas title="CIE 1976 u'v'" :width="WIDTH" :height="HEIGHT" :draw="drawUv"/>
      <p class="luv-note">
        共 {{ stats.count }} 个椭圆。最大椭圆的面积是最小椭圆的倍数：xy 图中为 {{ stats.xy.toFixed(1) }} 倍，u'v' 图中为 {{ stats.uv.toFixed(1) }} 倍。
        计算条件：亮度 Y = {{ ELLIPSE_Y }}，色差 = {{ target }}。这是计算出的等色差椭圆，不是 MacAdam 1942 的实验数据。
      </p>
    </demo-section>

    <demo-section
      title="CIELUV 计算器"
      desc="CIELUV（L*u*v*）与 CIELAB 同在 1976 年发布，亮度 L* 完全相同，色度坐标则建立在 u'v' 上。它的优点是加色混合时（比如显示器、照明）色度图上的直线仍然是直线；CIELAB 则更常用于反射色（印刷、涂料）。选两种颜色，比较三种色差。"
    >
      <div class="demo-controls">
        <label>颜色 A <input v-model="colorA" type="color"></label>
        <label>颜色 B <input v-model="colorB" type="color"></label>
      </div>
      <table class="luv-table">
        <thead>
          <tr>
            <th/>
            <th>L*</th>
            <th>u*</th>
            <th>v*</th>
            <th>u'</th>
            <th>v'</th>
            <th>C*uv</th>
            <th>h(uv)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in [a, b]" :key="i">
            <th>
              <span class="demo-swatch" :style="{background: i === 0 ? colorA : colorB}"/>
              {{ i === 0 ? 'A' : 'B' }}
            </th>
            <td>{{ c.luv[0].toFixed(2) }}</td>
            <td>{{ c.luv[1].toFixed(2) }}</td>
            <td>{{ c.luv[2].toFixed(2) }}</td>
            <td>{{ c.u.toFixed(4) }}</td>
            <td>{{ c.v.toFixed(4) }}</td>
            <td>{{ c.lch[1].toFixed(2) }}</td>
            <td>{{ c.lch[2].toFixed(1) }}°</td>
          </tr>
        </tbody>
      </table>
      <p class="luv-note">
        ΔE*uv = {{ diffs.uv.toFixed(2) }}，ΔE*ab (CIE76) = {{ diffs.lab76.toFixed(2) }}，ΔE2000 = {{ diffs.lab2000.toFixed(2) }}
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.luv-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 21px;
  color: #444;
}
.luv-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 12px;
    border: 1px solid #DDDEE4;
    text-align: right;
    background: #FFF;
    font-family: Consolas, menlo, monaco, monospace;
  }
  th {
    text-align: center;
    .demo-swatch {
      width: 18px;
      height: 18px;
      margin-right: 6px;
    }
  }
}
</style>
