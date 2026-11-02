<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {gridStats} from '../utils/skincolor';
import type {SkinParams} from '../utils/skincolor';
import {rgbCss} from '../utils/spectral';
import {
  SPEC_W,
  SPEC_H,
  GRID_W,
  GRID_H,
  SCOPE_W,
  SCOPE_H,
  SKIN_LINE,
  LIGHT_W,
  LIGHT_H,
  SPD_W,
  SPD_H,
  OXI_W,
  OXI_H,
  MELANIN_PRESETS,
  drawSpectrum,
  drawGrid,
  drawScope,
  drawLights,
  drawLightSpd,
  drawOximeter,
  swatchOf
} from '../composables/skincolor';

const melanin = ref(14);
const blood = ref(2);
const sat = ref(97);
const adapt = ref(false);

const params = computed<SkinParams>(() => ({
  melanin: melanin.value / 100,
  blood: blood.value / 100,
  sat: sat.value / 100
}));

const drawSpec = drawSpectrum(() => params.value);
const drawGridCanvas = drawGrid(() => sat.value / 100);
const drawScopeCanvas = drawScope(() => sat.value / 100, () => params.value);
const drawLightCanvas = drawLights(() => params.value, () => adapt.value);
const drawOxi = drawOximeter(() => sat.value / 100);

const stats = computed(() => gridStats(sat.value / 100));
const ratio = (a: number, b: number): string => (a / b).toFixed(1);

const presets = computed(() => MELANIN_PRESETS.map(m => ({
  value: m,
  color: rgbCss(swatchOf(m, blood.value, sat.value / 100))
})));
</script>

