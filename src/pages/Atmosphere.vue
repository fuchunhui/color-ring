<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  HALO_W,
  HALO_H,
  FLASH_W,
  FLASH_H,
  AURORA_W,
  AURORA_H,
  AURORA_PROFILE_W,
  AURORA_LINE_COLORS,
  LINES_W,
  LINES_H,
  drawHaloScene,
  haloRows,
  sundogRows,
  drawFlashScene,
  refractionRows,
  drawAuroraScene,
  drawAuroraProfile,
  drawAuroraLines
} from '../composables/atmosphere';

const elevation = ref(10);
const ring46 = ref(true);
const dogs = ref(true);
const drawHalo = drawHaloScene(() => ({elevation: elevation.value, ring46: ring46.value, dogs: dogs.value}));
const rows = haloRows();
const dogRows = sundogRows();

const exaggeration = ref(30);
const extinction = ref(true);
const altitude = ref(-0.78);
const drawFlash = drawFlashScene(() => ({
  exaggeration: exaggeration.value,
  extinction: extinction.value,
  altitude: altitude.value
}));
const refRows = refractionRows();
</script>

<template>
  <demo-page>
    <demo-section
      title="22° 晕与幻日：冰晶里的三棱镜"
      desc="高空的卷层云里飘着六棱柱形的小冰晶。光从一个侧面射入、从相隔 60° 的另一个侧面射出，每个冰晶就是一块顶角 60° 的三棱镜，最小偏向角约 21.8°：大量随机取向的冰晶把光集中到离太阳 22° 的圆环上，红光偏折小，所以环的内缘偏红，外缘偏蓝白，环内的天空显得更暗。板状冰晶在空中竖直下落时，棱镜的棱是竖直的，光线还带着太阳高度的倾角，偏折角会随太阳升高而变大，于是太阳两侧出现两个明亮的光斑，叫幻日（红色一侧朝向太阳）。从端面射入的光穿过顶角 90° 的棱镜，形成更暗的 46° 晕。冰的折射率取 n ≈ 1.306（红）到 1.317（蓝）的近似值，画面是示意，亮度和宽度并非实测。"
    >
      <div class="demo-controls">
        <label>
          太阳高度
          <input v-model.number="elevation" type="range" min="0" max="60" step="1">
          <span class="demo-code">{{ elevation }}°</span>
        </label>
        <label>
          <input v-model="ring46" type="checkbox">
          显示 46° 晕
        </label>
        <label>
          <input v-model="dogs" type="checkbox">
          显示幻日
        </label>
      </div>
      <demo-canvas :width="HALO_W" :height="HALO_H" :draw="drawHalo"/>
      <table class="atm-table">
        <thead>
          <tr>
            <th>光</th>
            <th>波长</th>
            <th>冰的折射率 n</th>
            <th>22° 晕（顶角 60°）</th>
            <th>46° 晕（顶角 90°）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.wavelength">
            <td><span class="atm-dot" :style="{background: row.color}"/>{{ row.label }}</td>
            <td class="demo-code">
              {{ row.wavelength }} nm
            </td>
            <td class="demo-code">
              {{ row.n.toFixed(4) }}
            </td>
            <td class="demo-code">
              {{ row.d22.toFixed(2) }}°
            </td>
            <td class="demo-code">
              {{ row.d46.toFixed(2) }}°
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        幻日离太阳的距离随太阳高度变化（黄绿光，水平面内等效折射率 n_eff = √(n² − sin²h) / cos h）：
        <span v-for="r in dogRows" :key="r.elevation" class="demo-code">
          高度 {{ r.elevation }}° → {{ r.distance.toFixed(1) }}°；
        </span>
        太阳越高，幻日离太阳越远，高到约 61° 就不再出现。
      </p>
    </demo-section>

    <demo-section
      title="绿闪：日落最后一瞬的绿边"
      desc="空气的折射率随波长略有不同，波长越短折射越强，所以太阳在地平线附近时，蓝绿色的日轮像比红色的像略高一点，日轮上缘就多出一圈蓝绿色的边，下缘多出一圈红边。蓝紫光在长长的大气路径里几乎被瑞利散射掉了，只剩绿光，于是在日轮即将沉没、其他颜色的像已经落下去之后，上缘的绿边会闪现一两秒，这就是绿闪。折射用经典的干燥空气色散公式（n − 1）·10⁶ ≈ 287.6 + 1.63/λ² + 0.014/λ⁴（λ 单位 µm）和 Sæmundsson 折射公式，是简化模型。真实的位移只有约半角分，约为太阳直径的 1.6%，所以下图把位移放大了，滑块的数字就是放大倍数；用明亮、洁净、地平线开阔的空气（海上、沙漠）才容易看到，空气不稳定时则会闪烁、分裂。"
    >
      <div class="demo-controls">
        <label>
          位移放大
          <input v-model.number="exaggeration" type="range" min="1" max="60" step="1">
          <span class="demo-code">×{{ exaggeration }}</span>
        </label>
        <label>
          太阳圆心真高度
          <input v-model.number="altitude" type="range" min="-1" max="0.2" step="0.01">
          <span class="demo-code">{{ altitude.toFixed(2) }}°</span>
        </label>
        <label>
          <input v-model="extinction" type="checkbox">
          计入大气瑞利消光（蓝紫光被吸收掉）
        </label>
      </div>
      <demo-canvas :width="FLASH_W" :height="FLASH_H" :draw="drawFlash"/>
      <table class="atm-table">
        <thead>
          <tr>
            <th>波长</th>
            <th>地平线处折射</th>
            <th>相对 575 nm 的差</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in refRows" :key="row.wavelength">
            <td><span class="atm-dot" :style="{background: row.color}"/><span class="demo-code">{{ row.wavelength }} nm</span></td>
            <td class="demo-code">
              {{ row.arcmin.toFixed(2) }}′
            </td>
            <td class="demo-code">
              {{ row.diff > 0 ? '+' : '' }}{{ row.diff.toFixed(1) }}″
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="极光的颜色：来自不同高度的不同粒子"
      desc="太阳风的带电粒子沿地磁场冲进高层大气，撞击氧原子和氮分子使其激发，激发态回到低能级时发出特定颜色的光。最常见的是氧原子 557.7 nm 的绿线，主要在 100 到 150 km 高；氧原子的红线 630.0 / 636.4 nm 的激发态寿命长达约 110 秒，在较低的空气里，激发态还没来得及发光就被碰撞掉了，所以红色只出现在 200 km 以上的稀薄大气；氮分子离子在 391.4 nm 和 427.8 nm 的蓝紫色发射则出现在幕的下边缘。因此一幅极光常常是下紫、中绿、上红。下面的高度分布、亮度和细节都是示意，真实极光的形状瞬息万变。"
    >
      <demo-canvas :width="AURORA_W" :height="AURORA_H" :draw="drawAuroraScene"/>
      <demo-canvas :width="AURORA_PROFILE_W" :height="AURORA_H" :draw="drawAuroraProfile"/>
      <demo-canvas :width="LINES_W" :height="LINES_H" :draw="drawAuroraLines"/>
      <table class="atm-table">
        <thead>
          <tr>
            <th>发射线</th>
            <th>波长</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in AURORA_LINE_COLORS" :key="line.key">
            <td><span class="atm-dot" :style="{background: line.color}"/>{{ line.label }}</td>
            <td class="demo-code">
              {{ line.wavelength }} nm
            </td>
            <td>{{ line.note }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.atm-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 5px 12px;
    border: 1px solid #E2E4EA;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    color: #5C5D5F;
  }
  .atm-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 6px;
    vertical-align: -1px;
    border: 1px solid #CCC;
  }
}
</style>
