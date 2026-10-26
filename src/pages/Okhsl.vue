<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  PLANE,
  RING_W,
  RING_H,
  STRIP_W,
  STRIP_H,
  PLOT_W,
  PLOT_H,
  METHODS,
  drawPlane,
  drawRing,
  drawStrips,
  labPlot,
  oklabPlot,
  chromaPlot
} from '../composables/okhsl';

const hue = ref(264);
const sat = ref(1);
</script>

<template>
  <demo-page>
    <demo-section
      title="Okhsl 与 Okhsv：建在 OKLab 上的 HSL、HSV"
      desc="HSL 的“亮度 L”只是 RGB 的数学平均，不对应人眼的明暗；HSLuv 把亮度换成了 CIE 的 L*，但色相和饱和度还是建在 CIELUV 上。Okhsl / Okhsv 是 Björn Ottosson 2021 年提出的替代方案：先在 OKLab 里找出 sRGB 色域的边界（每个色相上色度最大的“尖点”），再把 s = 0…1 映射到“从灰色到色域边界”，把 l 通过 toe 函数换算成接近 L* 的感知亮度。下面用同一个色相，把几种定义放在一起对比。"
    >
      <div class="demo-controls">
        <label>
          色相（度）
          <input type="range" min="0" max="359" step="1" v-model.number="hue">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <label>
          饱和度（用于下面的色环和曲线）
          <input type="range" min="0.1" max="1" step="0.05" v-model.number="sat">
          <span class="demo-code">{{ sat.toFixed(2) }}</span>
        </label>
      </div>
    </demo-section>

    <demo-section
      title="S × L 平面：亮度、饱和度怎么铺满一个方块"
      desc="横轴是饱和度 0→1，纵轴是亮度 1→0，色相固定。HSL 的平面里纯色在 L = 50% 的位置，视觉上是否明亮取决于色相；HSLuv 的上下方向严格按 CIE L* 排列；Okhsl 的顶部是白、底部是黑，纯色位置随色相而变，因为色域的尖点在哪里本来就取决于色相。注意色相角的含义不同：HSL / HSLuv 的 264° 与 Okhsl 的 264° 并不是同一个蓝。"
    >
      <demo-canvas
        v-for="item in METHODS"
        :key="item.kind"
        :title="`${item.label}（横轴 S，纵轴 L）`"
        :width="PLANE"
        :height="PLANE"
        :draw="drawPlane(item.kind, hue)"
      />
    </demo-section>

    <demo-section
      title="S × V 平面：HSV 与 Okhsv"
      desc="HSV 的 V = 1 一行是“当前色相下最亮的颜色”，不同色相的实际明暗差别很大。Okhsv 同样让 V = 1 的一行是该色相能达到的最亮颜色，但在换算时补偿了 toe 函数和色域顶部的弯曲，所以两张图的纵向明暗分布并不相同。"
    >
      <demo-canvas title="HSV（横轴 S，纵轴 V）" :width="PLANE" :height="PLANE" :draw="drawPlane('hsv', hue)"/>
      <demo-canvas title="Okhsv（横轴 S，纵轴 V）" :width="PLANE" :height="PLANE" :draw="drawPlane('okhsv', hue)"/>
    </demo-section>

    <demo-section
      title="12 个色相：同样的“L = 50%”，看起来一样亮吗"
      desc="每个色环的色相取 0°、30°…330°，亮度 l = 0.5，饱和度由上面的滑块决定。下方两排柱状图分别是每个颜色的 Lab L*（CIE 感知亮度）和 OKLab L。HSL 的各色明暗差别很大（黄 97，蓝 32）；HSLuv 在 Lab L* 上完全一致，所以第一排是平的；Okhsl 在 OKLab L 上几乎一致（第二排是平的），在 Lab L* 上有几个点的偏差（约 45 到 52），因为 Okhsl 的“亮度”基准是 OKLab 而不是 CIE Lab。"
    >
      <demo-canvas
        v-for="item in METHODS"
        :key="item.kind"
        :title="item.label"
        :width="RING_W"
        :height="RING_H"
        :draw="drawRing(item.kind, sat)"
      />
    </demo-section>

    <demo-section
      title="扫过全部色相：颜色条与曲线"
      desc="三条色带是 l = 0.5 时色相从 0° 扫到 360°（注意三者的色相起点不同）。下面三张曲线图把每个色相的亮度和色度画出来：HSL 的亮度起伏最大；HSLuv 在 Lab L* 上是一条直线，Okhsl 在 OKLab L 上是一条直线。第三张图是 OKLCH 色度：在 s = 0.8 以内，Okhsl 的色度曲线比 HSLuv 平滑（相邻色相的变化更连续）；到 s = 1，两者都贴着色域边界，曲线上都有明显的拐点，那是 sRGB 色域本身的角。"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawStrips(sat)"/>
      <div>
        <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="labPlot(sat)"/>
        <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="oklabPlot(sat)"/>
        <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="chromaPlot(sat)"/>
      </div>
    </demo-section>

    <demo-section
      title="为什么要有 Okhsl，以及它的代价"
      desc="好处：色相角取自 OKLab，它的设计目标之一就是让色相在亮度、饱和度变化时更稳定；s 在 0 到 0.8 之间，色度随色相的变化比 HSLuv 平滑（见上面的色度曲线）；亮度经 toe 函数换算后接近 CIE 的 L*。代价：算法更复杂（用多项式近似加一步 Halley 迭代求色域尖点，s = 1 的点离色域边界不到一个 8 位色阶）；只针对 sRGB 色域计算，换成 P3、Rec.2020 需要重新推导；s = 1 仍然不等于“最鲜艳的颜色”，只是该亮度下色域的边界。本页的算法按作者开源的参考实现（MIT 许可，ok_color.h）移植为 TypeScript。"
    />
  </demo-page>
</template>
