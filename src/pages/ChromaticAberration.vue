<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  PLOT_W,
  PLOT_H,
  RAY_W,
  RAY_H,
  RAY_EXAG,
  SPOT_SIZE,
  SCENE_W,
  SCENE_H,
  drawIndexPlot,
  drawLensCompare,
  drawDoubletZoom,
  drawRays,
  drawSpot,
  drawScene,
  maxDeviation
} from '../composables/chromaticaberration';
import type {SceneState} from '../composables/chromaticaberration';
import {
  BK7,
  F2,
  LINE_D,
  LENSES,
  SENSORS,
  CHANNEL_NM,
  refractiveIndex,
  abbeNumber,
  singleRatio,
  doubletRatio,
  doubletPowers,
  lensOf,
  sensorOf,
  lateralEpsilon,
  blurRadiusPx,
  cornerShiftPx
} from '../utils/chromaticaberration';
import type {LensKey} from '../utils/chromaticaberration';

const glasses = [BK7, F2].map(g => ({
  name: g.name,
  nd: refractiveIndex(g, LINE_D).toFixed(4),
  v: abbeNumber(g).toFixed(1),
  n400: refractiveIndex(g, 400).toFixed(4),
  n700: refractiveIndex(g, 700).toFixed(4)
}));

const offset = ref(0);
const drawRayDiagram = drawRays(() => offset.value);
const drawSpotImage = drawSpot(() => offset.value);

const FOCAL_MM = 50;
const focusRows = [450, 550, 650].map(nm => {
  const ratio = singleRatio(BK7, nm);
  return {nm, ratio: ((ratio - 1) * 100).toFixed(2), mm: (FOCAL_MM * ratio).toFixed(2)};
});
const spread = computed(() => (FOCAL_MM * (singleRatio(BK7, 650) - singleRatio(BK7, 450))).toFixed(2));

const powers = doubletPowers();
const singleWorst = maxDeviation(nm => singleRatio(BK7, nm)).toFixed(2);
const doubletWorst = maxDeviation(doubletRatio).toFixed(3);
const doubletFC = [486.13, 656.27].map(nm => ((doubletRatio(nm) - 1) * 100).toFixed(3));

const lensKey = ref<LensKey>('single');
const sensorKey = ref('ff');
const exaggeration = ref(5);
const defringe = ref(false);

const scene = (): SceneState => ({
  lens: lensKey.value,
  sensor: sensorOf(sensorKey.value),
  exaggeration: exaggeration.value,
  defringe: defringe.value
});

const drawOriginal = drawScene('original', scene);
const drawAxial = drawScene('axial', scene);
const drawLateral = drawScene('lateral', scene);
const drawBoth = drawScene('both', scene);

const readout = computed(() => {
  const lens = lensOf(lensKey.value);
  const sensor = sensorOf(sensorKey.value);
  const row = (name: string, nm: number) => ({
    name,
    eps: (lateralEpsilon(lens, nm) * 100).toFixed(3),
    shift: cornerShiftPx(lens, sensor, nm).toFixed(1),
    blur: blurRadiusPx(lens, sensor, nm).toFixed(1)
  });
  return [row('红 620nm', CHANNEL_NM.r), row('蓝 460nm', CHANNEL_NM.b)];
});
</script>