<template>
  <demo-page>
    <demo-section
      title="皮肤的颜色是怎么来的：两种色素加一层散射"
      desc="模型把皮肤简化成两层。上层是表皮，含黑色素，光进去、出来各穿过一次，所以透过率要平方：T² = exp(−2·f·μa·d)，黑色素的吸收系数取幂律 μa = 6.6×10¹¹·λ^−3.33 cm⁻¹（λ 单位 nm，近似），厚度 d = 60 µm，f 是黑色素体积分数。下层是真皮，血液只占体积的一小部分，吸收来自氧合与还原两种血红蛋白（全血 μa = 2.303·ε·150 g/L ÷ 64500 g/mol），真皮本身散射很强，用 Kubelka–Munk 理论算漫反射率 R∞：K = 血容量 × 血液吸收 + (1 − 血容量) × 底色吸收，S 随波长缓慢下降。最后再加上表面约 4% 的反射。血红蛋白的消光系数取自公开表格的粗略值，误差可达 ±15%，其余常数同样是近似，所以这是示意模型，不是测量数据，也不能用来推断某个人的肤色。"
    >
      <div class="demo-controls">
        <label>
          黑色素
          <input v-model.number="melanin" type="range" min="1" max="40" step="0.5">
          <span class="demo-code">{{ melanin }}%</span>
        </label>
        <label>
          血容量
          <input v-model.number="blood" type="range" min="0.2" max="6" step="0.1">
          <span class="demo-code">{{ blood }}%</span>
        </label>
        <label>
          血氧饱和度
          <input v-model.number="sat" type="range" min="50" max="100" step="1">
          <span class="demo-code">{{ sat }}%</span>
        </label>
      </div>
      <div class="demo-controls">
        <span>黑色素预设：</span>
        <color-button v-for="item in presets" :key="item.value" @click="melanin = item.value">
          <span class="skin-chip" :style="{background: item.color}"/>{{ item.value }}%
        </color-button>
      </div>
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpec"/>
      <p class="skin-note">
        黑色素在短波端吸收得多（幂律随波长迅速下降），蓝光先被吃掉，红光损失较少，所以黑色素越多，曲线整体越低，也越向红端倾斜。血红蛋白在 415 nm 附近的 Soret 带吸收最强；氧合血红蛋白在 542 和 577 nm 有两个吸收峰，还原血红蛋白只在 555 nm 附近有一个宽峰，把血氧调低，这两个凹口会合并成一个。
      </p>
    </demo-section>

    <demo-section
      title="黑色素 × 血容量：颜色落在一条带上"
      desc="左边是黑色素（横）和血容量（纵）两个量各取几档，在 D65 下渲染出来的颜色。右边是矢量示波器：横轴 Cb、纵轴 Cr，按 Rec.709 对 sRGB 编码值计算，离中心越远越鲜艳，角度表示色相。调色师常说各种肤色都落在一条经验线附近，通常取 123° 左右，称为肤色线，它是经验说法，不是定律。血氧用上面的滑块。"
    >
      <demo-canvas :width="GRID_W" :height="GRID_H" :draw="drawGridCanvas"/>
      <demo-canvas :width="SCOPE_W" :height="SCOPE_H" :draw="drawScopeCanvas"/>
      <p class="skin-note">
        在这张网格里（Y 是线性亮度，完全漫反射白 = 1）：血容量 2% 时，黑色素从 1.5% 增加到 40%，Y 从 {{ stats.yMelanin[0].toFixed(2) }} 降到 {{ stats.yMelanin[1].toFixed(2) }}，相差 {{ ratio(stats.yMelanin[0], stats.yMelanin[1]) }} 倍；黑色素 10% 时，血容量从 0.5% 增加到 6%，Y 从 {{ stats.yBlood[0].toFixed(2) }} 变到 {{ stats.yBlood[1].toFixed(2) }}，只相差 {{ ratio(stats.yBlood[0], stats.yBlood[1]) }} 倍。48 个点里色度不太小的有 {{ stats.counted }} 个，它们在示波器上的角度落在 {{ stats.angleMin.toFixed(0) }}° 到 {{ stats.angleMax.toFixed(0) }}° 之间，常用的肤色线在 {{ SKIN_LINE }}°。模型很粗略，角度只能和经验线对个大概，不要当作精确结论。
      </p>
    </demo-section>

    <demo-section
      title="同一块皮肤，换一盏灯"
      desc="皮肤的反射率不变，只换光源。光源的光谱是示意：钨丝灯按 2856 K 黑体，白光 LED 按“蓝光芯片 + 黄色荧光粉”，最后一盏把 610 nm 以上的光几乎拿掉。勾选“眼睛已适应光源”后，用 Bradford 变换把光源白点换回 D65 白，这时剩下的差别来自光源光谱本身，而不是整体偏黄或偏蓝。ΔE2000 是和 D65 下同一块皮肤的色差，大于等于 3 用橙色标出。在默认设置下勾选适应后，钨丝灯约 3 到 5，冷白 LED 不到 2，缺红光的 LED 约 9 到 11。皮肤主要靠红端的反射把颜色拉出来，红端没有光，色彩就很难还原。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="adapt" type="checkbox">
          眼睛已适应光源（Bradford 换回 D65 白）
        </label>
      </div>
      <demo-canvas :width="LIGHT_W" :height="LIGHT_H" :draw="drawLightCanvas"/>
      <demo-canvas :width="SPD_W" :height="SPD_H" :draw="drawLightSpd"/>
    </demo-section>

    <demo-section
      title="血氧仪为什么用红光和红外光"
      desc="两种血红蛋白的吸收曲线在 660 nm 差约 10 倍，还原的更强；在 940 nm 反过来，氧合的稍强（约 1.75 倍）；约 800 nm 附近两条线相交，那里吸收相等。指夹式血氧仪交替发出这两个波长的光，测动脉搏动引起的吸光度变化，再取比值。比值随血氧饱和度单调变化（右图只用两种血红蛋白算，没有考虑组织散射），真实仪器用经验标定曲线把比值换算成血氧。血红蛋白数据同样是粗略值。"
    >
      <demo-canvas :width="OXI_W" :height="OXI_H" :draw="drawOxi"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.skin-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
.skin-chip {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  vertical-align: -3px;
}
</style>
