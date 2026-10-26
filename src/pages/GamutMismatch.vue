<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss} from '../utils/spectral';
import {SPACES} from '../utils/colorman';
import type {SpaceKey} from '../utils/colorman';
import {
  CHART_W,
  CHART_H,
  IMG_W,
  IMG_H,
  INTENT_STEPS,
  drawGamutChart,
  gamutStats,
  drawInterpreted,
  sampleRows,
  intentRows,
  convertAll,
  calcSwatch
} from '../composables/gamutmismatch';
import type {Remap} from '../composables/gamutmismatch';

const visible = reactive<Record<string, boolean>>({srgb: true, p3: true, rec2020: true, adobe: true, prophoto: true});
const remap = ref<Remap>('clip');
const hue = ref(200);
const lightness = ref(0.75);
const calcSpace = ref<SpaceKey>('p3');
const calcR = ref(255);
const calcG = ref(80);
const calcB = ref(30);

const stats = gamutStats();
const percent = (v: number): string => `${(v * 100).toFixed(1)}%`;

const chartDraw: DrawFn = ctx => drawGamutChart(ctx, visible);

const PANELS: {key: SpaceKey; title: string}[] = [
  {key: 'srgb', title: '当作 sRGB（数值原样显示）'},
  {key: 'p3', title: '当作 Display P3（转成 sRGB 显示）'},
  {key: 'rec2020', title: '当作 Rec.2020（转成 sRGB 显示）'},
  {key: 'adobe', title: '当作 Adobe RGB（转成 sRGB 显示）'},
  {key: 'prophoto', title: '当作 ProPhoto（转成 sRGB 显示）'}
];

const panelDraws: DrawFn[] = PANELS.map(panel => ctx => drawInterpreted(ctx, panel.key, remap.value));

const samples = computed(() => sampleRows(remap.value));
const intents = computed(() => intentRows(hue.value, lightness.value));
const calcCells = computed(() => convertAll(calcSpace.value, [calcR.value, calcG.value, calcB.value]));
const calcColor = computed(() => calcSwatch(calcSpace.value, [calcR.value, calcG.value, calcB.value]));

const to255 = (e: Event): number => {
  const v = Number((e.target as HTMLInputElement).value);
  return Math.min(255, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));
};
</script>

