<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  PIGMENT_W,
  PIGMENT_H,
  KS_H,
  STRIP_W,
  STRIP_H,
  MIX_W,
  MIX_H,
  TINT_H,
  TINTABLE,
  drawPigments,
  drawKs,
  drawBlueYellowStrips,
  drawBlueYellowSpectra,
  drawTintStrips,
  mixReadout
} from '../composables/kubelka';

const blue = ref(50);
const tintKey = ref('blue');

const weight = () => blue.value / 100;

const drawSpectra = drawBlueYellowSpectra(weight);
const drawTint = drawTintStrips(() => tintKey.value);
const readout = computed(() => mixReadout(weight()));
</script>

<template>
  <demo-page>
    <demo-section
      title="颜料的吸收 K 与散射 S"
      desc="Kubelka–Munk 理论（1931）把一层颜料涂层看成两个量：吸收系数 K（吸走多少光）和散射系数 S（把光反弹回来多少）。对一层足够厚、不透明的涂层，反射率 R∞ = 1 + K/S − √((K/S)² + 2K/S)：K/S 越大，涂层越暗；K/S 为 0 时是纯白。下面五种颜料的 K、S 曲线都是我用平滑函数编的示意曲线，不是某种真实颜料的测量值：钛白几乎不吸收但散射很强，炭黑吸收极强，蓝、黄、红颜料各自吸收一段波长。颜色方块是它们在 D65 日光下的样子。"
    >
      <demo-canvas :width="PIGMENT_W" :height="PIGMENT_H" :draw="drawPigments"/>
      <demo-canvas :width="PIGMENT_W" :height="KS_H" :draw="drawKs"/>
    </demo-section>

    <demo-section
      title="蓝颜料 + 黄颜料：Kubelka–Munk vs 其他近似"
      desc="混合颜料时，K 和 S 各自按浓度线性相加：K混 = Σ c·K，S混 = Σ c·S，再由 K混/S混 算出混合后的反射率。这比“把两条反射率曲线按几何平均相乘”更符合颜料的物理，也远好于只看 RGB 三个数的平均（RGB 里蓝加黄的中点是灰色）。蓝颜料在青绿波段仍有反射，黄颜料在绿以上都反射，二者重叠的绿波段就是混合后留下来的颜色，所以得到绿色。拖动滑块看三种方法的差别。"
    >
      <div class="demo-controls">
        <label>
          蓝颜料占比
          <input v-model.number="blue" type="range" min="0" max="100" step="5">
          <span class="demo-code">蓝 {{ blue }}% / 黄 {{ 100 - blue }}%</span>
        </label>
      </div>
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawBlueYellowStrips"/>
      <demo-canvas :width="MIX_W" :height="MIX_H" :draw="drawSpectra"/>
      <div class="demo-code">
        <div v-for="item in readout" :key="item.name">
          {{ item.name }}：{{ item.hex }}
        </div>
      </div>
    </demo-section>

    <demo-section
      title="加白：调淡颜料"
      desc="往颜料里加钛白，画家叫“调淡”。钛白的散射 S 很大，所以只要加一点，混合物的 S 就被大幅抬高，K/S 迅速下降，颜色很快变浅；而且因为各波长的 K 变化不同，色相也会略有偏移。这是 K–M 里“K 和 S 分别线性相加”的直接后果，和 RGB 数值的线性插值（下面一行）明显不同。"
    >
      <div class="demo-controls">
        <label>
          颜料
          <select v-model="tintKey">
            <option v-for="item in TINTABLE" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
      </div>
      <demo-canvas :width="STRIP_W" :height="TINT_H" :draw="drawTint"/>
    </demo-section>

    <demo-section
      title="这个模型的假设"
      desc="这里用的是最简单的双流（two-flux）不透明涂层模型：涂层足够厚、不透明；不考虑涂层表面的镜面反射（真实还要做 Saunderson 修正）；浓度按体积简单相加；颜料颗粒大小分布和分散状态都被忽略。真实颜料的 K、S 要用不同厚度、不同浓度的样品实测，并且会随浓度出现偏离。尽管如此，它已经解释了画家的经验：为什么蓝加黄得到绿，为什么红、黄、蓝三种颜料能调出很多颜色，为什么加白会快速变浅。艺术家用颜料混色之所以是“减色”，是因为每种颜料都在吸收光，混得越多被吸掉的光越多，颜色越暗。"
    />
  </demo-page>
</template>
