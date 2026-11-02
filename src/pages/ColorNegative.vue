<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {DYE_MATRIX, D_MAX, GAMMA, baseDensity, baseRgb, midSlopes, grayCast} from '../utils/colornegative';
import type {PrintMode} from '../utils/colornegative';
import {
  SCENE_W,
  SCENE_H,
  SCENE_BYTES,
  CURVE_W,
  CURVE_H,
  negativeBytes,
  printBytes,
  drawScene,
  drawCurves
} from '../composables/colornegative';

const hex = (rgb: number[]): string => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

// ---------- 第一部分：特性曲线 ----------
const curveMask = ref(100);
const curveSlopes = computed(() => midSlopes(curveMask.value / 100));
const curveBase = computed(() => baseRgb(curveMask.value / 100));
const curveBaseDensity = computed(() => baseDensity(curveMask.value / 100));
const drawCurve = drawCurves(() => curveMask.value / 100);

// ---------- 第二部分：同一幅画面 ----------
const NEG_PLAIN = computed(() => negativeBytes(0));
const NEG_MASKED = computed(() => negativeBytes(1));
const printPlainBase = computed(() => printBytes(0, 'base', 0));
const printPlainMatrix = computed(() => printBytes(0, 'matrix', 0));
const printMaskedInvert = computed(() => printBytes(1, 'invert', 1));
const printMaskedBase = computed(() => printBytes(1, 'base', 1));
const printMaskedMatrix = computed(() => printBytes(1, 'matrix', 1));

const drawOriginal = drawScene(() => SCENE_BYTES);
const drawNegPlain = drawScene(() => NEG_PLAIN.value);
const drawNegMasked = drawScene(() => NEG_MASKED.value);
const drawPlainBase = drawScene(() => printPlainBase.value);
const drawPlainMatrix = drawScene(() => printPlainMatrix.value);
const drawMaskedInvert = drawScene(() => printMaskedInvert.value);
const drawMaskedBase = drawScene(() => printMaskedBase.value);
const drawMaskedMatrix = drawScene(() => printMaskedMatrix.value);

const casts = computed(() => [
  {label: '无橙罩 · 取片基白点', value: grayCast(0, 'base', 0)},
  {label: '无橙罩 · 取片基白点 + 3×3', value: grayCast(0, 'matrix', 0)},
  {label: '有橙罩 · 直接反相', value: grayCast(1, 'invert', 1)},
  {label: '有橙罩 · 取片基白点', value: grayCast(1, 'base', 1)},
  {label: '有橙罩 · 取片基白点 + 3×3', value: grayCast(1, 'matrix', 1)}
]);

// ---------- 第三部分：橙罩浓度不对 ----------
const filmMask = ref(60);
const realBase = ref(false);
const mode = ref<PrintMode>('matrix');

