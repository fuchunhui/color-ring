<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {METALS} from '../utils/metals';
import {
  PLOT_W,
  PLOT_H,
  ANGLE_W,
  ANGLE_H,
  PBR_F0,
  drawReflectance,
  drawAngles,
  swatches
} from '../composables/metals';

const angle = ref(0);
const index = ref(0);

const theta = computed(() => angle.value * Math.PI / 180);
const list = computed(() => swatches(theta.value));
const active = computed(() => METALS[index.value]);

const reflectDraw: DrawFn = (ctx, w, h) => drawReflectance(active.value, () => theta.value)(ctx, w, h);
const angleDraw: DrawFn = (ctx, w, h) => drawAngles(() => active.value)(ctx, w, h);

const fmt = (v: number[]): string => v.map(x => x.toFixed(2)).join(', ');
</script>

<template>
  <demo-page>
    <demo-section
      title="金属为什么有颜色"
      desc="金属表面会把大部分光反射回来，反射了多少由复折射率 n + ik 决定：垂直入射时 R = ((n−1)² + k²) / ((n+1)² + k²)。颜色就来自反射率随波长的变化：银、铝在整个可见光范围都反射得差不多，所以是白色；金在 500nm 以下反射率明显下降，蓝光被吸收，剩下黄色；铜的吸收边在 600nm 附近，剩下橙红色。n、k 数据取自 refractiveindex.info 公共数据库中的实测表（金、铜、银：Johnson & Christy 1972；铝：Rakić 1995），在 20nm 网格上插值。"
    >
      <div class="demo-controls">
        <label>
          入射角
          <input v-model.number="angle" type="range" min="0" max="89" step="1">
          <span class="demo-code">{{ angle }}°</span>
        </label>
        <label>
          突出显示
          <select v-model.number="index">
            <option v-for="(m, i) in METALS" :key="m.key" :value="i">{{ m.name }}（{{ m.key }}）</option>
          </select>
        </label>
      </div>
      <demo-canvas title="反射率随波长（D65 白光照射，粗线为所选金属）" :width="PLOT_W" :height="PLOT_H" :draw="reflectDraw"/>
    </demo-section>

    <demo-section
      title="反射出来是什么颜色"
      desc="把反射率曲线乘上 D65 日光的光谱，再换算成 sRGB，就是这块金属在日光下的颜色。右侧是常被 PBR（基于物理的渲染）引用的基础反射率 F0（线性 RGB），可以拿来对照：它们是业界常见取值，并非同一份测量数据，只能看大致是否吻合。拖动上面的入射角滑块，所有色块跟着变。"
    >
      <table class="metals-table">
        <thead>
          <tr>
            <th>金属</th>
            <th>色块</th>
            <th>sRGB</th>
            <th>本页线性 RGB</th>
            <th>常见 PBR F0（线性）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.metal.key">
            <td>{{ item.metal.name }}</td>
            <td><span class="demo-swatch" :style="{background: rgbCss(item.srgb)}"/></td>
            <td class="demo-code">{{ rgbHex(item.srgb) }}</td>
            <td class="demo-code">{{ fmt(item.linear) }}</td>
            <td class="demo-code">{{ fmt(PBR_F0[item.metal.key]) }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="掠射角下金属会变白"
      desc="入射角越大，所有金属的反射率都升向 100%，三种波长的差别缩小，颜色因此越来越白。这就是 Fresnel 效应：从很斜的角度看金色物体，边缘会泛白。这里按 s、p 两种偏振的反射率取平均。"
    >
      <demo-canvas title="反射率随入射角（所选金属，450 / 550 / 650nm）" :width="ANGLE_W" :height="ANGLE_H" :draw="angleDraw"/>
    </demo-section>

    <demo-section
      title="为什么金是黄的、铜是红的"
      desc="金属里有自由电子，也有从内层被激发的电子。光子能量足够大时，会把电子从 d 带激发到费米面附近，这个“带间跃迁”把光吸收掉：金的吸收边在约 2.4 eV（蓝绿光，约 500nm），所以蓝光被吸收，反射出黄色；铜的吸收边在约 2.1 eV（约 590nm），连绿光和黄光也吸收一部分，反射出偏红的颜色；银的吸收边在紫外（约 3.9 eV），整个可见光范围都被反射，所以是白色。铝的带间跃迁在 1.5 eV 附近的近红外，可见光范围反射率平稳，也是白色，只是整体略低。"
    />
  </demo-page>
</template>

<style lang="less">
.metals-table {
  border-collapse: collapse;
  font-size: 13px;
  background: #FFF;
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
