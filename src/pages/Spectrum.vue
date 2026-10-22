<script setup lang="ts">
import {reactive, ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {
  SP_WIDTH,
  T_MIN,
  T_MAX,
  PRIMARY_NAMES,
  METAMER_TARGETS,
  describeWavelength,
  temperatureHex,
  temperatureXy,
  mixHex,
  defaultMixWeights,
  metamer,
  drawSpectrumBar,
  drawTemperatureStrip,
  drawPlanckPlot,
  drawMixPlot,
  drawMetamerPlots
} from '../composables/spectrum';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const state = reactive({
  temp: 6500,
  weights: defaultMixWeights(),
  target: 'bb6500'
});
const wave = ref<ReturnType<typeof describeWavelength> | null>(null);

const tempHex = computed(() => temperatureHex(state.temp));
const tempXy = computed(() => temperatureXy(state.temp));
const mixColor = computed(() => mixHex(state.weights));
const meta = computed(() => metamer(state.target));

const drawBar = (ctx: CanvasRenderingContext2D) => {
  drawSpectrumBar(ctx);
};
const drawStrip = (ctx: CanvasRenderingContext2D) => {
  drawTemperatureStrip(ctx, state.temp);
};
const drawPlanck = (ctx: CanvasRenderingContext2D) => {
  drawPlanckPlot(ctx, state.temp);
};
const drawMix = (ctx: CanvasRenderingContext2D) => {
  drawMixPlot(ctx, state.weights);
};
const drawMeta = (ctx: CanvasRenderingContext2D) => {
  drawMetamerPlots(ctx, state.target);
};

const onWavePick = ({x}: PickEvent) => {
  wave.value = describeWavelength(x);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="可见光谱"
      desc="可见光只是电磁波中很窄的一段，约 380nm（紫）到 780nm（红）。每个波长对应一种“纯”的颜色，叫单色光，两端因为人眼不敏感而逐渐变暗。点击色带查看某个波长的颜色。"
    >
      <demo-canvas
        :width="SP_WIDTH"
        :height="110"
        :draw="drawBar"
        @pick="onWavePick"
      />
      <p v-if="wave" class="demo-code">
        <span class="demo-swatch" :style="{background: wave.hex}"/>
        {{ wave.wavelength }} nm，频率约 {{ wave.thz }} THz，显示色 {{ wave.hex }}
      </p>
    </demo-section>

    <demo-section
      title="色温"
      desc="加热的物体会发光，温度越高越偏蓝白，温度越低越偏红橙，这条颜色变化的曲线就是“黑体轨迹”。色温是用黑体的温度来描述一种白光的颜色，单位是开尔文（K）。"
    >
      <div class="demo-controls">
        <label>
          色温
          <input
            v-model.number="state.temp"
            type="range"
            :min="T_MIN"
            :max="T_MAX"
            step="50"
          >
          <span>{{ state.temp }} K</span>
        </label>
        <span class="demo-swatch spectrum-swatch" :style="{background: tempHex}"/>
        <code class="demo-code">
          {{ tempHex }}，x = {{ tempXy[0].toFixed(4) }}，y = {{ tempXy[1].toFixed(4) }}
        </code>
      </div>
      <demo-canvas
        :width="SP_WIDTH"
        :height="140"
        :draw="drawStrip"
      />
      <demo-canvas
        :width="SP_WIDTH"
        :height="190"
        :draw="drawPlanck"
        title="这个温度下，黑体在各个波长上发出多少光"
      />
    </demo-section>

    <demo-section
      title="光谱混色"
      desc="显示器只用红、绿、蓝三种光，却能显示出几乎所有颜色。这里用三条很窄的谱线（630nm、532nm、467nm）代替三原色，拖动滑块调整每一条的强度。"
    >
      <div class="demo-controls">
        <label
          v-for="(name, i) in PRIMARY_NAMES"
          :key="name"
        >
          {{ name }}
          <input
            v-model.number="state.weights[i]"
            type="range"
            min="0"
            max="1"
            step="0.01"
          >
        </label>
        <span class="demo-swatch spectrum-swatch" :style="{background: mixColor}"/>
        <code class="demo-code">{{ mixColor }}</code>
      </div>
      <demo-canvas
        :width="SP_WIDTH"
        :height="190"
        :draw="drawMix"
      />
    </demo-section>

    <demo-section
      title="同色异谱"
      desc="人眼只有三种感光细胞，所以只要三种细胞受到的总刺激相同，光谱完全不同的两束光也会看起来是同一种颜色，这叫同色异谱。下面左边是一束连续光谱的白光，右边只用三条窄谱线，按解出的强度叠加，在人眼里它们是同一种颜色。"
    >
      <div class="demo-controls">
        <label>
          目标光
          <select v-model="state.target">
            <option
              v-for="t in METAMER_TARGETS"
              :key="t.key"
              :value="t.key"
            >
              {{ t.label }}
            </option>
          </select>
        </label>
      </div>
      <demo-canvas
        :width="SP_WIDTH"
        :height="190"
        :draw="drawMeta"
      />
      <div class="demo-controls">
        <span class="demo-swatch spectrum-swatch" :style="{background: meta.targetHex}"/>
        <code class="demo-code">
          连续光谱 x = {{ meta.targetXy[0].toFixed(4) }}，y = {{ meta.targetXy[1].toFixed(4) }}
        </code>
        <span class="demo-swatch spectrum-swatch" :style="{background: meta.mixHex}"/>
        <code class="demo-code">
          三条谱线 x = {{ meta.mixXy[0].toFixed(4) }}，y = {{ meta.mixXy[1].toFixed(4) }}
        </code>
        <span v-if="!meta.feasible">这三条谱线无法匹配这个目标（需要负的强度）。</span>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.demo-page .spectrum-swatch {
  width: 64px;
  height: 32px;
}
</style>