<template>
  <demo-page>
    <demo-section
      title="五个 RGB 色域在 xy 色度图上"
      desc="每个 RGB 空间由三个原色和一个白点定义，在 xy 图上就是一个三角形。sRGB 最小；Display P3 和 Adobe RGB 各自向绿、红方向扩张；Rec.2020 的三个原色都落在光谱轨迹上，是单色光；ProPhoto 的蓝原色 y 仅 0.0001，已经跑到光谱轨迹之外（虚构原色，它的部分颜色人眼根本看不到）。底色为示意，屏幕无法显示 sRGB 之外的真实颜色。"
    >
      <div class="demo-controls">
        <label v-for="s in SPACES" :key="s.key">
          <input v-model="visible[s.key]" type="checkbox">
          <span :style="{color: s.color}">{{ s.label }}</span>
        </label>
      </div>
      <demo-canvas :width="CHART_W" :height="CHART_H" :draw="chartDraw"/>
      <table class="gm-table">
        <thead>
          <tr>
            <th>色域</th>
            <th>xy 面积</th>
            <th>相对 sRGB</th>
            <th>覆盖 Rec.2020</th>
            <th>u'v' 面积</th>
            <th>相对 sRGB</th>
            <th>覆盖 Rec.2020</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in stats" :key="s.key">
            <td>{{ s.label }}</td>
            <td class="demo-code">
              {{ s.areaXy.toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ s.ratioXy.toFixed(2) }}×
            </td>
            <td class="demo-code">
              {{ percent(s.coverXy) }}
            </td>
            <td class="demo-code">
              {{ s.areaUv.toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ s.ratioUv.toFixed(2) }}×
            </td>
            <td class="demo-code">
              {{ percent(s.coverUv) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="gm-note">
        面积比在 xy 平面和更均匀的 u'v' 平面上略有差别，这里两者都给出。ProPhoto 的覆盖率为 100%
        是因为它的三角形把 Rec.2020 整个包住了，但其中很大一部分面积是人眼看不到的区域，所以面积大并不等于实用。
      </p>
    </demo-section>

    <demo-section
      title="同一组数字，不同解读"
      desc="图像文件里只有数字，数字是什么颜色取决于它属于哪个色彩空间。下面五张图用的是完全相同的数字。如果图片本来是 Display P3 的：第二张才是正确显示，第一张（数字不转换、直接当 sRGB）颜色偏灰偏淡。如果图片本来是 sRGB 的：第一张才是正确的，后面几张模拟的是“把 sRGB 数字当作宽色域数字直接送到宽色域屏幕”，颜色会过饱和（这里转成 sRGB 显示，超出的部分被裁切，所以实际屏幕上的过饱和比这里还要强烈）。如果你的屏幕本身就是宽色域，浏览器通常已经做了色彩管理，直接看到的是正确颜色。"
    >
      <div class="demo-controls">
        <label>
          色域外颜色的处理
          <select v-model="remap">
            <option value="clip">直接裁切</option>
            <option value="css4">CSS Color 4 映射（降低色度）</option>
          </select>
        </label>
      </div>
      <demo-canvas
        v-for="(panel, i) in PANELS"
        :key="panel.key"
        :title="panel.title"
        :width="IMG_W"
        :height="IMG_H"
        :draw="panelDraws[i]"
      />
      <table class="gm-table">
        <thead>
          <tr>
            <th>色块</th>
            <th>数字</th>
            <th v-for="p in PANELS" :key="p.key">
              {{ p.title.replace('（转成 sRGB 显示）', '').replace('（数值原样显示）', '') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in samples" :key="row.name">
            <td>{{ row.name }}</td>
            <td class="demo-code">
              {{ row.source.join(', ') }}
            </td>
            <td v-for="cell in row.cells" :key="cell.space">
              <i class="demo-swatch gm-swatch" :style="{background: rgbCss(cell.rgb8)}"/>
              <span class="demo-code">{{ cell.rgb8.join(', ') }}</span>
              <span v-if="!cell.inside" class="gm-out">超出 sRGB</span>
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="渲染意图：色域放不下的颜色怎么办"
      desc="色彩管理把图像转到目标设备（打印机、sRGB 屏）时，色域外的颜色必须想办法处理，这个策略叫渲染意图。感知（Perceptual）：整体压缩，保持颜色之间的相对关系，代价是色域内的颜色也会变淡。相对比色（Relative Colorimetric）：色域内的颜色原样保留，色域外的裁到边界，并把白点对齐目标设备的白点，最常用。饱和度（Saturation）：尽量保持鲜艳程度，适合图表和商业图形，不追求准确。绝对比色（Absolute Colorimetric）：连白点都不对齐，用于打样，比如模拟纸张偏黄的白。下面用一排越来越饱和的颜色（假设源色域足够大）演示三种处理：直接裁切会让色相偏移；只降色度能保持色相，但最饱和的几个颜色会变成同一个；整体压缩则保住了全部层次。每行末尾给出结果里不同颜色的数量和平均色相偏移。"
    >
      <div class="demo-controls">
        <label>
          色相
          <input v-model.number="hue" type="range" min="0" max="359" step="1">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <label>
          OKLCH 亮度
          <input v-model.number="lightness" type="range" min="0.3" max="0.95" step="0.01">
          <span class="demo-code">{{ lightness.toFixed(2) }}</span>
        </label>
      </div>
      <div v-for="row in intents" :key="row.label" class="gm-intent">
        <p class="gm-intent-title">
          {{ row.label }}
          <span class="gm-intent-note">{{ row.note }}（{{ row.distinct }} / {{ INTENT_STEPS }} 种不同的颜色，平均色相偏移 {{ row.hueShift.toFixed(1) }}°）</span>
        </p>
        <div class="gm-strip">
          <i v-for="(c, i) in row.colors" :key="i" :style="{background: rgbCss(c)}"/>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="色彩空间换算器"
      desc="输入某个色彩空间里的 0 到 255 的数值，查看它在五个空间里对应的数值。超出 0~255 的数值（换算后为负或大于 255）说明这个颜色在目标空间里表示不出来，表中以“色域外”标出，括号里是未截断的小数。"
    >
      <div class="demo-controls">
        <label>
          输入空间
          <select v-model="calcSpace">
            <option v-for="s in SPACES" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </label>
        <label>R <input class="gm-input" type="number" min="0" max="255" :value="calcR" @change="calcR = to255($event)"></label>
        <label>G <input class="gm-input" type="number" min="0" max="255" :value="calcG" @change="calcG = to255($event)"></label>
        <label>B <input class="gm-input" type="number" min="0" max="255" :value="calcB" @change="calcB = to255($event)"></label>
        <span>在 sRGB 屏上看到的颜色：<i class="demo-swatch" :style="{background: rgbCss(calcColor)}"/></span>
      </div>
      <table class="gm-table">
        <thead>
          <tr>
            <th>空间</th>
            <th>8 位数值</th>
            <th>未截断的编码值</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cell in calcCells" :key="cell.space">
            <td>{{ cell.label }}</td>
            <td class="demo-code">
              {{ cell.rgb8.join(', ') }}
            </td>
            <td class="demo-code">
              {{ cell.encoded.map(v => v.toFixed(3)).join(', ') }}
            </td>
            <td :class="{'gm-out': !cell.inside}">
              {{ cell.inside ? '色域内' : '色域外' }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.gm-table {
  border-collapse: collapse;
  margin: 8px 0;
  background: #FFF;
  font-size: 13px;
  th,
  td {
    border: 1px solid #DDDEE4;
    padding: 5px 10px;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
}
.gm-swatch {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}
.gm-out {
  margin-left: 6px;
  color: #D32F2F;
  font-size: 12px;
}
.gm-note {
  max-width: 900px;
  font-size: 12px;
  line-height: 19px;
  color: #777;
}
.gm-input {
  width: 64px;
  height: 26px;
}
.gm-intent {
  margin-bottom: 10px;
  &-title {
    font-size: 13px;
    margin-bottom: 4px;
  }
  &-note {
    margin-left: 6px;
    font-size: 12px;
    color: #777;
  }
}
.gm-strip {
  display: flex;
  width: 640px;
  i {
    flex: 1;
    height: 36px;
  }
}
</style>
