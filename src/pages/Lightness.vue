<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  CURVE_W,
  CURVE_H,
  STEPS_W,
  STEPS_H,
  MACH_W,
  MACH_H,
  CORN_W,
  CORN_H,
  WEBER_FRACTION,
  weberRows,
  drawCurves,
  drawSteps,
  drawMach,
  drawCornsweet,
  drawCornProfile
} from '../composables/lightness';

const steps = ref(12);
const numbers = ref(true);
const inhibition = ref(0.5);
const surround = ref(14);
const cover = ref(false);

const drawLinear = drawCurves(false);
const drawLog = drawCurves(true);
const drawStepRows = drawSteps(() => steps.value, () => numbers.value);
const drawMachBands = drawMach(() => inhibition.value, () => surround.value);
const drawCorn = drawCornsweet(() => cover.value);
</script>

<template>
  <demo-page>
    <demo-section
      title="Weber–Fechner 与 Stevens：感觉随刺激怎样增长"
      desc="Weber 定律：刚好能察觉的变化 ΔI 与背景强度 I 成正比，比例（Weber 分数）在中等亮度下常被引用为约 2%。把它积分得到 Fechner 的对数律：感觉量与刺激强度的对数成正比。Stevens 则认为更接近幂函数，指数随刺激类型而变，常被引用的近似值：在暗室里看 5° 的目标约 0.33，点光源约 0.5。CIE L* 本质上也是 Y 的 1/3 次方（暗部改成线性段），sRGB 编码的整体效果约等于 2.2 次方，二者都是对这条“感觉曲线”的近似，所以均匀编码的灰阶看上去才比较均匀。每条曲线都归一到 0~1，只比较形状。"
    >
      <demo-canvas title="线性横轴" :width="CURVE_W" :height="CURVE_H" :draw="drawLinear"/>
      <demo-canvas title="对数横轴（0.001 ~ 1）" :width="CURVE_W" :height="CURVE_H" :draw="drawLog"/>
      <table class="demo-code lightness-table">
        <thead>
          <tr>
            <th>背景亮度 I</th>
            <th>刚好可察觉的 ΔI（{{ WEBER_FRACTION * 100 }}%）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in weberRows" :key="r.background">
            <td>{{ r.background }}</td>
            <td>{{ r.delta.toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="灰阶台阶：哪一排看上去最均匀"
      desc="三排灰阶都从黑到白，分成相同的级数，区别在于“等间隔”是在哪个量上取的。线性亮度等间隔时，暗部几块几乎一样黑、亮部差别很小；sRGB 编码值等间隔与 CIE L* 等间隔看上去最均匀，也最接近。拖动滑块改变级数；级数不超过 16 时才会显示数值。"
    >
      <div class="demo-controls">
        <label>
          级数
          <input v-model.number="steps" type="range" min="4" max="32" step="1">
          <span class="demo-code">{{ steps }}</span>
        </label>
        <label>
          <input v-model="numbers" type="checkbox">
          标注数值
        </label>
      </div>
      <demo-canvas :width="STEPS_W" :height="STEPS_H" :draw="drawStepRows"/>
    </demo-section>

    <demo-section
      title="马赫带：边缘处多出来的亮线和暗线"
      desc="在阶梯状的灰条交界处，亮的一侧靠近边缘的地方看上去更亮，暗的一侧更暗，实际上每一级的亮度是完全平坦的。常见的解释是视网膜上的侧抑制：一个感光细胞会被周围细胞的信号抑制。下面用“中心 − 周边”的高斯差（Difference of Gaussians）做了一个玩具模型：中心 σ = 2 像素，周边宽度和抑制强度可调；它只能示意边缘增强这个现象，不是真实视觉系统的定量模型。"
    >
      <div class="demo-controls">
        <label>
          侧抑制强度
          <input v-model.number="inhibition" type="range" min="0" max="0.9" step="0.05">
          <span class="demo-code">{{ inhibition.toFixed(2) }}</span>
        </label>
        <label>
          周边宽度 σ
          <input v-model.number="surround" type="range" min="5" max="40" step="1">
          <span class="demo-code">{{ surround }} px</span>
        </label>
      </div>
      <demo-canvas :width="MACH_W" :height="MACH_H" :draw="drawMachBands"/>
    </demo-section>

    <demo-section
      title="Craik–O’Brien–Cornsweet 错觉：只在边缘做文章"
      desc="左右两块灰其实在远离中间边缘的地方亮度完全相同，只在中央的边缘处安排了一个很短的“左边稍亮、右边稍暗”的斜坡，大脑却把整个左半视为更亮、右半更暗：它从边缘推断整块区域的明暗。勾选“盖住边缘”，用深色条遮住中间的斜坡，两侧立刻看上去一样亮。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="cover" type="checkbox">
          盖住边缘
        </label>
      </div>
      <demo-canvas :width="CORN_W" :height="CORN_H" :draw="drawCorn"/>
      <demo-canvas title="真实亮度分布" :width="CORN_W" :height="190" :draw="drawCornProfile"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.lightness-table {
  border-collapse: collapse;
  background: #FFF;
  vertical-align: top;
  margin-top: 8px;
  th,
  td {
    padding: 4px 12px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
}
</style>