const filmM = computed(() => filmMask.value / 100);
const assumedM = computed(() => (realBase.value ? filmM.value : 1));
const negBytes3 = computed(() => negativeBytes(filmM.value));
const printBytes3 = computed(() => printBytes(filmM.value, mode.value, assumedM.value));
const drawNeg3 = drawScene(() => negBytes3.value);
const drawPrint3 = drawScene(() => printBytes3.value);
const actualBase = computed(() => baseRgb(filmM.value));
const assumedBase = computed(() => baseRgb(assumedM.value));
const cast3 = computed(() => grayCast(filmM.value, mode.value, assumedM.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="一层染料为什么会带来色偏"
      :desc="`彩色负片有三层乳剂，分别记录红、绿、蓝光，曝光后各自生成青、品红、黄三种染料。每层染料的密度随曝光量变化的曲线叫特性曲线（H&D 曲线），这里用 S 形：D = ${D_MAX} / (1 + e^(−k·(x − x0)))，x 是曝光量的 log10，18% 灰放在曲线中点，中段斜率 γ 取 ${GAMMA}（彩色负片大致在 0.6 到 0.7）。理想的染料只吸收自己那一段光，实际上青染料也吸一点绿，品红染料也吸不少蓝。下面是我编的多余吸收矩阵（示意，不是柯达或富士的数据），行是测量用的红绿蓝光，列是青、品红、黄染料每 1.0 密度的吸收：`"
    >
      <table class="cn-table">
        <thead>
          <tr>
            <th/>
            <th>青</th>
            <th>品红</th>
            <th>黄</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, k) in DYE_MATRIX" :key="k">
            <th>{{ ['R 光', 'G 光', 'B 光'][k] }}</th>
            <td v-for="(v, j) in row" :key="j" :class="{'cn-main': k === j, 'cn-side': k !== j && v >= 0.1}">
              {{ v.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        抵消的办法是在乳剂里加带颜色的耦合剂。品红层里加一种黄色耦合剂（吸蓝），青层里加一种粉红色耦合剂（吸绿）。哪里生成了染料，哪里的耦合剂就被消耗掉，没生成的地方耦合剂保留。于是品红染料多吸的蓝光，刚好被少掉的那部分黄色耦合剂抵消；青染料多吸的绿光同理。所以没曝光的地方（片基）颜色最深，是黄加粉红叠成的橙色；曝光越多，橙色越淡。下面拖动橙罩浓度：100% 表示耦合剂的量恰好抵消，0% 是没有耦合剂。图中是中性灰经过胶片后在红、绿、蓝光下的测量密度，三条线越平行，灰就越不容易偏色。
      </p>
      <div class="demo-controls">
        <label>
          橙罩浓度
          <input v-model.number="curveMask" type="range" min="0" max="150" step="5">
          <span class="demo-code">{{ curveMask }}%</span>
        </label>
        <span>
          片基颜色
          <span class="demo-swatch" :style="{background: hex(curveBase)}"/>
          <span class="demo-code">{{ hex(curveBase) }}</span>
        </span>
        <span class="demo-code">
          片基密度 R {{ curveBaseDensity[0].toFixed(2) }} / G {{ curveBaseDensity[1].toFixed(2) }} / B {{ curveBaseDensity[2].toFixed(2) }}
        </span>
      </div>
      <demo-canvas :width="CURVE_W" :height="CURVE_H" :draw="drawCurve"/>
      <p class="demo-section-desc">
        18% 灰附近三条线的斜率：R {{ curveSlopes[0].toFixed(2) }}，G {{ curveSlopes[1].toFixed(2) }}，B {{ curveSlopes[2].toFixed(2) }}。
        橙罩为 0% 时 G、B 的斜率明显比 R 大（多出来的是青染料吸绿、品红染料吸蓝），灰阶会随明暗偏色；100% 时三个数几乎相等；超过 100% 又反过来偏小。G 和 B 的起点（曲线左端）比 R 高，就是片基上那层橙色。
      </p>
    </demo-section>

    <demo-section
      title="同一幅画面：没有橙罩的胶片 vs 有橙罩的胶片"
      desc="用同一幅程序生成的画面（天空、树叶、肤色、灰阶条、24 色块）去曝光两种假想的胶片，再各用几种方法还原成正像。负片是把透过率直接当作灯箱上的亮度显示出来。「直接反相」是把扫描图的每个码值取 255 减去它，就是修图软件里的反相。「取片基白点」是先量片基的密度，从整张图的密度里扣掉，再沿特性曲线倒推曝光量；有橙罩的片子这一步就把橙色去掉了。「+3×3」是再用一个 3×3 矩阵把剩下的多余吸收反解出来。最后一种假设知道染料矩阵，这在实际扫描软件里要靠校准得到，不是现成的数字。"
    >
      <div class="cn-row">
        <demo-canvas title="原画面" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      </div>
      <div class="cn-row">
        <demo-canvas title="没有橙罩：负片" :width="SCENE_W" :height="SCENE_H" :draw="drawNegPlain"/>
        <demo-canvas title="取片基白点" :width="SCENE_W" :height="SCENE_H" :draw="drawPlainBase"/>
        <demo-canvas title="取片基白点 + 3×3" :width="SCENE_W" :height="SCENE_H" :draw="drawPlainMatrix"/>
      </div>
      <div class="cn-row">
        <demo-canvas title="有橙罩：负片" :width="SCENE_W" :height="SCENE_H" :draw="drawNegMasked"/>
        <demo-canvas title="直接反相" :width="SCENE_W" :height="SCENE_H" :draw="drawMaskedInvert"/>
        <demo-canvas title="取片基白点" :width="SCENE_W" :height="SCENE_H" :draw="drawMaskedBase"/>
        <demo-canvas title="取片基白点 + 3×3" :width="SCENE_W" :height="SCENE_H" :draw="drawMaskedMatrix"/>
      </div>
      <table class="cn-table">
        <thead>
          <tr>
            <th>做法</th>
            <th>灰阶平均色度 C*</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in casts" :key="item.label">
            <td>{{ item.label }}</td>
            <td class="cn-num">
              {{ item.value.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        C* 是把 6 档中性灰（4% 到 90% 反射率）走完整个流程，在 CIELAB 里量出的平均色度，越接近 0 越中性。没有橙罩的胶片，只取片基白点还原出来的灰阶偏色明显；有橙罩时同样的操作偏色小得多，因为胶片已经把大部分多余吸收抵消了。直接反相的灰阶偏色也不小，原因是它没有处理片基。加上 3×3 之后两种胶片都还原到 0，这是因为这里的还原用的就是造这张底片时用的矩阵，现实里做不到这么准。暗部和亮部在曲线的趾部和肩部被截断，色块的饱和度也会掉，这是 S 形曲线本身的压缩，不是色偏。
      </p>
    </demo-section>

    <demo-section
      title="橙罩浓度不对，或片基取错了会怎样"
      desc="扫描软件通常要先在片基（胶片边缘没曝光的那条）上点一下取白点。这里让胶片的实际橙罩浓度可以拖动，扫描时有两种假设：按实际片基取白点，或者偷懒地按「标准橙罩 100%」去算。后者在胶片浓度刚好是 100% 时没有问题，不一样时整张图会带上一层偏色。胶片的橙罩比标准值淡时，按标准值去扣会多扣，G、B 的密度被算少了，画面偏红黄；比标准值浓时少扣，画面偏蓝。"
    >
      <div class="demo-controls">
        <label>
          胶片的橙罩浓度
          <input v-model.number="filmMask" type="range" min="0" max="150" step="5">
          <span class="demo-code">{{ filmMask }}%</span>
        </label>
        <label>
          <input v-model="realBase" type="checkbox">
          按实际片基取白点
        </label>
        <label>
          还原方式
          <select v-model="mode">
            <option value="base">
              取片基白点
            </option>
            <option value="matrix">
              取片基白点 + 3×3
            </option>
          </select>
        </label>
      </div>
      <div class="demo-controls">
        <span>
          实际片基
          <span class="demo-swatch" :style="{background: hex(actualBase)}"/>
          <span class="demo-code">{{ hex(actualBase) }}</span>
        </span>
        <span>
          扫描时假设的片基
          <span class="demo-swatch" :style="{background: hex(assumedBase)}"/>
          <span class="demo-code">{{ hex(assumedBase) }}</span>
        </span>
        <span class="demo-code">灰阶平均色度 C* = {{ cast3.toFixed(2) }}</span>
      </div>
      <div class="cn-row">
        <demo-canvas title="负片" :width="SCENE_W" :height="SCENE_H" :draw="drawNeg3"/>
        <demo-canvas title="还原后的正像" :width="SCENE_W" :height="SCENE_H" :draw="drawPrint3"/>
        <demo-canvas title="原画面" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      </div>
      <p class="demo-section-desc">
        勾选「按实际片基取白点」并选 3×3，无论橙罩多少，灰阶都能还原，C* 为 0。不勾选时，橙罩不是 100% 就会偏色，而且不管选哪种还原方式都是这样。真实情况比这里复杂：三层的曲线形状并不完全一样，染料光谱是连续的而不是三个数，扫描光源和感光元件也有自己的响应，所以这里只能说明偏色从哪里来，数值不能拿去校准真实的底片。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
}
.cn-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 4px 14px;
    border: 1px solid #DDDEE4;
    text-align: center;
    background: #FFF;
  }
  th {
    background: #F5F6FA;
    font-weight: 500;
  }
  td:first-child {
    text-align: left;
  }
  .cn-main {
    background: #F1F7FF;
  }
  .cn-side {
    background: #FFF4E0;
  }
  .cn-num {
    text-align: right;
    font-family: Consolas, menlo, monaco, monospace;
  }
}
</style>
