<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {gemDeltaE, transmittedColor} from '../utils/gems';
import {
  GEMS,
  ILLUMINANTS,
  PLOT_W,
  PLOT_H,
  CUP_W,
  CUP_H,
  drawGemSpectrum,
  swatchColor,
  lycurgusColors,
  drawCup,
  drawLycurgusSpectra,
  dichroicColors,
  drawDichroicSpectra
} from '../composables/gems';

const gemIndex = ref(0);
const lightIndex = ref(0);
const degree = ref(0.5);
const backLit = ref(true);
const thickness = ref(2);
const center = ref(520);
const width = ref(45);

const gem = computed(() => GEMS[gemIndex.value]);
const light = computed(() => ILLUMINANTS[lightIndex.value]);

const gemDraw: DrawFn = (ctx, w, h) => drawGemSpectrum(() => gem.value, () => light.value)(ctx, w, h);
const cupDraw: DrawFn = (ctx, w, h) => drawCup(() => backLit.value, () => thickness.value)(ctx, w, h);
const lycurgusSpectraDraw: DrawFn = (ctx, w, h) => drawLycurgusSpectra(() => thickness.value)(ctx, w, h);
const dichroicDraw: DrawFn = (ctx, w, h) => drawDichroicSpectra(() => center.value, () => width.value)(ctx, w, h);

const rows = computed(() => GEMS.map(g => ({
  gem: g,
  cells: ILLUMINANTS.map(ill => ({
    key: ill.key,
    css: swatchColor(g, ill, degree.value),
    hex: rgbHex(transmittedColor(g.transmittance, ill.spd, degree.value))
  })),
  change: gemDeltaE(g.transmittance, ILLUMINANTS[0], ILLUMINANTS[1], degree.value)
})));

const lycurgus = computed(() => lycurgusColors(thickness.value));
const dichroic = computed(() => dichroicColors(center.value, width.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="同一块宝石，换一盏灯就换一种颜色"
      desc="宝石的颜色 = 光源的光谱 × 宝石的透射谱，再被眼睛的三种视锥积分成三个数。变石（Alexandrite）有两个透射窗口：蓝绿光（约 500nm）和红光（600nm 以上），中间的黄光被强烈吸收。日光里蓝绿光多，宝石看起来偏蓝绿；白炽灯里红光多，窗口的比例反过来，宝石看起来偏红紫。这就是“变色”的来源，本质上和同色异谱是一回事。红宝石、蓝宝石的透射窗口只有一个，换灯后颜色变化小得多。下面的透射谱都是依据吸收带位置手工构造的示意曲线，不是实测数据。"
    >
      <div class="demo-controls">
        <label>
          宝石
          <select v-model.number="gemIndex">
            <option v-for="(g, i) in GEMS" :key="g.key" :value="i">{{ g.name }}</option>
          </select>
        </label>
        <label>
          光源
          <select v-model.number="lightIndex">
            <option v-for="(l, i) in ILLUMINANTS" :key="l.key" :value="i">{{ l.name }}</option>
          </select>
        </label>
        <label>
          对灯光颜色的适应程度
          <input v-model.number="degree" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ degree.toFixed(2) }}</span>
        </label>
      </div>
      <p class="gems-note">
        {{ gem.note }}
      </p>
      <demo-canvas title="透射谱、光源与进入眼睛的光" :width="PLOT_W" :height="PLOT_H" :draw="gemDraw"/>
    </demo-section>

    <demo-section
      title="三种宝石 × 三种光源"
      desc="适应程度为 0 时，直接显示光线本身的颜色（白炽灯下一切都偏橙）；为 1 时，假设眼睛完全适应了灯光，白纸始终是白的；人眼通常介于两者之间。ΔE2000 是日光与白炽灯下的色差，越大越容易看出变色。"
    >
      <table class="gems-table">
        <thead>
          <tr>
            <th>宝石</th>
            <th v-for="ill in ILLUMINANTS" :key="ill.key">
              {{ ill.name }}
            </th>
            <th>日光 vs 白炽灯 ΔE2000</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.gem.key">
            <td>{{ row.gem.name }}</td>
            <td v-for="cell in row.cells" :key="cell.key">
              <span class="demo-swatch" :style="{background: cell.css}"/>
              <span class="demo-code gems-hex">{{ cell.hex }}</span>
            </td>
            <td class="demo-code">
              {{ row.change.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="Lycurgus 杯：看的方向不同，颜色也不同"
      desc="公元 4 世纪的罗马 Lycurgus 杯，玻璃里含有极少量的金银纳米颗粒。纳米金在 520nm 附近有一个等离子体共振吸收带，同时会把光散射出去。正面打光时，我们主要看到被散射出来的光，偏绿；背面打光时，光穿过玻璃，绿光被吸收、散射掉，剩下红色。这条曲线是示意：吸收带和散射带的位置、宽度按文献描述手工构造，不是实测值。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="backLit" type="checkbox">
          背面打光（透射）
        </label>
        <label>
          玻璃厚度
          <input v-model.number="thickness" type="range" min="0.3" max="5" step="0.1">
          <span class="demo-code">{{ thickness.toFixed(1) }}</span>
        </label>
        <span>透射 <span class="demo-swatch" :style="{background: rgbCss(lycurgus.transmit)}"/> {{ rgbHex(lycurgus.transmit) }}</span>
        <span>散射 <span class="demo-swatch" :style="{background: rgbCss(lycurgus.scatter)}"/> {{ rgbHex(lycurgus.scatter) }}</span>
      </div>
      <demo-canvas title="杯子" :width="CUP_W" :height="CUP_H" :draw="cupDraw"/>
      <demo-canvas title="吸收 + 散射的光谱" :width="PLOT_W" :height="PLOT_H" :draw="lycurgusSpectraDraw"/>
    </demo-section>

    <demo-section
      title="薄膜二向色玻璃：反射一种颜色，透过它的补色"
      desc="二向色（dichroic）玻璃镀有多层介质薄膜，靠干涉把某一段波长反射走，其余的透过去，几乎不吸收光，所以反射色和透射色互为补色。把带宽调窄，颜色更纯；这类玻璃常见于舞台灯的滤色片和装饰玻璃。注意这和 Lycurgus 杯的原理不同：前者是干涉，后者是纳米颗粒的共振吸收和散射。"
    >
      <div class="demo-controls">
        <label>
          反射带中心
          <input v-model.number="center" type="range" min="400" max="700" step="5">
          <span class="demo-code">{{ center }} nm</span>
        </label>
        <label>
          带宽
          <input v-model.number="width" type="range" min="15" max="120" step="5">
          <span class="demo-code">{{ width }} nm</span>
        </label>
        <span>反射 <span class="demo-swatch" :style="{background: rgbCss(dichroic.reflect)}"/> {{ rgbHex(dichroic.reflect) }}</span>
        <span>透射 <span class="demo-swatch" :style="{background: rgbCss(dichroic.transmit)}"/> {{ rgbHex(dichroic.transmit) }}</span>
      </div>
      <demo-canvas title="反射率与透射率" :width="PLOT_W" :height="PLOT_H" :draw="dichroicDraw"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.gems-note {
  margin: 0 0 8px;
  font-size: 13px;
  color: #666;
}
.gems-table {
  border-collapse: collapse;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    border: 1px solid #E4E4E4;
    padding: 6px 12px;
    text-align: left;
    vertical-align: middle;
  }
  th {
    background: #F5F6FA;
  }
  .gems-hex {
    margin-left: 6px;
  }
}
</style>
