<script setup lang="ts">
import {computed, reactive} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {blackbody, spectrumXyz} from '../utils/spectral';
import {
  TEMP_MIN,
  TEMP_MAX,
  FILTERS,
  WB_OPTIONS,
  MODEL_SHIFTS,
  toMired,
  shiftedKelvin,
  applyShift,
  lightHex,
  balancedHex
} from '../utils/mired';
import {
  STRIP_W,
  STRIP_H,
  BAR_W,
  BAR_H,
  FILTER_W,
  FILTER_H,
  SCALE_STATS,
  drawScaleStrips,
  drawStepBars,
  drawFilterPlot
} from '../composables/mired';

const state = reactive({temp: 3200, shift: -131, wb: 5500});

const result = computed(() => applyShift(state.temp, state.shift));
const drawFilter = drawFilterPlot(() => result.value, () => state.temp);

const filterKey = computed(() => FILTERS.find(f => f.shift === state.shift)?.key ?? 'custom');

const onFilter = (event: Event) => {
  const item = FILTERS.find(f => f.key === (event.target as HTMLSelectElement).value);
  if (item) {
    state.shift = item.shift;
  }
};

const sourceSpd = computed(() => blackbody(state.temp));
const wbSpd = computed(() => blackbody(state.wb));

const swatches = computed(() => {
  const filtered = result.value.result;
  return [
    {key: 'light', label: '光源本身的颜色', hex: lightHex(spectrumXyz(sourceSpd.value))},
    {key: 'lightF', label: '过滤镜后的光', hex: filtered ? lightHex(filtered.xyz) : null},
    {key: 'card', label: '灰卡，按白平衡校正，没加滤镜', hex: balancedHex(sourceSpd.value, wbSpd.value)},
    {key: 'cardF', label: '灰卡，加滤镜并按白平衡校正', hex: filtered ? balancedHex(result.value.spd, wbSpd.value) : null}
  ];
});

const describe = (mired: number): string => {
  const abs = Math.abs(mired);
  if (abs < 5) {
    return '基本中性';
  }
  const tone = mired > 0 ? '偏暖（偏黄橙）' : '偏冷（偏蓝）';
  return `${abs < 20 ? '轻微' : '明显'}${tone}`;
};

const residual = computed(() => {
  const wb = toMired(state.wb);
  const without = toMired(state.temp) - wb;
  const filtered = result.value.result;
  const withFilter = filtered ? toMired(filtered.cct) - wb : null;
  return {
    without,
    withFilter,
    withoutText: describe(without),
    withFilterText: withFilter === null ? '' : describe(withFilter)
  };
});

const filterRows = computed(() => FILTERS.map(f => ({...f, out: shiftedKelvin(state.temp, f.shift)})));

const modelRows = computed(() => MODEL_SHIFTS.map(shift => ({shift, r: applyShift(state.temp, shift)})));

const sign = (v: number, digits = 0): string => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
</script>

