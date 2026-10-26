<script setup lang="ts">
import {ref, reactive, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {luminanceOf} from '../utils/appearance';
import type {Vec3} from '../utils/space';
import {
  HK_W,
  HK_H,
  HK_PAIRS,
  BB_W,
  BB_H,
  BB_PLOT_H,
  ABNEY_W,
  ABNEY_STRIP_H,
  ABNEY_PLOT_H,
  HUNT_W,
  HUNT_H,
  hkGrayY,
  drawHk,
  drawBezoldPatches,
  drawBezoldPlot,
  drawAbneyStrips,
  drawAbneyPlot,
  hexToRgb,
  huntRows,
  drawHunt,
  drawStevens
} from '../composables/appearance';

const showHk = ref(false);
const hk = reactive(HK_PAIRS.map(() => 1));
const hkDraws = HK_PAIRS.map((p, i) => drawHk(p, () => hk[i]));
const hkNumbers = (i: number) => ({
  sat: luminanceOf(HK_PAIRS[i].rgb).toFixed(3),
  gray: hkGrayY(HK_PAIRS[i], hk[i]).toFixed(3)
});

const l0 = ref(600);
const logRatio = ref(2);
const drawBB = drawBezoldPatches(() => l0.value, () => logRatio.value);

const ABNEY_STARTS: {label: string; rgb: Vec3}[] = [
  {label: '蓝 #0000FF', rgb: [0, 0, 255]},
  {label: '青蓝 #0080FF', rgb: [0, 128, 255]},
  {label: '红 #FF0000', rgb: [255, 0, 0]},
  {label: '绿 #00C800', rgb: [0, 200, 0]}
];
const abneyIndex = ref(0);
const abneyRgb = computed(() => ABNEY_STARTS[abneyIndex.value].rgb);
const drawStrips = drawAbneyStrips(() => abneyRgb.value);
const drawAbneyHue = drawAbneyPlot(() => abneyRgb.value);

const huntHex = ref('#d04030');
const huntRgb = computed(() => hexToRgb(huntHex.value));
const rows = computed(() => huntRows(huntRgb.value));
const drawHuntPlot = drawHunt(() => huntRgb.value);
</script>

<template>
  <demo-page>
    <demo-section
      title="Helmholtz–Kohlrausch 效应：饱和的颜色看起来更亮"
      desc="下面每一对色块里，右边灰块的亮度 Y 默认与左边的彩色完全相同（按 CIE 相对亮度计算）。但大多数人会觉得彩色那一块更亮，这就是 Helmholtz–Kohlrausch 效应：同样的亮度，色度越高，看起来越亮。拖动滑块调整灰块的亮度，直到你觉得两边一样亮，再勾选“显示实际亮度”对答案：如果你把灰块调得比 1.00 更亮，说明你也感受到了这个效应。本页只做演示，没有给出定量预测公式（Fairchild–Pirrotta 1991 等的经验模型这里未实现）。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="showHk" type="checkbox">
          显示实际亮度
        </label>
      </div>
      <div class="appearance-pairs">
        <div v-for="(p, i) in HK_PAIRS" :key="p.name" class="appearance-pair">
          <demo-canvas :title="p.name" :width="HK_W" :height="HK_H" :draw="hkDraws[i]"/>
          <label class="appearance-slider">
            灰块亮度 ×
            <input v-model.number="hk[i]" type="range" min="0.5" max="1.6" step="0.01">
            <span class="demo-code">{{ hk[i].toFixed(2) }}</span>
          </label>
          <div v-if="showHk" class="demo-code appearance-note">
            彩色 Y = {{ hkNumbers(i).sat }}<br>灰块 Y = {{ hkNumbers(i).gray }}
          </div>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="Bezold–Brücke 效应：亮度变了，色相也会漂"
      desc="同一束单色光，强度提高后色相会发生偏移：除了少数几个“不变色相”（常被引用的约 474、506、571 nm），其余波长的色相都会随强度改变。下面的曲线是一个示意模型：强度每增加 10 倍，色相向最近的不变色相靠拢 15%。方向和大小只是教学用的简化，并非实测数据，真实的偏移还与观察者和实验条件有关。屏幕无法真正改变一束光的强度，所以左右色块只是把同一个颜色按不同亮度显示，右下角的小块是“模型预测的感知色相”。曲线在相邻两个不变色相的中点处出现跳变，那是“拉向最近的不变色相”这条简化规则造成的，真实的偏移是连续变化的。"
    >
      <div class="demo-controls">
        <label>
          波长 λ
          <input v-model.number="l0" type="range" min="450" max="650" step="1">
          <span class="demo-code">{{ l0 }} nm</span>
        </label>
        <label>
          强度提高倍数（10 的幂）
          <input v-model.number="logRatio" type="range" min="0" max="2" step="0.1">
          <span class="demo-code">× {{ Math.round(10 ** logRatio) }}</span>
        </label>
      </div>
      <demo-canvas :width="BB_W" :height="BB_H" :draw="drawBB"/>
      <demo-canvas :width="BB_W" :height="BB_PLOT_H" :draw="drawBezoldPlot"/>
    </demo-section>

    <demo-section
      title="Abney 效应：掺入白光，色相也会变"
      desc="给一个单色光掺入白光，使它变淡（降低饱和度），感知到的色相会发生偏移，这叫 Abney 效应（1909）；偏移的方向和大小随色相而异。设计软件里常见的“把蓝色渐变到白色会变紫”，则是另一回事：它来自插值空间本身不均匀。下面把同一种颜色向白色混合，分别在五个空间里做线性插值，并用 CAM16 的色相角当尺子，量化每条路径上色相偏移了多少：偏得越少，越接近“只变淡、不变色”。"
    >
      <div class="demo-controls">
        <label>
          起始颜色
          <select v-model.number="abneyIndex">
            <option v-for="(s, i) in ABNEY_STARTS" :key="s.label" :value="i">{{ s.label }}</option>
          </select>
        </label>
      </div>
      <demo-canvas :width="ABNEY_W" :height="ABNEY_STRIP_H" :draw="drawStrips"/>
      <demo-canvas :width="ABNEY_W" :height="ABNEY_PLOT_H" :draw="drawAbneyHue"/>
    </demo-section>

    <demo-section
      title="Hunt 效应与 Stevens 效应：环境越亮，颜色越鲜艳、对比越强"
      desc="用 CAM16 计算同一个 XYZ 在不同适应亮度 L_A（背景 20%，平均环境）下的外观。Hunt 效应：环境越亮，同一个颜色看起来越鲜艳（色彩度 M 增大，而相对的色度 C 几乎不变）。Stevens 效应：环境越亮，明暗对比越强，也就是亮度 Q 随相对亮度 Y 上升得越陡。注意 CAM16 的明度 J 是相对于白点的量，几乎不随 L_A 变化，对比度的增加体现在亮度 Q 的跨度上。"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="huntHex" type="color">
          <span class="demo-code">{{ huntHex.toUpperCase() }}</span>
        </label>
      </div>
      <table class="demo-code appearance-table">
        <thead>
          <tr>
            <th>L_A（cd/m²）</th>
            <th>J 明度</th>
            <th>C 色度</th>
            <th>M 色彩度</th>
            <th>Q 亮度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.la">
            <td>{{ r.la }}</td>
            <td>{{ r.J.toFixed(1) }}</td>
            <td>{{ r.C.toFixed(1) }}</td>
            <td>{{ r.M.toFixed(1) }}</td>
            <td>{{ r.Q.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
      <demo-canvas title="Hunt 效应" :width="HUNT_W" :height="HUNT_H" :draw="drawHuntPlot"/>
      <demo-canvas title="Stevens 效应" :width="HUNT_W" :height="HUNT_H" :draw="drawStevens"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.appearance-pairs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 20px;
}

.appearance-pair {
  width: 240px;
  margin-bottom: 12px;
  .demo-canvas {
    margin-right: 0;
    margin-bottom: 6px;
  }
}

.appearance-slider {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  input[type="range"] {
    width: 100px;
  }
}

.appearance-note {
  margin-top: 4px;
  line-height: 18px;
}

.appearance-table {
  border-collapse: collapse;
  background: #FFF;
  margin: 4px 0 12px;
  th,
  td {
    padding: 4px 14px;
    border: 1px solid #DDDEE4;
    text-align: right;
  }
}
</style>
