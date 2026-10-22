<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {DrawFn} from '../utils/spectral';
import {
  ILLUMINANTS,
  SPD_W,
  SPD_H,
  REND_W,
  REND_H,
  drawSpd,
  drawRendering
} from '../composables/illuminant';

const adapt = ref(true);

const drawSamples: DrawFn = (ctx, w, h) => {
  drawRendering(adapt.value)(ctx, w, h);
};

const spdDraws = ILLUMINANTS.map(drawSpd);
</script>

<template>
  <demo-page>
    <demo-section
      title="常见光源的光谱功率分布"
      desc="同样是“白光”，光谱可以完全不同：日光（D65）连续而平滑；钨丝灯偏向长波；荧光灯是几条汞线叠在宽带荧光粉上；LED 是一个尖锐的蓝光峰加一团黄色荧光粉。曲线下方淡淡的色带是对应波长的颜色，右上角方块是这束光本身看起来的颜色（以 D65 为参照、白点已归一化）。荧光灯与 LED 为示意曲线，不是某款真实灯具的实测数据。"
    >
      <demo-canvas
        v-for="(illum, i) in ILLUMINANTS"
        :key="illum.key"
        :width="SPD_W"
        :height="SPD_H"
        :draw="spdDraws[i]"
      />
    </demo-section>

    <demo-section
      title="同一批物体，在不同光源下的颜色"
      desc="物体颜色 = 光源光谱 × 物体反射率。光源光谱缺了某一段，反射这一段的物体就会变得暗淡或偏色，这就是同色异谱（同一个样本在不同光下看起来不同）。勾选“视觉适应”时，我们模拟人眼的色适应（Bradford 变换，把各光源的白点都拉回 D65），这时钨丝灯下的白纸看起来依旧是白的，剩下的差别才是光源光谱本身造成的；取消勾选则能看到光源原本的色偏。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="adapt" type="checkbox">
          视觉适应（Bradford → D65）
        </label>
      </div>
      <demo-canvas :width="REND_W" :height="REND_H" :draw="drawSamples"/>
    </demo-section>

    <demo-section
      title="相关色温（CCT）与显色性（CRI）不是一回事"
      desc="色温只描述光“本身是偏黄还是偏蓝”，两盏同为 5000K 的灯，一盏是连续光谱，另一盏有缺口，照出来的物体颜色会很不一样。显色性衡量的是：和相同色温的参考光（色温低于 5000K 用同色温黑体，高于 5000K 用 D65 日光）相比，样本颜色偏了多少。这里的“显色分”按 100 − 4.6 × 平均 ΔE*ab 计算，只用了 8 个示意样本，仅用来说明原理，不能当作标准 CRI（Ra）。"
    />
  </demo-page>
</template>
