<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import {rgbToLab} from '../utils/space';
import {deltaE2000} from '../utils/deltae';
import {
  BANDS,
  BAND_MEASURE_Y0,
  BAND_MEASURE_Y1,
  coneSpacing,
  regionMeanRgb,
  simulate
} from '../utils/conemosaic';
import {
  MAIN_SIZE,
  MAIN_PPA,
  GRATING_SIZE,
  GRATING_ECCS,
  CLASS_COLORS,
  getMainScene,
  getBandScene,
  getGratingScene,
  drawSceneBytes,
  drawResult,
  drawMosaic
} from '../composables/conemosaic';

const ecc = ref(0);
const lmLog = ref(1);
const sPercent = ref(7);
const hole = ref(true);
const optics = ref(0.15);
const seed = ref(1);
const period = ref(2);

const lmRatio = computed(() => 2 ** lmLog.value);
const UM_PER_ARCMIN = 4.8;

const mainSim = computed(() => simulate(getMainScene(), {
  ecc: ecc.value,
  lmRatio: lmRatio.value,
  sFraction: sPercent.value / 100,
  hole: hole.value,
  optics: optics.value,
  seed: seed.value
}));

const spacing = computed(() => coneSpacing(ecc.value));
const counts = computed(() => mainSim.value.mosaic.counts);
const rods = computed(() => mainSim.value.mosaic.rodX.length);

const drawOriginal = drawSceneBytes(getMainScene);
const drawMosaicCanvas = drawMosaic(() => mainSim.value, () => ecc.value, () => hole.value);
const drawRecon = drawResult(() => mainSim.value, MAIN_SIZE);

// ---------- L:M 比例 ----------

const RATIO_ECC = 2;
const RATIOS = [1, 4, 16];

const ratioSims = computed(() => RATIOS.map(r => simulate(getBandScene(), {
  ecc: RATIO_ECC,
  lmRatio: r,
  sFraction: sPercent.value / 100,
  hole: hole.value,
  optics: optics.value,
  seed: seed.value
})));

const drawBandOriginal = drawSceneBytes(getBandScene);
const drawRatio = RATIOS.map((_, i) => drawResult(() => ratioSims.value[i], MAIN_SIZE));

const bandErrors = computed(() => BANDS.map(band => ({
  name: band.name,
  errors: ratioSims.value.map(sim => {
    const mean = regionMeanRgb(sim.planes, MAIN_SIZE, MAIN_PPA, band.x0 + 1, band.x1 - 1, BAND_MEASURE_Y0, BAND_MEASURE_Y1);
    return deltaE2000(rgbToLab(band.color), rgbToLab(mean));
  })
})));

// ---------- 红绿光栅 ----------

const gratingSims = computed(() => GRATING_ECCS.map(e => simulate(getGratingScene(period.value), {
  ecc: e,
  lmRatio: lmRatio.value,
  sFraction: sPercent.value / 100,
  hole: hole.value,
  optics: optics.value,
  seed: seed.value
})));

const drawGratingOriginal = drawSceneBytes(() => getGratingScene(period.value));
const drawGrating = GRATING_ECCS.map((_, i) => drawResult(() => gratingSims.value[i], GRATING_SIZE));

