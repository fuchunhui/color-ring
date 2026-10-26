<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {COLORMAPS} from '../utils/colormaps';
import {
  FIELD_N,
  FIELD_SCALE,
  analyses,
  sequentialField,
  divergingField,
  drawBars,
  drawAnalysis,
  drawViews,
  drawField
} from '../composables/colormap';
import type {DrawFn} from '../composables/colormap';

const KIND_LABELS: Record<string, string> = {
  sequential: '顺序型',
  diverging: '发散型',
  rainbow: '彩虹型',
  cyclic: '循环型'
};

const mapA = ref('jet');
const mapB = ref('viridis');
const fieldW = FIELD_N * FIELD_SCALE + 64;
const fieldH = FIELD_N * FIELD_SCALE;

const drawA: DrawFn = (ctx, w, h) => {
  drawField(sequentialField, mapA.value, false)(ctx, w, h);
};
const drawB: DrawFn = (ctx, w, h) => {
  drawField(sequentialField, mapB.value, false)(ctx, w, h);
};
const drawGray: DrawFn = (ctx, w, h) => {
  drawField(sequentialField, 'gray', false, true)(ctx, w, h);
};

const divergingKeys = ['coolwarm', 'rdbu', 'viridis', 'jet'];
const divergingDrawers = divergingKeys.map(key => {
  const draw: DrawFn = (ctx, w, h) => {
    drawField(divergingField, key, true)(ctx, w, h);
  };
  return draw;
});
const divergingTitles = ['coolwarm（发散型）', 'RdBu（发散型）', 'viridis（顺序型，不适合）', 'jet（彩虹型，不适合）'];
</script>

<template>
  <demo-page>
    <demo-section
      title="颜色映射（Colormap）：把数字变成颜色"
      desc="数据可视化里常用一条色带把数值映射成颜色。色带选得不好，会让人看到并不存在的“边界”，或者漏掉真实的特征。下面所有色带都是由若干锚点颜色在 OKLab 空间插值得到的 256 项近似，不是各自原始的 256 色表；jet 与 hsv 则按它们的公式直接生成。viridis、plasma、inferno、magma、cividis 的锚点取自它们公布的采样色，turbo 为近似。"
    >
      <demo-canvas :width="700" :height="COLORMAPS.length * 30 + 16" :draw="drawBars"/>
    </demo-section>

    <demo-section
      title="亮度是否单调？感知速度是否均匀？"
      desc="好的顺序型色带应该满足两点：一，亮度（OKLab 的 L）从一端到另一端单调变化，这样灰度打印、色觉缺陷者也能读出大小顺序；二，颜色每走一格，在人眼里的变化量大致相同（感知速度平直），这样数值差一样大时，看起来的颜色差也一样大。黑线是亮度，橙线是感知速度相对其均值的倍数；速度比 = 最大速度 / 最小速度，越接近 1 越均匀。发散型色带的亮度应该在中间点最高（或最低）并向两边对称变化，这里按“左右两段各自单调”判断。"
    >
      <demo-canvas :width="944" :height="494" :draw="drawAnalysis"/>
      <table class="colormap-table">
        <thead>
          <tr>
            <th>色带</th>
            <th>类型</th>
            <th>亮度 L 范围</th>
            <th>亮度单调</th>
            <th>速度比（越小越均匀）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(map, index) in COLORMAPS" :key="map.key">
            <td>{{ map.label }}</td>
            <td>{{ KIND_LABELS[map.kind] }}</td>
            <td class="demo-code">
              {{ analyses[index].lMin.toFixed(2) }} ~ {{ analyses[index].lMax.toFixed(2) }}
            </td>
            <td :class="analyses[index].monotonic ? 'colormap-yes' : 'colormap-no'">
              {{ analyses[index].monotonic ? '是' : '否' }}
            </td>
            <td class="demo-code">
              {{ analyses[index].ratio.toFixed(1) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="colormap-note">
        灰度条的速度比大于 1，是因为 sRGB 的灰度码值本身就不是感知均匀的。表中数值是 8 位色带每隔 8 项折算出来的，会受量化影响，只用来比较高低。
      </p>
    </demo-section>

    <demo-section
      title="灰度打印与色觉缺陷下的样子"
      desc="每一行从左到右依次是：原色、转成灰度（按亮度，相当于黑白打印或复印）、红色盲、绿色盲、蓝黄色盲（色盲模拟采用 Machado 2009 矩阵）。亮度单调的色带在灰度下仍是一条平滑的渐变；jet 在灰度下会先变亮再变暗，顺序全乱；cividis 为色觉缺陷者设计，三种色盲下几乎不变。"
    >
      <demo-canvas :width="906" :height="320" :draw="drawViews"/>
    </demo-section>

    <demo-section
      title="同一份数据，不同的色带"
      desc="下面是一张程序生成的数据场：两座平滑的山丘、一条缓缓上升的坡，以及下方一个小而真实的凸起（位于底部中间，灰度图里用红色虚线圆圈标出）。选择两条色带对比：jet 的颜色分界在平缓的坡上形成一圈圈像等高线的“假边缘”，容易让人误以为那些数值处有突变；viridis 的颜色变化均匀，只有数据真正变化的地方才出现明显变化。右侧是灰度版，作为“数据本来的样子”。"
    >
      <div class="demo-controls">
        <label>
          色带 A
          <select v-model="mapA">
            <option v-for="map in COLORMAPS" :key="map.key" :value="map.key">{{ map.label }}</option>
          </select>
        </label>
        <label>
          色带 B
          <select v-model="mapB">
            <option v-for="map in COLORMAPS" :key="map.key" :value="map.key">{{ map.label }}</option>
          </select>
        </label>
      </div>
      <demo-canvas title="色带 A" :width="fieldW" :height="fieldH" :draw="drawA"/>
      <demo-canvas title="色带 B" :width="fieldW" :height="fieldH" :draw="drawB"/>
      <demo-canvas title="灰度" :width="fieldW" :height="fieldH" :draw="drawGray"/>
    </demo-section>

    <demo-section
      title="发散型数据：零点要对准中点"
      desc="当数据有一个有意义的“零点”（温度距平、盈亏、预测误差）时，应当使用发散型色带，并让数据的 0 对准色带的中点。下面的数据场有一个正的大峰、一个负的大谷，下方还有一正一负两个很小的异常点（靠近零）。coolwarm、RdBu 把正负分得清楚，小异常也能看出符号；用顺序型的 viridis 或 jet，正负的界线落在色带中间一个毫无特别的位置，读者看不出零在哪里。Borland 和 Taylor 在 2007 年的论文《Rainbow Color Map (Still) Considered Harmful》里系统地总结了彩虹色带的这些问题。"
    >
      <demo-canvas
        v-for="(draw, index) in divergingDrawers"
        :key="index"
        :title="divergingTitles[index]"
        :width="fieldW"
        :height="fieldH"
        :draw="draw"
      />
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.colormap-table {
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 14px;
    border: 1px solid #DDDEE4;
    text-align: left;
    background: #FFF;
  }
  th {
    background: #F5F6FA;
  }
}
.colormap-yes {
  color: #2E7D32;
}
.colormap-no {
  color: #C62828;
}
.colormap-note {
  max-width: 900px;
  font-size: 12px;
  color: #888;
}
</style>
