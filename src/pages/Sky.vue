<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  SPECTRA_W,
  SPECTRA_H,
  SCENE_W,
  SCENE_H,
  drawSkySpectra,
  drawSkyScene,
  sunTable
} from '../composables/sky';

const eye = ref(false);
const ozone = ref(true);
const elevation = ref(30);

const drawSpectra = drawSkySpectra(() => ({eye: eye.value, ozone: ozone.value}));
const drawScene = drawSkyScene(() => elevation.value, () => ozone.value);
const rows = computed(() => sunTable(ozone.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="天空为什么是蓝的"
      desc="空气分子比可见光的波长小得多，对光的散射遵循瑞利散射：散射强度与波长的四次方成反比（λ⁻⁴）。蓝光（450 nm）被散射的强度大约是红光（650 nm）的 4 倍，所以我们从太阳以外的方向看到的是被散射下来的蓝光。那为什么不是紫色？第一，太阳光谱里紫光本来就比蓝光少；第二，上层大气会吸收一部分短波；第三，人眼对紫光不敏感。勾选“乘以人眼亮度响应”，可以看到紫光那一段被压低了。曲线是各自归一化的相对值，不是绝对强度。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="eye" type="checkbox">
          乘以人眼亮度响应 ȳ
        </label>
        <label>
          <input v-model="ozone" type="checkbox">
          计入臭氧吸收
        </label>
      </div>
      <demo-canvas :width="SPECTRA_W" :height="SPECTRA_H" :draw="drawSpectra"/>
    </demo-section>

    <demo-section
      title="日落：天空和太阳的颜色随高度变化"
      desc="太阳越低，阳光穿过的大气越厚，蓝光和绿光在途中被散射掉得越多，直射到眼睛里的阳光就越黄、越橙、越红，日落时的天空也因此泛红。下面的画面横向是方位角（太阳在正中），纵向是高度角，用单次散射公式逐行算出天空的光谱，再换成颜色。太阳降到地平线以下后，直射光消失，天空逐渐变暗；此时臭氧层吸收橙红光，天顶会呈现深蓝色（“蓝色时刻”），取消“计入臭氧吸收”就能看到差别。注意：这是定性的演示模型，只考虑单次散射，没有多次散射、地面反射和云，地平线附近只是近似，不是 Preetham 或 Hosek–Wilkie 那样的真实天空渲染。"
    >
      <div class="demo-controls">
        <label>
          太阳高度
          <input v-model.number="elevation" type="range" min="-6" max="90" step="1">
          <span class="demo-code">{{ elevation }}°</span>
        </label>
      </div>
      <demo-canvas :width="SCENE_W" :height="SCENE_H" :draw="drawScene"/>
    </demo-section>

    <demo-section
      title="直射阳光的颜色"
      desc="大气质量是阳光穿过的大气厚度，以太阳在天顶时为 1。表中的颜色是直射阳光（太阳光谱 × e^(−τ·大气质量)）的色相，统一调到相同亮度方便比较；右侧是相对于太阳在天顶时的亮度。大气质量用 Kasten–Young 公式，在地平线附近约为 38。"
    >
      <table class="sky-table">
        <thead>
          <tr>
            <th>太阳高度</th>
            <th>大气质量</th>
            <th>直射光颜色</th>
            <th>相对亮度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.h">
            <td>{{ row.h }}°</td>
            <td>{{ row.mass }}</td>
            <td>
              <span class="demo-swatch" :style="{background: row.hex}"/>
              <span class="demo-code">{{ row.hex }}</span>
            </td>
            <td>{{ row.relative }}%</td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.sky-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 6px 16px;
    border: 1px solid #DDDEE4;
    text-align: center;
    background: #FFF;
  }
  th {
    background: #F5F6FA;
  }
  .demo-swatch {
    margin-right: 8px;
  }
}
</style>