const reroll = () => {
  seed.value += 1;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="一小块视网膜上的三种视锥"
      desc="眼睛不是像素阵列。视网膜上每只眼约有 500~600 万个视锥，每个视锥只属于 L、M、S 三类中的一类，只报告“我这一类的光有多强”这一个数。下面左图是一幅 24'×24' 的测试画面（24 弧分 = 0.4°，大约是一米外 7 毫米的宽度），中图是同一块视网膜上的视锥排布，右图是只用这些零散的读数、按各类视锥自己的密度做高斯插值还原出来的画面。几个文献数字：S 视锥只占约 5%~10%，小凹中央约 0.35° 的区域里没有 S 视锥（虚线圈）；中心凹视锥间距约 0.5'（约 2.5 µm），越往周边越稀；L 与 M 的数量比在不同的正常色觉者之间可以从 1:1 到 16:1，平均约 2:1；小凹中央没有视杆，往外视杆逐渐增多（图中灰点只是示意，数量比真实的少）。注意：排布是“带抖动的六边形格点”，真实视网膜更不规则；重建只是一种便于观察的做法，大脑的实际处理（眼动、时间积分、颜色适应）没有模拟；光学模糊用高斯函数近似。"
    >
      <div class="demo-controls">
        <label>
          偏心度
          <input v-model.number="ecc" type="range" min="0" max="10" step="0.25">
          <span class="demo-code">{{ ecc.toFixed(2) }}°</span>
        </label>
        <label>
          L:M 比
          <input v-model.number="lmLog" type="range" min="0" max="4" step="0.1">
          <span class="demo-code">{{ lmRatio.toFixed(1) }} : 1</span>
        </label>
        <label>
          S 占比
          <input v-model.number="sPercent" type="range" min="0" max="15" step="1">
          <span class="demo-code">{{ sPercent }}%</span>
        </label>
        <label>
          光学模糊
          <input v-model.number="optics" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">σ = {{ optics.toFixed(2) }}'</span>
        </label>
        <label>
          <input v-model="hole" type="checkbox">
          小凹中央（0.35°）没有 S 视锥
        </label>
        <color-button label="换一组排布" @click="reroll"/>
      </div>
      <p class="cone-note">
        视锥间距 {{ spacing.toFixed(2) }}'（约 {{ (spacing * UM_PER_ARCMIN).toFixed(1) }} µm）。窗口里
        <span class="cone-dot" :style="{background: CLASS_COLORS[0]}"/> L {{ counts[0] }}，
        <span class="cone-dot" :style="{background: CLASS_COLORS[1]}"/> M {{ counts[1] }}，
        <span class="cone-dot" :style="{background: CLASS_COLORS[2]}"/> S {{ counts[2] }}，视杆（示意）{{ rods }}。
      </p>
      <demo-canvas title="原图（24' × 24'）" :width="MAIN_SIZE" :height="MAIN_SIZE" :draw="drawOriginal"/>
      <demo-canvas title="视锥排布" :width="MAIN_SIZE" :height="MAIN_SIZE" :draw="drawMosaicCanvas"/>
      <demo-canvas title="只凭这些读数还原出的画面" :width="MAIN_SIZE" :height="MAIN_SIZE" :draw="drawRecon"/>
      <p class="demo-section-desc">
        画面里：中间三行是 0.5'~3.5' 的蓝点、黄点，以及 1' 的红、绿、白、黑点；左边四条 0.5' 宽的竖线是红、绿、蓝、黄；右边四条蓝线宽 0.25'~2'；底部是三块大色带；顶部 4' 高的是周期 1.2' 的红绿光栅。把偏心度从 0 拖到 2° 以上，看蓝点、蓝线和蓝黄信息怎么变：偏心度为 0 且勾选“小凹无 S”时，窗口中央没有 S 视锥，这一带得不到蓝-黄信息，在默认设置下蓝点会变成偏暗的青绿斑，大黄点发白发粉，红绿光栅偏成洋红和青绿；这与小视野蓝-黄色觉缺失（小视野三色盲）的现象一致。偏心度增大后 S 视锥出现，但它们间距很大，蓝色只能糊成位置、形状都不准的大块，蓝线和小蓝点分不清。取消勾选“小凹无 S”可以对比。
      </p>
    </demo-section>

    <demo-section
      title="L:M 比例差很多，大块颜色为什么几乎一样"
      :desc="`同一块画面（三条大色带，上下各有一排 1' 的小点），偏心度固定为 ${RATIO_ECC}°（在小凹之外），S 占比、光学模糊和排布种子沿用上面的设置，只改变 L:M 的数量比。真实的人之间这个比例相差很大，但颜色匹配和大块颜色的外观却相近：大面积的颜色靠的是很多个视锥读数的平均，局部多几个 L 或 M 影响不大，而且重建时 L 与 M 各自按自己的密度插值。下表是每条色带内部平均色与原色的色差 ΔE2000，ΔE 在 2 以内一般不易察觉；比例越极端，稀少的那一类视锥越稀，误差越容易变大。小点的颜色则明显随比例变化，因为 1' 的小点只落在几个视锥上。换一组排布，表里的数字会有出入。`"
    >
      <demo-canvas title="原图" :width="MAIN_SIZE" :height="MAIN_SIZE" :draw="drawBandOriginal"/>
      <demo-canvas
        v-for="(r, i) in RATIOS"
        :key="r"
        :title="`L:M = ${r} : 1`"
        :width="MAIN_SIZE"
        :height="MAIN_SIZE"
        :draw="drawRatio[i]"
      />
      <table class="cone-table">
        <thead>
          <tr>
            <th>色带</th>
            <th v-for="r in RATIOS" :key="r">
              ΔE2000，L:M = {{ r }} : 1
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in bandErrors" :key="row.name">
            <td>{{ row.name }}</td>
            <td v-for="(e, i) in row.errors" :key="i" class="demo-code">
              {{ e.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="细红绿光栅：条纹变细以后出现的假颜色"
      desc="视锥是离散采样，条纹周期小于视锥间距的约 1.7 倍就超出了采样极限：条纹会被读成别的周期、别的位置，甚至出现原图里没有的颜色块（混叠）。红绿条纹只能靠 L 与 M 两类视锥分辨，各自的间距比全部视锥的间距更大，所以颜色条纹的分辨极限比明暗条纹更低。下面把同一幅红绿光栅放到偏心度 0°、2°、5°、10° 的视网膜上（视锥间距约 0.5'、0.95'、1.6'、2.6'），L:M 比、S 占比、光学模糊、排布种子沿用第一节的设置。在默认设置下（周期 2'）：0° 处能看到条纹，但因为窗口大多在无 S 的小凹内，颜色偏成洋红和青绿；2° 处条纹散成大小不一的色块；5°、10° 处完全看不出条纹，只剩与条纹无关的色斑。把周期拉到 3.5' 以上，2° 处的条纹又出现；把周期缩到 1' 左右，0° 处也只剩模糊的色斑。真实眼睛的光学模糊会事先把过细的条纹抹掉，光学模糊越小，混叠越容易出现，人眼里通常看不到这种彩色假纹。"
    >
      <div class="demo-controls">
        <label>
          条纹周期
          <input v-model.number="period" type="range" min="0.5" max="5" step="0.1">
          <span class="demo-code">{{ period.toFixed(1) }}'</span>
        </label>
        <span class="demo-code">视锥间距 0° : {{ coneSpacing(0).toFixed(2) }}'，2° : {{ coneSpacing(2).toFixed(2) }}'，5° : {{ coneSpacing(5).toFixed(2) }}'，10° : {{ coneSpacing(10).toFixed(2) }}'</span>
      </div>
      <demo-canvas title="原图（12' × 12'）" :width="GRATING_SIZE" :height="GRATING_SIZE" :draw="drawGratingOriginal"/>
      <demo-canvas
        v-for="(e, i) in GRATING_ECCS"
        :key="e"
        :title="`偏心度 ${e}°`"
        :width="GRATING_SIZE"
        :height="GRATING_SIZE"
        :draw="drawGrating[i]"
      />
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cone-note {
  margin: 4px 0 10px;
  font-size: 13px;
  line-height: 22px;
  color: #555;
}
.cone-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin: 0 2px 0 6px;
  border-radius: 50%;
  vertical-align: middle;
}
.cone-table {
  margin: 8px 0 12px;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 14px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    font-weight: 500;
  }
}
</style>
