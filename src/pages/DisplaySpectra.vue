<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {DISPLAYS, OBSERVER_SHIFTS, computeDisplays, observerTable} from '../utils/displayspec';
import {
  SPEC_W,
  SPEC_H,
  CHART_W,
  CHART_H,
  makeSpectrumDraw,
  drawChart,
  makeShiftDraw
} from '../composables/displayspec';

const index = ref(2);
const drawSpectrum = makeSpectrumDraw(() => index.value);
const results = computeDisplays();
const observers = observerTable();
const drawShift = makeShiftDraw(observers.map((o, i) => ({label: o.label, color: DISPLAYS[i].color, du: o.du})), OBSERVER_SHIFTS);
const note = computed(() => DISPLAYS[index.value].note);
const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;
</script>

<template>
  <demo-page>
    <demo-section
      title="显示器的三原色光谱"
      desc="显示器的颜色来自红、绿、蓝三种原色光。不同技术发出的原色光谱很不一样：有的又宽又平，有的窄得像一根针。下面的曲线是我按公开描述的峰位和宽度搭出来的示意光谱，不是某款面板的实测数据。"
    >
      <div class="demo-controls">
        <label>
          技术
          <select v-model.number="index">
            <option v-for="(d, i) in DISPLAYS" :key="d.key" :value="i">{{ d.label }}</option>
          </select>
        </label>
      </div>
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpectrum"/>
      <p class="display-note">
        {{ note }}
      </p>
    </demo-section>

    <demo-section
      title="原色越窄，色域越大"
      desc="每个原色的光谱积分后得到一个 xy 坐标，三个原色围成的三角形就是这台显示器能显示的色域。越窄的光谱越接近马蹄形边缘上的单色光，三角形就越大。下图用实线画五种技术，灰色虚线是 Rec.709、Display P3、Rec.2020。面积比和覆盖率都在 xy 平面上用多边形求交计算，xy 平面不均匀，只能看大致趋势。"
    >
      <demo-canvas :width="CHART_W" :height="CHART_H" :draw="drawChart"/>
      <table class="display-table">
        <thead>
          <tr>
            <th>技术</th>
            <th>面积 / Rec.709</th>
            <th>覆盖 Rec.709</th>
            <th>覆盖 P3</th>
            <th>覆盖 Rec.2020</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in results" :key="r.key">
            <td><span class="display-dot" :style="{background: r.color}"/>{{ r.label }}</td>
            <td>{{ r.areaRatio.toFixed(2) }}×</td>
            <td>{{ pct(r.coverRec709) }}</td>
            <td>{{ pct(r.coverP3) }}</td>
            <td>{{ pct(r.coverRec2020) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="display-note">
        代价：窄带原色的亮度效率和观察者差异（见下一节）会变差；而且内容本身如果只有 sRGB，宽色域显示器必须做色彩管理，否则颜色会过饱和。
      </p>
    </demo-section>

    <demo-section
      title="观察者同色异谱失效"
      desc="标准观察者（CIE 1931 2°）是一个平均值，真实的人眼有差异。让每台显示器用自己的三原色拼出 D65 白（对标准观察者完全一样），再让一个“示意观察者”去看：这里简单地把颜色匹配函数整体平移 ±5、±10 nm，模拟视锥峰位的个体差异，它不是某个真实人群的数据。结果是原色越窄的显示器，白点漂得越多：两个人看同一块屏，白的偏色方向和大小会不同。"
    >
      <demo-canvas :width="560" :height="360" :draw="drawShift"/>
      <p class="display-note">
        宽带的 CCFL 和白光 LED 因为光谱平滑，匹配函数平移后积分变化小；激光是三条线，对应位置的匹配函数值一变，白点就变得多。这也是宽色域、窄带屏幕上常有人抱怨“白点偏色、两台屏看起来不一样”的原因之一。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.display-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
.display-table {
  border-collapse: collapse;
  margin: 12px 0 4px;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 6px 12px;
    border: 1px solid #E5E6EB;
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
}
.display-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 50%;
}
</style>
