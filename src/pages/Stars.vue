<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {STARS, bvToTemperature, starColor, peakWavelength, dopplerWavelength, C_KMS} from '../utils/stars';
import {rgbCss, rgbHex} from '../utils/spectral';
import {
  BV_W,
  BV_H,
  HR_W,
  HR_H,
  PL_W,
  PL_H,
  DOP_W,
  DOP_H,
  REST,
  drawBvStrip,
  classRows,
  drawHr,
  nearestStar,
  drawPlanckChart,
  drawDoppler,
  dopplerRows,
  starInfo
} from '../composables/stars';

const classes = classRows();
const bvSamples = [-0.2, 0, 0.3, 0.65, 1.0, 1.5, 1.9].map(bv => ({
  bv,
  t: Math.round(bvToTemperature(bv) / 10) * 10,
  color: rgbCss(starColor(bvToTemperature(bv)))
}));

const selected = ref(0);
const drawDiagram = drawHr(() => selected.value);
const onPick = (e: {x: number; y: number}) => {
  const i = nearestStar(e.x, e.y);
  if (i >= 0) {
    selected.value = i;
  }
};
const star = computed(() => STARS[selected.value]);
const info = computed(() => starInfo(star.value));
const starSwatch = computed(() => rgbCss(starColor(star.value.temperature)));

const temperature = ref(5772);
const drawPlanck = drawPlanckChart(() => temperature.value);
const swatch = computed(() => rgbCss(starColor(temperature.value)));
const hex = computed(() => rgbHex(starColor(temperature.value)));
const peak = computed(() => peakWavelength(temperature.value));

const velocity = ref(100);
const drawShift = drawDoppler(() => ({velocity: velocity.value}));
const shifted = computed(() => dopplerWavelength(REST, velocity.value));
const rows = dopplerRows();
</script>

