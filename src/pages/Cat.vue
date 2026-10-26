<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {CATS} from '../utils/colorman';
import type {Matrix} from '../utils/spectral';
import {
  PATCHES,
  SOURCES,
  PATCH_W,
  PATCH_H,
  XY_W,
  XY_H,
  METHOD_COLORS,
  analyse,
  drawPatches,
  drawXyZoom,
  coneRows,
  srgbOf
} from '../composables/cat';

const sourceKey = ref('a');
const cct = ref(3500);
const patchIndex = ref(12);

const analysis = computed(() => analyse(sourceKey.value, cct.value));

const panels = [
  {key: 'source', title: '光源下的样子（不做适应）'},
  {key: 'truth', title: '真实：D65 下的样子'},
  ...CATS.map(c => ({key: c.key as string, title: `${c.label} 适应后`}))
];

const colorsFor = (key: string) => {
  return analysis.value.patches.map(p => {
    if (key === 'source') {
      return srgbOf(p.source);
    }
    if (key === 'truth') {
      return srgbOf(p.truth);
    }
    return srgbOf(p.adapted[key as keyof typeof p.adapted]);
  });
};

const panelDraws: DrawFn[] = panels.map(panel => ctx => drawPatches(ctx, colorsFor(panel.key)));

const zoomDraw: DrawFn = ctx => drawXyZoom(ctx, analysis.value, patchIndex.value);

const cones = computed(() => {
  const p = analysis.value.patches[patchIndex.value];
  return coneRows(p.truth, p.name);
});

const fmt = (m: Matrix): string => m.map(row => row.map(v => v.toFixed(4).padStart(8)).join(' ')).join('\n');
const fixed = (v: number): string => v.toFixed(2);
</script>

<template>
  <demo-page>
    <demo-section
      title="换了光源，颜色该怎么“算回去”"
      desc="眼睛会自动适应光源：钨丝灯下的白纸看起来依旧是白的。色度适应变换（CAT）就是用数学模拟这件事：在“视锥空间”里把三个响应分别按白点之比缩放（von Kries 缩放），再变换回 XYZ。不同 CAT 的区别只在于“视锥空间”怎么选。下面 24 个色块是 ColorChecker 色卡的近似 sRGB 值，每个色块用平滑函数反推出一条反射率曲线（示意，不是色卡的实测光谱），先在所选光源下用光谱计算出它的 XYZ，再用各个矩阵适应到 D65；“真实”一栏是同一反射率直接在 D65 下计算的结果，用来衡量各矩阵的误差。"
    >
      <div class="demo-controls">
        <label>
          光源
          <select v-model="sourceKey">
            <option v-for="s in SOURCES" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </label>
        <label v-if="sourceKey === 'custom'">
          色温
          <input v-model.number="cct" type="range" min="2000" max="12000" step="100">
          <span class="demo-code">{{ cct }} K</span>
        </label>
        <span class="demo-code">
          光源白点 XYZ = {{ analysis.whiteSrc.map(v => v.toFixed(4)).join(', ') }}
        </span>
      </div>
      <demo-canvas
        v-for="(panel, i) in panels"
        :key="panel.key"
        :title="panel.title"
        :width="PATCH_W"
        :height="PATCH_H"
        :draw="panelDraws[i]"
      />
    </demo-section>

    <demo-section
      title="各矩阵与“真实”相差多少（ΔE2000）"
      desc="下表统计 24 个色块：适应结果与 D65 下真实颜色的平均 / 最大色差，以及各方法与 Bradford 的平均色差（ICC 色彩管理的事实标准）。光源越偏离 D65，XYZ 缩放的误差越大；Bradford 在这组样本上通常最好。结果依赖于反推的反射率曲线，所以只是示意，换一套样本排名可能略有不同。"
    >
      <table class="cat-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>平均 ΔE vs 真实</th>
            <th>最大 ΔE vs 真实</th>
            <th>平均 ΔE vs Bradford</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in analysis.stats" :key="s.key">
            <td>
              <i class="cat-dot" :style="{background: METHOD_COLORS[s.key]}"/>
              {{ s.label }}
            </td>
            <td class="demo-code">
              {{ fixed(s.meanTruth) }}
            </td>
            <td class="demo-code">
              {{ fixed(s.maxTruth) }}
            </td>
            <td class="demo-code">
              {{ fixed(s.meanBradford) }}
            </td>
            <td>{{ CATS[i].note }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="放大看一个色块：各方法落在哪里"
      desc="选一个色块，在 xy 色度图上放大到它附近：灰点是光源下未经适应的位置（离得很远，不在图内时不显示），黑圈是真实的 D65 下的位置，彩色点是各方法适应后的位置。蓝色、紫色这类饱和度高的颜色，各矩阵之间的差异最明显。"
    >
      <div class="demo-controls">
        <label>
          色块
          <select v-model.number="patchIndex">
            <option v-for="(p, i) in PATCHES" :key="p.name" :value="i">{{ i + 1 }}. {{ p.name }}</option>
          </select>
        </label>
      </div>
      <demo-canvas :width="XY_W" :height="XY_H" :draw="zoomDraw"/>
    </demo-section>

    <demo-section
      title="“锐化”的视锥空间与负值问题"
      desc="Bradford、CAT02 把 L、M、S 三条响应曲线“锐化”（让它们更窄、重叠更少），适应效果更好；代价是它们不再对应真实的视锥，对非常饱和的颜色会算出负值（红色标出），负的“视锥响应”没有物理意义，后续计算会出问题。CAT16 的矩阵就是为了避免这一点而调整的。下表为相对 D65 白点归一化的 L / M / S（白色恒为 1 / 1 / 1）。"
    >
      <table class="cat-table">
        <thead>
          <tr>
            <th>样本</th>
            <th v-for="c in CATS" :key="c.key">
              {{ c.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cones" :key="row.label">
            <td>{{ row.label }}</td>
            <td v-for="c in CATS" :key="c.key" class="demo-code">
              <span
                v-for="(v, j) in row.values[c.key]"
                :key="j"
                :class="{'cat-negative': v < 0}"
              >{{ v.toFixed(3) }}{{ j < 2 ? ' / ' : '' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="五个矩阵（XYZ → 视锥空间）"
      desc="每个矩阵把 XYZ 变换到各自的“视锥空间”。XYZ 缩放相当于不做变换（单位矩阵）。"
    >
      <div v-for="c in CATS" :key="c.key" class="cat-matrix">
        <p>{{ c.label }}</p>
        <pre class="demo-code">{{ fmt(c.matrix) }}</pre>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cat-table {
  border-collapse: collapse;
  margin-bottom: 8px;
  background: #FFF;
  font-size: 13px;
  th,
  td {
    border: 1px solid #DDDEE4;
    padding: 6px 10px;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
}
.cat-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}
.cat-negative {
  color: #D32F2F;
  font-weight: bold;
}
.cat-matrix {
  display: inline-block;
  vertical-align: top;
  margin: 0 20px 12px 0;
  p {
    font-size: 13px;
    margin-bottom: 4px;
  }
  pre {
    background: #FFF;
    padding: 8px 10px;
    border: 1px solid #DDDEE4;
  }
}
</style>
