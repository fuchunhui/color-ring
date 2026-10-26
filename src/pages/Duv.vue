<script setup lang="ts">
import {computed, reactive} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {cctDuvToXy, xyToCctDuv, xyToUv, mccamyCct} from '../utils/colorimetry';
import {UV_W, UV_H, REFERENCES, drawDuv, swatchHex} from '../composables/duv';
import type {DuvState} from '../composables/duv';

const state = reactive<DuvState>({cct: 6500, duv: 0});

const draw = (ctx: CanvasRenderingContext2D) => {
  drawDuv(ctx, state);
};

const xy = computed(() => cctDuvToXy(state.cct, state.duv));
const uv = computed(() => xyToUv(xy.value));
const back = computed(() => xyToCctDuv(xy.value));
const mccamy = computed(() => mccamyCct(xy.value));
const hex = computed(() => swatchHex(xy.value));

const jump = (key: string) => {
  const ref = REFERENCES.find(r => r.key === key);
  if (ref) {
    state.cct = Math.round(Math.min(12000, Math.max(1500, ref.cct)));
    state.duv = Math.round(Math.min(0.02, Math.max(-0.02, ref.duv)) * 10000) / 10000;
  }
};

const onJump = (event: Event) => {
  jump((event.target as HTMLSelectElement).value);
};

const tint = computed(() => {
  const d = state.duv;
  if (Math.abs(d) < 0.001) {
    return '几乎在黑体轨迹上';
  }
  return d > 0 ? '偏绿（在黑体轨迹上方）' : '偏品红（在黑体轨迹下方）';
});
</script>

<template>
  <demo-page>
    <demo-section
      title="色温 + Duv：描述白光的两个数字"
      desc="只用色温（CCT）无法完整描述一束白光，因为同一个色温上可以有偏绿、偏品红的各种白。色温给出的是“黑体轨迹上离它最近的点”，Duv 则是它到黑体轨迹的垂直距离（在 CIE 1960 UCS 的 u、v 平面里量，v 更大的一侧，也就是偏绿的一侧为正）。图中黑线是黑体轨迹，细线是等色温线（与轨迹垂直），虚线是 Duv = ±0.006 的范围。拖动滑块让白点沿着等色温线上下移动，色温不变，但白色会偏绿或偏品红。"
    >
      <div class="demo-controls">
        <label>
          色温 CCT
          <input v-model.number="state.cct" type="range" min="1500" max="12000" step="10">
          <span class="demo-code">{{ state.cct }} K</span>
        </label>
        <label>
          Duv
          <input v-model.number="state.duv" type="range" min="-0.02" max="0.02" step="0.0005">
          <span class="demo-code">{{ state.duv.toFixed(4) }}</span>
        </label>
        <label>
          跳到参考光源
          <select @change="onJump">
            <option value="" disabled selected>选择</option>
            <option v-for="ref in REFERENCES" :key="ref.key" :value="ref.key">
              {{ ref.label }}（{{ ref.note }}）
            </option>
          </select>
        </label>
      </div>
      <demo-canvas :width="UV_W" :height="UV_H" :draw="draw"/>
      <div class="duv-info">
        <div class="duv-row">
          <span class="demo-swatch" :style="{background: hex}"/>
          <span class="demo-code">{{ hex }}</span>
          <span>色块按最大通道归一显示，只表现色度。</span>
        </div>
        <p>x = {{ xy[0].toFixed(4) }}，y = {{ xy[1].toFixed(4) }}；u = {{ uv[0].toFixed(4) }}，v = {{ uv[1].toFixed(4) }}</p>
        <p>
          反算（由 x、y 重新算出）：CCT = {{ back.cct.toFixed(0) }} K，Duv = {{ back.duv.toFixed(4) }}；
          McCamy 近似公式给出的 CCT = {{ mccamy.toFixed(0) }} K（只在黑体附近的 2000–12500 K 较准）。
        </p>
        <p>{{ tint }}</p>
      </div>
    </demo-section>

    <demo-section
      title="参考光源的位置"
      desc="下表的色度坐标：D65 与 A 来自 CIE 标准光源的定义，F1、F2、F11 取自 CIE 荧光灯标准光源表，CCT 与 Duv 由本页的算法算出。可以看到日光 D65 并不严格在黑体轨迹上，Duv 约为 +0.003，所以它的色温只能写成“相关色温”；荧光灯和很多白光 LED 的 Duv 也不是 0。"
    >
      <table class="duv-table">
        <thead>
          <tr>
            <th>光源</th>
            <th>x</th>
            <th>y</th>
            <th>CCT</th>
            <th>Duv</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ref in REFERENCES" :key="ref.key" @click="jump(ref.key)">
            <td>{{ ref.label }}</td>
            <td class="demo-code">
              {{ ref.xy[0].toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ ref.xy[1].toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ ref.cct.toFixed(0) }} K
            </td>
            <td class="demo-code">
              {{ ref.duv >= 0 ? '+' : '' }}{{ ref.duv.toFixed(4) }}
            </td>
            <td>{{ ref.note }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="为什么要关心 Duv"
      desc="相机的白平衡里有两个滑块，一个“色温”（蓝—黄轴），一个“色调 / Tint”（绿—品红轴），正好对应沿轨迹和垂直于轨迹这两个方向。荧光灯的光谱不连续，发出的白光常常落在黑体轨迹上方，也就是偏绿，所以用日光型胶片或没有校正的相机拍荧光灯下的物体容易发绿，需要往品红方向补偿。照明行业会对 LED 等光源规定 Duv 的容差，常见的是 ±0.006 左右，以保证同一批灯的白色看起来一致；具体的容差和分档请以相关标准为准。"
    />
  </demo-page>
</template>

<style lang="less">
.duv-info {
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 22px;
  color: #555;
  .duv-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
}
.duv-table {
  border-collapse: collapse;
  background: #FFF;
  font-size: 13px;
  th,
  td {
    padding: 6px 12px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
  tbody tr {
    cursor: pointer;
    &:hover {
      background: #EDF4FE;
    }
  }
}
</style>