<template>
  <demo-page>
    <demo-section
      title="B−V 色指数与恒星的颜色"
      desc="天文学用 B−V 色指数描述恒星颜色：B 是蓝光波段的星等，V 是黄绿光波段的星等，两者相减，数值越小越蓝，越大越红（星等越小越亮）。温度越高的恒星整体越偏蓝白，温度越低越偏橙红。下面用 Ballesteros（2012）的经验公式把 B−V 换算成有效温度，再按黑体辐射算出显示颜色。公式是近似，亮度统一，颜色也是示意，因为恒星的颜色还和观察方式有关。"
    >
      <demo-canvas :width="BV_W" :height="BV_H" :draw="drawBvStrip"/>
      <table class="stars-table">
        <thead>
          <tr>
            <th>光谱型</th>
            <th>温度范围（近似）</th>
            <th>颜色</th>
            <th>特点</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in classes" :key="c.key">
            <td class="demo-code">
              {{ c.key }}
            </td>
            <td class="demo-code">
              {{ c.range }}
            </td>
            <td><span class="stars-dot" :style="{background: c.color}"/></td>
            <td>{{ c.note }}</td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        几个例子：
        <span v-for="s in bvSamples" :key="s.bv" class="demo-code">
          <span class="stars-dot" :style="{background: s.color}"/>B−V {{ s.bv }} → {{ s.t }} K
        </span>
      </p>
    </demo-section>

    <demo-section
      title="赫罗图：温度与光度的地图"
      desc="赫罗图以温度为横轴（左热右冷，这是历史习惯）、光度为纵轴，每颗恒星是一个点。大多数恒星落在从左上到右下的主序带上，它们靠核心的氢聚变发光；离开主序、膨胀并变冷的是右上方的红巨星和超巨星，光度高但温度低；左下方是体积很小的白矮星，温度高却很暗。圆点的大小对应恒星半径（对数压缩），颜色是同温度黑体的显示颜色。星名后的数值取自常见资料，是近似值，光度的不确定性尤其大；带阴影的色带只是示意。点击一颗星查看详情。"
    >
      <demo-canvas :width="HR_W" :height="HR_H" :draw="drawDiagram" @pick="onPick"/>
      <div class="stars-info">
        <span class="stars-dot" :style="{background: starSwatch}"/>
        <strong>{{ star.name }}</strong>
        <span class="demo-code">
          {{ star.kind }}&emsp;T ≈ {{ star.temperature }} K&emsp;L ≈ {{ star.luminosity }} L☉&emsp;R ≈ {{ info.radius }} R☉&emsp;颜色 {{ info.hex }}
        </span>
      </div>
    </demo-section>

    <demo-section
      title="为什么没有绿色的恒星"
      desc="黑体的辐射谱很宽，在可见光波段里各种颜色都有。太阳的峰值波长约在 500 nm，也就是绿色，但红、橙、黄、蓝等光同时存在，混在一起就成了白色，所以没有绿色的恒星。我们看到的恒星颜色是整个可见光谱的综合：温度低时红光多于蓝光，偏橙红；温度高时则偏蓝白。另外，人眼会自动适应周围的光线，肉眼看太阳是白的，而相机照片经过饱和度和白平衡处理，星点的颜色往往比肉眼看到的更鲜艳。拖动温度，看峰值怎样移动，以及颜色怎样随之变化。"
    >
      <div class="demo-controls">
        <label>
          温度
          <input v-model.number="temperature" type="range" min="2500" max="40000" step="100">
          <span class="demo-code">{{ temperature }} K</span>
        </label>
        <span class="stars-dot" :style="{background: swatch}"/>
        <span class="demo-code">{{ hex }}&emsp;峰值 {{ peak.toFixed(0) }} nm</span>
      </div>
      <demo-canvas :width="PL_W" :height="PL_H" :draw="drawPlanck"/>
    </demo-section>

    <demo-section
      title="多普勒频移：恒星颜色会变吗"
      desc="恒星朝向或远离我们运动时，谱线波长会变化：λ' = λ·√((1+β)/(1−β))，β = v/c，远离时变长（红移）。以氢的 Hα 线（656.28 nm）为例，普通恒星的速度只有每秒几十到几百公里，谱线只移动零点几纳米，用光谱仪能测出来，但整个恒星的颜色一点也不会变。只有速度达到光速的百分之几到几十（遥远的星系、类星体），移动才会大到颜色可见。所以恒星的颜色是由温度决定的，不是由多普勒效应决定的。"
    >
      <div class="demo-controls">
        <label>
          视向速度（正为远离）
          <input v-model.number="velocity" type="range" min="-300" max="300" step="5">
          <span class="demo-code">{{ velocity }} km/s</span>
        </label>
        <span class="demo-code">β = {{ (velocity / C_KMS).toExponential(2) }}&emsp;Δλ = {{ (shifted - REST).toFixed(3) }} nm</span>
      </div>
      <demo-canvas :width="DOP_W" :height="DOP_H" :draw="drawShift"/>
      <table class="stars-table">
        <thead>
          <tr>
            <th>情形</th>
            <th>速度</th>
            <th>观测波长</th>
            <th>移动</th>
            <th>谱线颜色（静止 → 观测）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.label">
            <td>{{ r.label }}</td>
            <td class="demo-code">
              {{ r.velocity.toFixed(0) }} km/s
            </td>
            <td class="demo-code">
              {{ r.observed.toFixed(2) }} nm
            </td>
            <td class="demo-code">
              {{ r.shift > 0 ? '+' : '' }}{{ r.shift.toFixed(2) }} nm
            </td>
            <td>
              <span class="stars-dot" :style="{background: r.restColor}"/>
              →
              <span class="stars-dot" :style="{background: r.color}"/>
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.stars-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 5px 12px;
    border: 1px solid #E2E4EA;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    color: #5C5D5F;
  }
}
.stars-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  vertical-align: -2px;
  border: 1px solid #CCC;
}
.stars-info {
  margin: 4px 0 8px;
  font-size: 13px;
  strong {
    margin-right: 10px;
  }
}
</style>
