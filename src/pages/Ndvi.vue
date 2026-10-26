<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ENDMEMBERS, BANDS, BAND_INDEX, ndviRows, pixelInfo} from '../utils/remote';
import {
  VIEW_W,
  VIEW_H,
  SCALE,
  LEGEND_W,
  LEGEND_H,
  SPEC_W,
  SPEC_H,
  drawMapView,
  drawNdviLegend,
  drawSpectra
} from '../composables/ndvi';

const point = ref({x: 60, y: 100});
const get = () => point.value;
const drawTrue = drawMapView('true', get);
const drawFalse = drawMapView('false', get);
const drawNdvi = drawMapView('ndvi', get);
const drawSpec = drawSpectra(get);

const onPick = (e: {x: number; y: number}) => {
  point.value = {x: Math.floor(e.x / SCALE), y: Math.floor(e.y / SCALE)};
};

const info = computed(() => pixelInfo(point.value.x, point.value.y));
const rows = ndviRows();
const mixture = computed(() => {
  return info.value.abundance
    .map((f, k) => ({label: ENDMEMBERS[k].label, f, color: ENDMEMBERS[k].color}))
    .filter(item => item.f > 0.02);
});
</script>

<template>
  <demo-page>
    <demo-section
      title="三种看同一片地的方式"
      desc="卫星传感器除了红、绿、蓝，还会记录近红外等波段。左图是“真彩色”（B4、B3、B2 分别放到红、绿、蓝通道），接近人眼所见；中图是“标准假彩色红外”（近红外 B8 放到红通道，红 B4 放到绿通道，绿 B3 放到蓝通道），植被在近红外反射很强，所以显示为鲜红色，水体几乎全黑，雪是白的；右图是 NDVI 归一化植被指数。假彩色是为了分析而设计的，不是“真实”外观，它把人眼看不见的波段变成了能看见的颜色。这张地表图是程序生成的示意场景（农田、森林、湖泊、河流、小镇、雪山），光谱也是示意曲线，不是真实遥感数据。点击任意图查看那个像素。"
    >
      <demo-canvas title="真彩色（B4 B3 B2）" :width="VIEW_W" :height="VIEW_H" :draw="drawTrue" @pick="onPick"/>
      <demo-canvas title="假彩色红外（B8 B4 B3）" :width="VIEW_W" :height="VIEW_H" :draw="drawFalse" @pick="onPick"/>
      <demo-canvas title="NDVI" :width="VIEW_W" :height="VIEW_H" :draw="drawNdvi" @pick="onPick"/>
      <demo-canvas :width="LEGEND_W" :height="LEGEND_H" :draw="drawNdviLegend"/>
    </demo-section>

    <demo-section
      title="像素检查器：光谱、波段与 NDVI"
      desc="黑色虚线是所选像素的光谱（由各种地物按比例混合，并带有地形明暗），彩色细线是各类地物的光谱，竖直的色带是传感器四个波段（中心波长与带宽取近似值）的响应范围。NDVI = (近红外 − 红) / (近红外 + 红)：叶绿素强烈吸收红光、叶片结构强烈反射近红外，所以植被的 NDVI 高；红边（约 680~750 nm）是植被光谱中反射率陡然升高的位置。"
    >
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpec"/>
      <p class="ndvi-info">
        <strong>({{ point.x }}, {{ point.y }})&emsp;主要地物：{{ info.dominant }}</strong>
        <span class="demo-code">
          B2 {{ info.bands[BAND_INDEX.B2].toFixed(3) }}&emsp;B3 {{ info.bands[BAND_INDEX.B3].toFixed(3) }}
          B4 {{ info.bands[BAND_INDEX.B4].toFixed(3) }}&emsp;B8 {{ info.bands[BAND_INDEX.B8].toFixed(3) }}
          NDVI = {{ info.ndvi.toFixed(2) }}
        </span>
      </p>
      <p class="ndvi-info">
        <span v-for="m in mixture" :key="m.label" class="ndvi-mix">
          <span class="ndvi-dot" :style="{background: m.color}"/>{{ m.label }} {{ Math.round(m.f * 100) }}%
        </span>
      </p>
    </demo-section>

    <demo-section
      title="各类地物的 NDVI"
      desc="NDVI 的取值范围是 −1 到 1：茂密植被通常在 0.6~0.9；裸土、稀疏植被约 0.1~0.3；水体因为近红外几乎全被吸收而为负；雪、云在可见光和近红外都亮，NDVI 接近 0，甚至略小于 0；混凝土也接近 0。下表是由示意光谱按波段响应算出的数值。"
    >
      <table class="ndvi-table">
        <thead>
          <tr>
            <th>地物</th>
            <th>{{ BANDS[BAND_INDEX.B4].label }} 反射率</th>
            <th>{{ BANDS[BAND_INDEX.B8].label }} 反射率</th>
            <th>NDVI</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.label">
            <td><span class="ndvi-dot" :style="{background: ENDMEMBERS[i].color}"/>{{ r.label }}</td>
            <td class="demo-code">
              {{ r.red.toFixed(3) }}
            </td>
            <td class="demo-code">
              {{ r.nir.toFixed(3) }}
            </td>
            <td class="demo-code">
              {{ r.value.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        <span v-for="e in ENDMEMBERS" :key="e.key">
          <strong>{{ e.label }}：</strong>{{ e.note }}。
        </span>
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.ndvi-info {
  margin: 6px 0;
  font-size: 13px;
  strong {
    margin-right: 12px;
  }
}
.ndvi-mix {
  margin-right: 14px;
}
.ndvi-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 5px;
  vertical-align: -1px;
  border: 1px solid #CCC;
}
.ndvi-table {
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
}
</style>
