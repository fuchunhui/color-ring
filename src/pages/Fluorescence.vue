<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {
  DYES,
  PLOT_W,
  PLOT_H,
  SCENE_W,
  SCENE_H,
  drawStokes,
  paperWhiteness,
  drawPaperSpectrum,
  drawBlackLight
} from '../composables/fluorescence';

const dyeIndex = ref(0);
const uv = ref(1);

const dye = computed(() => DYES[dyeIndex.value]);
const plain = computed(() => paperWhiteness(uv.value, 0));
const bright = computed(() => paperWhiteness(uv.value, 1));

const stokesDraw: DrawFn = (ctx, w, h) => drawStokes(() => dye.value)(ctx, w, h);
const paperDraw: DrawFn = (ctx, w, h) => drawPaperSpectrum(() => uv.value)(ctx, w, h);
const whiteLightDraw: DrawFn = (ctx, w, h) => drawBlackLight(() => false)(ctx, w, h);
const blackLightDraw: DrawFn = (ctx, w, h) => drawBlackLight(() => true)(ctx, w, h);
</script>

<template>
  <demo-page>
    <demo-section
      title="荧光：吸收短波，发射长波"
      desc="荧光物质吸收一个波长的光，几乎立刻（纳秒量级）以更长的波长发射出来。吸收和发射的能量差以热的形式损失掉，所以发射光的波长总是更长，这个差叫斯托克斯位移（Stokes shift）。紫外线人眼看不见，但荧光物质可以把它转换成可见光，因此看起来“比照在身上的光还亮”。下面的吸收峰和发射峰位置是量级正确的示意值，曲线形状简化成了高斯。"
    >
      <div class="demo-controls">
        <label>
          荧光物质
          <select v-model.number="dyeIndex">
            <option v-for="(d, i) in DYES" :key="d.key" :value="i">{{ d.name }}</option>
          </select>
        </label>
      </div>
      <demo-canvas title="吸收（激发）谱与发射谱" :width="PLOT_W" :height="PLOT_H" :draw="stokesDraw"/>
    </demo-section>

    <demo-section
      title="荧光增白剂：为什么白纸比“白”还白"
      desc="纸张天然略带黄色，会吸收一点蓝光。造纸时加入荧光增白剂，它吸收日光里的紫外线，发射蓝光，把缺的蓝补回来，于是纸看起来更白，甚至在蓝光波段的反射“超过 100%”（因为多出来的光是紫外转换来的）。白度常用 CIE 白度指数 W = Y + 800(xn − x) + 1700(yn − y) 来衡量，Y 是明度（%），(x, y) 是纸的色度坐标，(xn, yn) = (0.3127, 0.3290) 是 D65 的色度坐标。W 越大越白，b* 越负越偏蓝。这里的增白剂强度是示意值。光源里的紫外含量越少（比如普通室内灯），增白剂越起不了作用。"
    >
      <div class="demo-controls">
        <label>
          光源中的紫外含量
          <input v-model.number="uv" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ Math.round(uv * 100) }}%（100% = 标准日光 D65 的紫外量）</span>
        </label>
      </div>
      <table class="fluo-table">
        <thead>
          <tr>
            <th>纸</th>
            <th>颜色</th>
            <th>Y（%）</th>
            <th>色度 (x, y)</th>
            <th>b*</th>
            <th>450nm 辐亮度因子</th>
            <th>白度指数 W</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>未加增白剂</td>
            <td><span class="demo-swatch" :style="{background: rgbCss(plain.rgb)}"/> <span class="demo-code">{{ rgbHex(plain.rgb) }}</span></td>
            <td class="demo-code">
              {{ plain.Y.toFixed(1) }}
            </td>
            <td class="demo-code">
              {{ plain.x.toFixed(4) }}, {{ plain.y.toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ plain.b.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ (plain.blue * 100).toFixed(0) }}%
            </td>
            <td class="demo-code">
              {{ plain.W.toFixed(1) }}
            </td>
          </tr>
          <tr>
            <td>加了增白剂</td>
            <td><span class="demo-swatch" :style="{background: rgbCss(bright.rgb)}"/> <span class="demo-code">{{ rgbHex(bright.rgb) }}</span></td>
            <td class="demo-code">
              {{ bright.Y.toFixed(1) }}
            </td>
            <td class="demo-code">
              {{ bright.x.toFixed(4) }}, {{ bright.y.toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ bright.b.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ (bright.blue * 100).toFixed(0) }}%
            </td>
            <td class="demo-code">
              {{ bright.W.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
      <demo-canvas title="纸的辐亮度因子（D65 照射）" :width="PLOT_W" :height="PLOT_H" :draw="paperDraw"/>
    </demo-section>

    <demo-section
      title="打开黑光灯"
      desc="黑光灯发出 365nm 左右的紫外线，人眼几乎看不到它。普通物体吸收紫外线、没有荧光，所以几乎是黑的（只有灯泡漏出的一点点紫光，这里用很暗的紫色表示）；有荧光的东西则发出自己的颜色：增白纸和洗过增白剂的衬衫发蓝白色，汤力水里的奎宁发蓝，荧光笔发黄绿，钞票的防伪线发绿色。这是常见的鉴别方法，但各种具体物体的颜色和亮度因配方而异，下面是示意。"
    >
      <demo-canvas title="白光下" :width="SCENE_W" :height="SCENE_H" :draw="whiteLightDraw"/>
      <demo-canvas title="黑光灯下（365nm 紫外）" :width="SCENE_W" :height="SCENE_H" :draw="blackLightDraw"/>
    </demo-section>

    <demo-section
      title="荧光与磷光"
      desc="荧光在激发停止后几乎立刻（纳秒量级）停止发光；磷光涉及自旋禁阻的跃迁，能在激发停止后继续发光几秒到几小时，夜光贴就是磷光。"
    />
  </demo-page>
</template>

<style lang="less">
.fluo-table {
  border-collapse: collapse;
  font-size: 13px;
  background: #FFF;
  margin-bottom: 12px;
  th,
  td {
    border: 1px solid #E4E4E4;
    padding: 6px 12px;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
}
</style>