<template>
  <demo-page>
    <demo-section
      title="为什么不直接用开尔文"
      :desc="`色温的单位是开尔文，但眼睛对它的敏感程度不均匀：在 2000 K 附近升高 500 K，光色变化很大；在 8000 K 以上升高 500 K，几乎看不出来。迈尔德（mired，微倒度）把色温取倒数：M = 1,000,000 / T。下面两排都取 2000~10000 K 之间的 16 个黑体光色，上排在开尔文上等间隔，下排在迈尔德上等间隔。柱状图是相邻两格在 CIE 1960 (u, v) 色度图上的距离，用它近似“两格看起来差多少”，这是个简化的代理量，不是严格的感知实验。开尔文等间隔时，最大一步是最小一步的 ${SCALE_STATS.kelvinRatio.toFixed(1)} 倍（${SCALE_STATS.kelvinMin.toFixed(4)} 到 ${SCALE_STATS.kelvinMax.toFixed(4)}）；迈尔德等间隔时只有 ${SCALE_STATS.miredRatio.toFixed(2)} 倍（${SCALE_STATS.miredMin.toFixed(4)} 到 ${SCALE_STATS.miredMax.toFixed(4)}）。`"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawScaleStrips"/>
      <demo-canvas :width="BAR_W" :height="BAR_H" :draw="drawStepBars"/>
    </demo-section>

    <demo-section
      title="滤镜是加法：给光源色温加减迈尔德"
      desc="一块色温转换滤镜的强度用迈尔德平移值 ΔM 表示，不管光源原来是多少 K，滤镜都把它的迈尔德数加上 ΔM。例如 85B 把 5500 K 变成 3200 K：1,000,000/5500 = 181.8，1,000,000/3200 = 312.5，差 +130.7，所以它的平移值是 +131；同一块滤镜放在 3200 K 的灯前，得到的是 1,000,000/(312.5+131) ≈ 2255 K，而不是 K 数上的同一个差。ΔM 为正，光变暖（偏黄橙）；为负，光变冷（偏蓝）。下面选择光源色温和滤镜，再选相机按哪个色温做白平衡，看灰卡最后是什么颜色。"
    >
      <div class="demo-controls">
        <label>
          光源色温
          <input v-model.number="state.temp" type="range" :min="TEMP_MIN" :max="TEMP_MAX" step="50">
          <span class="demo-code">{{ state.temp }} K（{{ toMired(state.temp).toFixed(0) }} mired）</span>
        </label>
        <label>
          滤镜
          <select :value="filterKey" @change="onFilter">
            <option v-if="filterKey === 'custom'" value="custom" disabled>自定义</option>
            <option v-for="f in FILTERS" :key="f.key" :value="f.key">
              {{ f.name }}（{{ sign(f.shift) }}）
            </option>
          </select>
        </label>
        <label>
          平移值 ΔM
          <input v-model.number="state.shift" type="range" min="-200" max="200" step="1">
          <span class="demo-code">{{ sign(state.shift) }} mired</span>
        </label>
        <label>
          相机白平衡
          <select v-model.number="state.wb">
            <option v-for="o in WB_OPTIONS" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
      </div>
      <p class="mired-note demo-code">
        M_in = 1,000,000 / {{ state.temp }} = {{ result.mIn.toFixed(1) }}；M_out = {{ result.mIn.toFixed(1) }} {{ sign(state.shift) }} = {{ result.mOut.toFixed(1) }}
        <template v-if="result.tOut !== null && result.result">
          → {{ result.tOut.toFixed(0) }} K（把滤镜后的光谱重新算出的相关色温：{{ result.result.cct.toFixed(0) }} K，Duv = {{ sign(result.result.duv, 4) }}）
        </template>
        <template v-else>
          → 超出范围（本页只处理 M_out ≥ 50，也就是 20000 K 以内的黑体色）
        </template>
      </p>
      <div class="mired-swatches">
        <div v-for="s in swatches" :key="s.key" class="mired-swatch">
          <span class="mired-chip" :style="{background: s.hex || 'transparent'}">
            <template v-if="!s.hex">超出范围</template>
          </span>
          <span>{{ s.label }}</span>
          <span v-if="s.hex" class="demo-code">{{ s.hex }}</span>
        </div>
      </div>
      <p class="mired-note">
        相机白平衡设在 {{ state.wb }} K（{{ toMired(state.wb).toFixed(0) }} mired）：
        不加滤镜时，光源与白平衡相差 {{ sign(residual.without, 1) }} mired，灰卡{{ residual.withoutText }}；
        <template v-if="residual.withFilter !== null">
          加滤镜后相差 {{ sign(residual.withFilter, 1) }} mired，灰卡{{ residual.withFilterText }}。
        </template>
        <template v-else>
          加滤镜后的色温超出了本页的范围。
        </template>
        经验上几 mired 以内多数人看不出偏色，几十 mired 就很明显，具体因人、因场景而异。
      </p>
      <demo-canvas title="滤镜怎样改变光谱" :width="FILTER_W" :height="FILTER_H" :draw="drawFilter"/>
    </demo-section>

    <demo-section
      title="常见滤镜的迈尔德值"
      desc="下表是公开资料里常见的典型平移值，不同厂家、不同批次的实际数值会有出入。最后一列是用当前光源色温算出的结果。点一行，把它的平移值代入上面的滑块。灯光色片（CTO / CTB）的整张、1/2、1/4 规格在各品牌里并不统一，这里按 ±131、±81、±42 近似。"
    >
      <table class="mired-table">
        <thead>
          <tr>
            <th>滤镜</th>
            <th>ΔM</th>
            <th>说明</th>
            <th>当前光源 {{ state.temp }} K 过它之后</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in filterRows" :key="f.key" @click="state.shift = f.shift">
            <td>{{ f.name }}</td>
            <td class="demo-code">
              {{ sign(f.shift) }}
            </td>
            <td>{{ f.note }}</td>
            <td class="demo-code">
              {{ f.out === null ? '超出范围' : `${f.out.toFixed(0)} K` }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="这个滤镜模型有多准"
      desc="上面的滤镜是按公式算出来的理想滤镜，不是某款实物的测量值。做法：黑体光谱近似为 Wien 形式时，两个黑体光谱的比值是 exp(−14.388·ΔM/λ)（λ 单位 nm），一条平滑的单调曲线，把它当作滤镜的透过率。更精确的做法是直接取两个普朗克光谱之比，那样滤镜后的光谱就恰好是目标色温的黑体，误差为零。图里实线和点线几乎重合，下表给出 Wien 近似滤镜在当前光源色温下的误差：色温是把滤镜后的光谱重新算出的相关色温，误差按迈尔德计。在我试过的组合里，光源和目标色温都不超过 10000 K 时，误差最大约 8 mired（光源 10000 K、ΔM = +200 的情况）；目标色温高到 15000 K 以上时，误差会更大，因为 Wien 近似在这一端不再成立。真实的染料滤镜或镀膜滤镜透过率都不是这样光滑的曲线，所以会带来额外的偏色。"
    >
      <table class="mired-table mired-table-plain">
        <thead>
          <tr>
            <th>ΔM</th>
            <th>目标色温</th>
            <th>Wien 近似滤镜算出的色温</th>
            <th>色温差</th>
            <th>迈尔德差</th>
            <th>Duv</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in modelRows" :key="row.shift">
            <td class="demo-code">
              {{ sign(row.shift) }}
            </td>
            <template v-if="row.r.tOut !== null && row.r.result">
              <td class="demo-code">
                {{ row.r.tOut.toFixed(0) }} K
              </td>
              <td class="demo-code">
                {{ row.r.result.cct.toFixed(0) }} K
              </td>
              <td class="demo-code">
                {{ sign(row.r.result.cct - row.r.tOut) }} K
              </td>
              <td class="demo-code">
                {{ sign(row.r.errMired || 0, 1) }}
              </td>
              <td class="demo-code">
                {{ sign(row.r.result.duv, 4) }}
              </td>
            </template>
            <td v-else colspan="5">
              超出范围
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="迈尔德只管一个方向"
      desc="迈尔德平移只沿着黑体轨迹移动，也就是蓝—橙这根轴。荧光灯、LED 等光源的光常常偏离黑体轨迹，偏绿或偏品红，这一偏差用 Duv 描述，在“色温与Duv”页里有专门的演示。相机白平衡里的“色温”滑块对应迈尔德这一轴，“色调 / Tint”滑块对应 Duv 这一轴，所以拍荧光灯下的物体时，只调色温调不干净，还要往品红方向补一点色调。"
    />
  </demo-page>
</template>

<style lang="less">
.mired-note {
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 22px;
  color: #555;
}
.mired-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 8px 0 12px;
}
.mired-swatch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 180px;
  font-size: 12px;
  color: #555;
}
.mired-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  border: 1px solid #DDDEE4;
  color: #B03A2E;
}
.mired-table {
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
  &-plain tbody tr {
    cursor: default;
    &:hover {
      background: none;
    }
  }
}
</style>