<template>
  <demo-page>
    <demo-section
      title="玻璃的折射率随波长变化"
      desc="玻璃对短波的折射率更高，所以蓝光比红光偏折得更厉害，这叫色散。折射率用 Sellmeier 公式计算：n² = 1 + Σ Bᵢλ² / (λ² − Cᵢ)，系数取自 Schott 数据手册。光学上用阿贝数 V = (n_d − 1) / (n_F − n_C) 衡量色散强弱，d、F、C 是三条标准谱线（588、486、656nm），V 越小，色散越强。BK7 是常见的冕牌玻璃，F2 是色散更强的火石玻璃，二者搭配就是消色差透镜的基本材料。"
    >
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawIndexPlot"/>
      <table class="ca-table">
        <thead>
          <tr>
            <th>玻璃</th>
            <th>n_d（588nm）</th>
            <th>阿贝数 V</th>
            <th>n（400nm）</th>
            <th>n（700nm）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in glasses" :key="g.name">
            <td>{{ g.name }}</td>
            <td class="demo-code">
              {{ g.nd }}
            </td>
            <td class="demo-code">
              {{ g.v }}
            </td>
            <td class="demo-code">
              {{ g.n400 }}
            </td>
            <td class="demo-code">
              {{ g.n700 }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="单片透镜：每种颜色有自己的焦点"
      :desc="`薄透镜的焦距 f 与 (n − 1) 成反比，折射率高的蓝光焦距更短。以 f = ${FOCAL_MM}mm 的单片 BK7 透镜为例（d 线焦距），450nm 的焦点在 ${focusRows[0].mm}mm，550nm 在 ${focusRows[1].mm}mm，650nm 在 ${focusRows[2].mm}mm，蓝红之间相差 ${spread}mm。这就是轴向（纵向）色差：屏幕放在哪里，总有一些颜色没对上焦。上图把沿光轴的距离放大了 ${RAY_EXAG} 倍才看得清；下面的光斑按真实比例计算（口径 f/2.8，每像素 4.5µm）。拖动滑块移动屏幕：放在绿光焦点上，中心发白，外围有一圈很淡的紫色晕；放近一点，外圈是红色；放远一点，外圈是蓝紫色。光斑亮度被调高了，中心会过曝，这样才看得到淡淡的彩边。`"
    >
      <div class="demo-controls">
        <label>
          屏幕位置
          <input v-model.number="offset" type="range" min="-2.5" max="2.5" step="0.05">
          <span class="demo-code">{{ offset > 0 ? '+' : '' }}{{ offset.toFixed(2) }}% f（相对绿光焦点）</span>
        </label>
      </div>
      <demo-canvas :width="RAY_W" :height="RAY_H" :draw="drawRayDiagram"/>
      <demo-canvas title="光斑（白点光源）" :width="SPOT_SIZE" :height="SPOT_SIZE" :draw="drawSpotImage"/>
      <table class="ca-table">
        <thead>
          <tr>
            <th>波长</th>
            <th>焦距相对 d 线</th>
            <th>f = {{ FOCAL_MM }}mm 时的焦距</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in focusRows" :key="row.nm">
            <td>{{ row.nm }}nm</td>
            <td class="demo-code">
              {{ row.ratio }}%
            </td>
            <td class="demo-code">
              {{ row.mm }}mm
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="消色差双合透镜：让两种颜色的焦点重合"
      :desc="`把一片凸的冕牌（BK7）和一片凹的火石（F2）贴在一起。设总光焦度为 1，消色差条件是 φ₁/V₁ + φ₂/V₂ = 0 且 φ₁ + φ₂ = 1，解得冕牌 φ₁ = ${powers.crown.toFixed(3)}，火石 φ₂ = ${powers.flint.toFixed(3)}。凸透镜的色散被凹透镜抵消，F 线（486nm）和 C 线（656nm）的焦距相同。左图是焦距随波长的变化：单片 BK7 在 400~700nm 内偏离 d 线焦距最多 ${singleWorst}%，双合透镜只有 ${doubletWorst}%。右图把双合透镜单独放大：两条谱线处都比 d 线长 ${doubletFC[0]}%，中间下凹，这种残余叫二级光谱。想进一步消除它，要用异常部分色散的玻璃（如萤石、ED 玻璃），让三个波长同时对焦，这种镜头称为复消色差（APO）。`"
    >
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawLensCompare"/>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawDoubletZoom"/>
    </demo-section>

    <demo-section
      title="照片里的色差：紫边与错位"
      desc="色差在照片上有两种样子。轴向色差：红、蓝通道没有准确对焦，边缘出现发虚的彩色晕，亮暗交界处常见紫边。横向色差：不同颜色的放大率不同，红、蓝通道相对绿通道缩放，离画面中心越远错位越大，边缘出现红蓝细线，中心几乎没有。这里假设对绿光对焦，三个通道取 620、540、460nm 代表。下面的真实数字按所选镜头和传感器算出；画面里的色差乘以夸张倍数，否则缩小后几乎看不见。勾选“校正横向色差”相当于软件里把红、蓝通道缩放回去，它能去掉横向的红蓝边，但轴向的虚边无法这样恢复。"
    >
      <div class="demo-controls">
        <label>
          镜头
          <select v-model="lensKey">
            <option v-for="l in LENSES" :key="l.key" :value="l.key">{{ l.name }}</option>
          </select>
        </label>
        <label>
          传感器
          <select v-model="sensorKey">
            <option v-for="s in SENSORS" :key="s.key" :value="s.key">{{ s.name }}</option>
          </select>
        </label>
        <label>
          夸张倍数
          <input v-model.number="exaggeration" type="range" min="1" max="10" step="0.5">
          <span class="demo-code">×{{ exaggeration }}</span>
        </label>
        <label>
          <input v-model="defringe" type="checkbox">
          校正横向色差
        </label>
      </div>
      <demo-canvas title="无色差" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      <demo-canvas title="仅轴向色差（红蓝虚化）" :width="SCENE_W" :height="SCENE_H" :draw="drawAxial"/>
      <demo-canvas title="仅横向色差（红蓝缩放）" :width="SCENE_W" :height="SCENE_H" :draw="drawLateral"/>
      <demo-canvas title="两者都有" :width="SCENE_W" :height="SCENE_H" :draw="drawBoth"/>
      <table class="ca-table">
        <thead>
          <tr>
            <th>通道</th>
            <th>放大率差 ε（相对绿）</th>
            <th>传感器角落错位</th>
            <th>弥散圆半径</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in readout" :key="row.name">
            <td>{{ row.name }}</td>
            <td class="demo-code">
              {{ row.eps }}%
            </td>
            <td class="demo-code">
              {{ row.shift }} 像素
            </td>
            <td class="demo-code">
              {{ row.blur }} 像素
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        表中是几何光学的估算，不含衍射和像差校正之外的其他像差，也不含软件已做的矫正。负的错位表示该通道向中心缩。真实镜头的色差还取决于具体光学设计，这里的单片和双合透镜只是教学模型。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.ca-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 4px 14px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    font-weight: 500;
  }
}
</style>
