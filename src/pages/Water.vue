<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {dyeColor, waterColor} from '../utils/water';
import {
  PLOT_W,
  PLOT_H,
  STRIP_W,
  STRIP_H,
  IMG_W,
  IMG_H,
  MAX_DEPTH,
  MAX_LENGTH,
  DYE_MAX,
  DYES,
  drawAbsorption,
  drawDepthSpectrum,
  drawDepthStrip,
  drawLengthStrip,
  drawSceneOriginal,
  drawUnderwater,
  drawDyeSpectrum,
  drawDyeStrip,
  markerDepths,
  underwaterGains
} from '../composables/water';

const depth = ref(10);
const length = ref(30);
const dyeIndex = ref(0);
const conc = ref(0.5);
const compensate = ref(false);

const dye = computed(() => DYES[dyeIndex.value]);
const atDepth = computed(() => waterColor(depth.value));
const column = computed(() => waterColor(length.value));
const gains = computed(() => underwaterGains(depth.value));
const dyeSwatch = computed(() => dyeColor(dye.value, conc.value));
const markers = markerDepths();

const absorptionDraw: DrawFn = ctx => drawAbsorption(ctx, PLOT_W, PLOT_H);
const depthSpectrumDraw: DrawFn = ctx => drawDepthSpectrum(ctx, depth.value);
const depthStripDraw: DrawFn = ctx => drawDepthStrip(ctx, depth.value);
const lengthStripDraw: DrawFn = ctx => drawLengthStrip(ctx, length.value);
const sceneDraw: DrawFn = ctx => drawSceneOriginal(ctx, IMG_W, IMG_H);
const underwaterDraw: DrawFn = ctx => drawUnderwater(ctx, depth.value, compensate.value);
const dyeSpectrumDraw: DrawFn = ctx => drawDyeSpectrum(ctx, dye.value, conc.value);
const dyeStripDraw: DrawFn = ctx => drawDyeStrip(ctx, dye.value, conc.value);

const percent = (v: number): string => `${(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`;
</script>

<template>
  <demo-page>
    <demo-section
      title="纯水的吸收光谱"
      desc="水对红光的吸收比对蓝光强得多：波长 450nm 的蓝光吸收系数只有约 0.009 /m，650nm 的红光约 0.35 /m，相差近 40 倍；到了近红外更是急剧上升。光穿过 z 米水后，剩下的比例按 Beer–Lambert 定律是 exp(−a·z)。所以水是蓝（或蓝绿）的，不是因为“天空倒影”，而是红光、橙光先被水吸收掉了。吸收系数取自实测数据的近似值，只用来说明趋势。"
    >
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="absorptionDraw"/>
    </demo-section>

    <demo-section
      title="潜得越深，颜色越少"
      desc="拖动水深滑块：日光穿过 z 米水之后，红光、橙光、黄光依次被吸收掉，只剩蓝绿光。下方色条的上排把亮度调回同一水平（相当于相机自动曝光，只看色相），下排保留真实明暗。虚线标出各色光衰减掉 90% 的深度。模型只计算吸收，不计散射和海水里的悬浮物，所以只适合说明趋势。"
    >
      <div class="demo-controls">
        <label>
          水深
          <input v-model.number="depth" type="range" min="0" :max="MAX_DEPTH" step="0.5">
          <span class="demo-code">{{ depth.toFixed(1) }} m</span>
        </label>
        <span>
          自动曝光：<i class="demo-swatch" :style="{background: rgbCss(atDepth.chroma)}"/>
          <span class="demo-code">{{ rgbHex(atDepth.chroma) }}</span>
        </span>
        <span>
          真实明暗：<i class="demo-swatch" :style="{background: rgbCss(atDepth.actual)}"/>
          <span class="demo-code">{{ rgbHex(atDepth.actual) }}（亮度 {{ percent(atDepth.y) }}）</span>
        </span>
      </div>
      <p class="demo-code">
        <span v-for="m in markers" :key="m.label">{{ m.label }}：{{ m.depth.toFixed(1) }} m&emsp;</span>
      </p>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="depthSpectrumDraw"/>
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="depthStripDraw"/>
    </demo-section>

    <demo-section
      title="水下拍照：红光去哪了"
      desc="左边是水面上的场景，右边是同一场景在所选水深处的照片：每个线性通道乘以该通道的透过率，再自动曝光、加上传感器噪声。勾选“用白平衡增益补偿”相当于给红通道加红色滤镜或后期校色：红通道被放大几十倍，信号和噪声一起被放大，所以补偿后红色回来了，但画面颗粒变粗（增益上限设为 40 倍）。这也是水下摄影要用闪光灯或红色滤镜的原因。没有计入水中的散射，所以真实照片还会有一层蓝色雾气。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="compensate" type="checkbox">
          用白平衡增益补偿
        </label>
        <span class="demo-code">
          当前水深 {{ depth.toFixed(1) }} m，增益 红 ×{{ gains[0].toFixed(1) }}&emsp;绿 ×{{ gains[1].toFixed(1) }}&emsp;蓝 ×{{ gains[2].toFixed(1) }}
        </span>
      </div>
      <demo-canvas title="水面上" :width="IMG_W" :height="IMG_H" :draw="sceneDraw"/>
      <demo-canvas title="水下" :width="IMG_W" :height="IMG_H" :draw="underwaterDraw"/>
    </demo-section>

    <demo-section
      title="看一池水：水柱越长越蓝"
      desc="白色的池底透过一段水柱被看到，路径长度就是水柱的长度。几米深的游泳池看起来是淡蓝色，几十米的深潭或海是深蓝色，因为长波光走得越远被吸收得越多，剩下的只有蓝光，而且整体越来越暗。"
    >
      <div class="demo-controls">
        <label>
          水柱长度
          <input v-model.number="length" type="range" min="0" :max="MAX_LENGTH" step="0.5">
          <span class="demo-code">{{ length.toFixed(1) }} m</span>
        </label>
        <span>
          自动曝光：<i class="demo-swatch" :style="{background: rgbCss(column.chroma)}"/>
        </span>
        <span>
          真实明暗：<i class="demo-swatch" :style="{background: rgbCss(column.actual)}"/>
        </span>
      </div>
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="lengthStripDraw"/>
    </demo-section>

    <demo-section
      title="染料浓度：同样是 Beer–Lambert"
      desc="溶液的透射率是 exp(−ε(λ)·c)，浓度 c 越高，吸收越强。红色染料吸收绿光，浓度低时只吸收一点，透过的光偏粉色；浓度升高后绿光被吸得更干净，颜色变成饱和的红；再浓就连红光也被吸收，颜色变暗。这里的吸收谱是平滑的示意曲线，不是某种真实染料的测量值。"
    >
      <div class="demo-controls">
        <label>
          染料
          <select v-model.number="dyeIndex">
            <option v-for="(d, i) in DYES" :key="d.key" :value="i">{{ d.label }}</option>
          </select>
        </label>
        <label>
          浓度
          <input v-model.number="conc" type="range" min="0" :max="DYE_MAX" step="0.01">
          <span class="demo-code">{{ conc.toFixed(2) }}</span>
        </label>
        <span>
          <i class="demo-swatch" :style="{background: rgbCss(dyeSwatch)}"/>
          <span class="demo-code">{{ rgbHex(dyeSwatch) }}</span>
        </span>
      </div>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="dyeSpectrumDraw"/>
      <demo-canvas :width="STRIP_W" :height="120" :draw="dyeStripDraw"/>
    </demo-section>
  </demo-page>
</template>
