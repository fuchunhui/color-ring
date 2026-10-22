<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {photopicShare, nightGain} from '../utils/vision';
import {
  LUM_W,
  LUM_H,
  SCENE_W,
  SCENE_H,
  LEVELS,
  PURKINJE_W,
  PURKINJE_H,
  swatchStats,
  drawLuminosity,
  drawNight,
  drawPurkinje
} from '../composables/scotopic';

const logLum = ref(0);
const lum = computed(() => 10 ** logLum.value);
const share = computed(() => Math.round(photopicShare(lum.value) * 100));
const gain = computed(() => nightGain(lum.value).toFixed(2));

const drawOriginal = drawNight(() => null);
const drawCurrent = drawNight(() => lum.value);
const fixed = LEVELS.map(l => ({...l, draw: drawNight(() => l.lum)}));

const stats = swatchStats.map(s => ({
  name: s.name,
  photopic: s.photopic.toFixed(4),
  scotopic: s.scotopic.toFixed(4)
}));
</script>

<template>
  <demo-page>
    <demo-section
      title="两种光视效率曲线：明视觉与暗视觉"
      desc="视网膜上有两类感光细胞：视锥细胞在明亮环境下工作，负责颜色，对 555nm 的黄绿光最敏感；视杆细胞在昏暗环境下工作，只有一种，所以不能分辨颜色，对 507nm 的蓝绿光最敏感。两条曲线之间的差别，就是下面的浦肯野效应的来源。V(λ) 来自本项目的 CIE 1931 ȳ 拟合，V′(λ) 取 CIE 1951 标准表（10nm 间隔，线性插值）。"
    >
      <demo-canvas :width="LUM_W" :height="LUM_H" :draw="drawLuminosity"/>
    </demo-section>

    <demo-section
      title="夜视模拟：从白天走进星光"
      desc="拖动滑块改变适应亮度。亮度较高时视锥主导，颜色正常；降到约 3 cd/m² 以下进入中间视觉，颜色逐渐变淡；低于约 0.01 cd/m² 只剩视杆，画面变成偏蓝灰的单色，红色几乎看不见。这是一个简化模型：用 Kirk 和 O’Brien（2011）的公式由 XYZ 估算暗视觉亮度，再按适应亮度在“原色”和“蓝灰色”之间混合，并施加亮度增益 (L/100)^0.25，只用于示意，不是精确的视觉模型。"
    >
      <div class="demo-controls">
        <label>
          适应亮度
          <input v-model.number="logLum" type="range" min="-3" max="2" step="0.1">
          <span class="demo-code">{{ lum.toPrecision(2) }} cd/m²</span>
        </label>
        <span class="demo-code">明视觉占比 {{ share }}%</span>
        <span class="demo-code">亮度增益 {{ gain }}</span>
      </div>
      <demo-canvas title="原图" :width="SCENE_W" :height="SCENE_H" :draw="drawOriginal"/>
      <demo-canvas title="滑块所在亮度" :width="SCENE_W" :height="SCENE_H" :draw="drawCurrent"/>
      <demo-canvas
        v-for="l in fixed"
        :key="l.label"
        :title="l.label"
        :width="SCENE_W"
        :height="SCENE_H"
        :draw="l.draw"
      />
    </demo-section>

    <demo-section
      title="浦肯野效应：红色变黑，蓝色还亮"
      desc="下面的红色和蓝色在白天的亮度完全相同。随着环境变暗，视觉从视锥转向视杆，视杆对红光几乎不敏感，对蓝光仍然敏感，所以红色先暗下去，蓝色相对显亮。这也是为什么夜间驾驶舱和天文观测常用红光照明：红光几乎不刺激视杆，不会破坏已经形成的暗适应。"
    >
      <demo-canvas :width="PURKINJE_W" :height="PURKINJE_H" :draw="drawPurkinje"/>
      <table class="demo-code">
        <thead>
          <tr>
            <th>色块</th>
            <th>明视觉亮度 Y</th>
            <th>相对暗视觉亮度（白 = 1）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in stats" :key="s.name">
            <td>{{ s.name }}</td>
            <td>{{ s.photopic }}</td>
            <td>{{ s.scotopic }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>
