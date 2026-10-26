<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  GLASSES,
  PRISM_W,
  PRISM_H,
  PLOT_W,
  PLOT_H,
  DROP_W,
  DROP_H,
  CURVE_W,
  CURVE_H,
  SKY_W,
  SKY_H,
  bowRows,
  drawPrism,
  drawPrismCurve,
  drawDropDiagram,
  drawDropCurve,
  drawRainbowSky
} from '../composables/rainbow';

const apex = ref(60);
const inc = ref(50);
const glass = ref('bk7');
const bow = ref(1);
const sun = ref(18);

const prismState = () => ({apex: apex.value, inc: inc.value, glass: glass.value});
const dropState = () => ({k: bow.value});
const skyState = () => ({sun: sun.value});

const drawPrismFan = drawPrism(prismState);
const drawPrismPlot = drawPrismCurve(prismState);
const drawDrop = drawDropDiagram(dropState);
const drawDropPlot = drawDropCurve(dropState);
const drawSky = drawRainbowSky(skyState);

const rows = computed(() => bowRows(bow.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="棱镜：白光为什么会散开"
      desc="玻璃的折射率随波长略有不同：蓝紫光折射率大、偏折得多，红光折射率小、偏折得少，这叫色散。光线进、出棱镜各折射一次，两次偏折叠加，不同颜色就沿不同方向散开，在屏上排成一条光谱。折射率用 Cauchy 近似 n = A + B/λ²。偏向角随入射角变化，在某个入射角处最小（此时光在棱镜里平行于底边、进出对称），牛顿正是用这个位置做实验。火石玻璃的色散比冕牌玻璃大，同样的顶角能拉开更宽的光谱。"
    >
      <div class="demo-controls">
        <label>
          顶角
          <input v-model.number="apex" type="range" min="30" max="70" step="1">
          <span class="demo-code">{{ apex }}°</span>
        </label>
        <label>
          入射角
          <input v-model.number="inc" type="range" min="20" max="80" step="0.5">
          <span class="demo-code">{{ inc }}°</span>
        </label>
        <label>
          玻璃
          <select v-model="glass">
            <option v-for="item in GLASSES" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
      </div>
      <demo-canvas title="光线路径与光谱" :width="PRISM_W" :height="PRISM_H" :draw="drawPrismFan"/>
      <demo-canvas title="偏向角随入射角变化" :width="PLOT_W" :height="PLOT_H" :draw="drawPrismPlot"/>
    </demo-section>

    <demo-section
      title="雨滴：彩虹角是怎么来的"
      desc="阳光射入球形水滴，在背面反射后再射出（主虹一次内反射，副虹两次）。入射角不同，出射方向也不同，但偏向角 D 有一个最小值：很多光线挤在这个最小偏向角附近射出，所以那个方向最亮，这就是彩虹。D 的最小值随颜色略有不同（红光折射率小，D 最小值也小），所以红光出现在彩虹角最大的位置，也就是主虹的外圈。副虹多反射了一次，颜色顺序反过来，亮度也更低。彩虹角是从“反日点”（太阳的正对面）量起的：主虹约 40–42°，副虹约 51–54°。"
    >
      <div class="demo-controls">
        <label>
          类型
          <select v-model.number="bow">
            <option :value="1">主虹（1 次内反射）</option>
            <option :value="2">副虹（2 次内反射）</option>
          </select>
        </label>
      </div>
      <demo-canvas title="水滴里的光线（观察者在左侧）" :width="DROP_W" :height="DROP_H" :draw="drawDrop"/>
      <demo-canvas title="偏向角与入射角" :width="CURVE_W" :height="CURVE_H" :draw="drawDropPlot"/>
      <table class="rainbow-table">
        <thead>
          <tr>
            <th>波长</th>
            <th>折射率 n</th>
            <th>最小偏向的入射角</th>
            <th>最小偏向角 D</th>
            <th>彩虹角</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.l">
            <td>{{ row.l }} nm</td>
            <td>{{ row.n.toFixed(4) }}</td>
            <td>{{ row.incidence.toFixed(1) }}°</td>
            <td>{{ row.dmin.toFixed(1) }}°</td>
            <td>{{ row.alpha.toFixed(1) }}°</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="一幅彩虹"
      desc="把上面的结果画成图：在每个观察方向上，统计各个波长的光线密度，再换成颜色。主虹内侧的天空更亮（光线都向这一侧偏），主虹和副虹之间几何光学上没有光线，这条暗带叫亚历山大暗带；副虹外侧又变亮。彩虹的圆心在反日点，也就是你自己影子的头部方向，太阳越高，反日点越低，能看到的彩虹弧段就越少，太阳高度超过约 42° 时地面上就看不到主虹了。真实的彩虹边缘还有干涉形成的“过剩虹”（主虹内侧的淡淡粉绿条纹），这里没有计算，边缘只做了 0.3° 的高斯柔化。"
    >
      <div class="demo-controls">
        <label>
          太阳高度
          <input v-model.number="sun" type="range" min="0" max="50" step="1">
          <span class="demo-code">{{ sun }}°</span>
        </label>
      </div>
      <demo-canvas :width="SKY_W" :height="SKY_H" :draw="drawSky"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.rainbow-table {
  border-collapse: collapse;
  background: #FFF;
  margin: 4px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 6px 14px;
    border: 1px solid #E3E6EA;
    text-align: center;
  }
  th {
    background: #F5F6FA;
    font-weight: 500;
  }
}
</style>
