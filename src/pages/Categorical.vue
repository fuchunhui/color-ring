<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {
  VARIANTS,
  VARIANT_LABELS,
  OKABE_ITO,
  TABLEAU10,
  generatePalette,
  paletteStats
} from '../utils/categorical';
import {CHART_W, CHART_H, drawChart} from '../composables/categorical';

const count = ref(8);
const lMin = ref(0.3);
const lMax = ref(0.9);
const cMin = ref(0.08);
const cvdSafe = ref(false);

const generated = computed(() => generatePalette({
  count: count.value,
  lMin: lMin.value,
  lMax: Math.max(lMax.value, lMin.value + 0.05),
  cMin: cMin.value,
  cvdSafe: cvdSafe.value
}));

const palettes = computed(() => [
  {key: 'gen', label: `本页生成（${generated.value.length} 色${cvdSafe.value ? '，色盲安全' : ''}）`, colors: generated.value},
  {key: 'oi', label: 'Okabe–Ito（8 色）', colors: OKABE_ITO},
  {key: 'tab', label: 'Tableau 10', colors: TABLEAU10}
]);

const rows = computed(() => palettes.value.map(p => ({...p, stats: paletteStats(p.colors)})));

const copied = ref('');
const copy = (colors: string[]) => {
  const text = colors.join(', ');
  navigator.clipboard?.writeText(text).catch(() => {});
  copied.value = text;
};

const chartFns = computed(() => palettes.value.map(p => drawChart(() => p.colors)));
</script>

<template>
  <demo-page>
    <demo-section
      title="分类配色生成：让任意两色尽可能不同"
      desc="图表里的“类别”需要彼此一眼能分开的颜色。做法：在 sRGB 色域内的 OKLCH 网格上取候选色，再用贪心的“最远点”策略逐个挑选，每次选出与已选颜色中最近的那个 ΔE2000 最大的候选，也就是让最小色差尽量大。勾选“色盲安全”后，会同时要求在红色盲、绿色盲、蓝黄色盲的模拟视觉下也拉开距离，代价是正常视觉下的最小色差会变小。"
    >
      <div class="demo-controls">
        <label>
          颜色数
          <input v-model.number="count" type="range" min="2" max="12" step="1">
          <span class="demo-code">{{ count }}</span>
        </label>
        <label>
          亮度下限
          <input v-model.number="lMin" type="range" min="0.1" max="0.7" step="0.05">
          <span class="demo-code">{{ lMin.toFixed(2) }}</span>
        </label>
        <label>
          亮度上限
          <input v-model.number="lMax" type="range" min="0.5" max="0.98" step="0.02">
          <span class="demo-code">{{ lMax.toFixed(2) }}</span>
        </label>
        <label>
          最小色度
          <input v-model.number="cMin" type="range" min="0" max="0.2" step="0.01">
          <span class="demo-code">{{ cMin.toFixed(2) }}</span>
        </label>
        <label>
          <input v-model="cvdSafe" type="checkbox">
          色盲安全
        </label>
      </div>
      <p class="categorical-note">
        提示：人眼在图表里能稳定区分的类别颜色大约只有 7 到 10 种。颜色再多，就应该改用形状、直接标注或分面，而不是继续加颜色。把最小色度调到 0，候选里会包含接近黑、白、灰的颜色，它们的色差最大，却不一定适合做图表。
      </p>
    </demo-section>

    <demo-section
      title="三套配色并排：色板与最小 / 平均色差"
      desc="下表的数字是调色板内所有颜色两两之间的 ΔE2000：最小值反映最容易混淆的那一对，平均值反映整体拉开的程度。色盲列是用 Machado 等人（2009）的矩阵模拟的结果。Okabe–Ito 是专门为色觉缺陷者设计的经典配色，本页生成的配色只是在这个目标函数下的贪心结果，不一定最优。"
    >
      <div v-for="p in palettes" :key="p.key" class="categorical-row">
        <div class="categorical-name">
          {{ p.label }}
        </div>
        <span v-for="c in p.colors" :key="c" class="demo-swatch" :style="{background: c}" :title="c"/>
        <color-button label="复制颜色列表" @click="copy(p.colors)"/>
      </div>
      <p v-if="copied" class="categorical-note demo-code">
        已复制：{{ copied }}
      </p>
      <table class="categorical-table">
        <thead>
          <tr>
            <th>配色</th>
            <th v-for="v in VARIANTS" :key="v">
              {{ VARIANT_LABELS[v] }}（最小 / 平均）
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key">
            <td>{{ r.label }}</td>
            <td v-for="v in VARIANTS" :key="v" class="demo-code">
              {{ r.stats[v].min.toFixed(1) }} / {{ r.stats[v].mean.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="放进图表里看"
      desc="同一份示意数据（多折线、堆叠柱、图例）分别用三套配色画出来。调高颜色数，可以看到颜色一多，相邻的类别就开始难以分辨。"
    >
      <demo-canvas
        v-for="(p, i) in palettes"
        :key="p.key"
        :title="p.label"
        :width="CHART_W"
        :height="CHART_H"
        :draw="chartFns[i]"
      />
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.categorical-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  .demo-swatch {
    width: 28px;
    height: 28px;
  }
  .color-button {
    margin-left: 12px;
  }
}
.categorical-name {
  width: 200px;
  font-size: 13px;
}
.categorical-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
  word-break: break-all;
}
.categorical-table {
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 12px;
  th, td {
    border: 1px solid #DDDEE4;
    padding: 5px 10px;
    text-align: left;
    background: #FFF;
  }
}
</style>
