<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {LINE_SOURCES} from '../utils/optics';
import {
  FLAMES,
  SPEC_W,
  SPEC_H,
  TUBES_W,
  TUBES_H,
  LEVELS_W,
  LEVELS_H,
  SCENE_W,
  SCENE_H,
  lampHex,
  drawLineSpectrum,
  drawTubes,
  drawEnergyLevels,
  drawSodiumScene
} from '../composables/emission';

const element = ref('h');
const drawSpectrum = drawLineSpectrum(() => element.value);
const drawTubeRow = drawTubes();
const drawLevels = drawEnergyLevels();
const drawWhite = drawSodiumScene(false);
const drawSodium = drawSodiumScene(true);

const hex = computed(() => lampHex(element.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="原子的指纹：发射谱线"
      desc="原子里的电子只能处在一些分立的能级上。电子从高能级跳到低能级，会放出一个光子，能量等于两能级之差，波长 λ = hc/ΔE。每种元素的能级不同，发出的光就只有几条特定波长的亮线，叫线状光谱，是元素的“指纹”。拿到一束光，把它按波长展开，对照谱线就能知道里面有什么元素（光谱分析），太阳里的氦就是先从光谱里发现的。下面的亮线位置取自常见的谱线数据，高度是示意的相对强度；灯光的颜色是把各谱线的颜色按强度相加得到的。"
    >
      <div class="demo-controls">
        <label>
          元素
          <select v-model="element">
            <option v-for="item in LINE_SOURCES" :key="item.key" :value="item.key">
              {{ item.name }}（{{ item.symbol }}）
            </option>
          </select>
        </label>
        <span class="demo-code">灯光颜色 {{ hex }}</span>
      </div>
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpectrum"/>
      <demo-canvas title="氢原子的能级与巴尔末线系" :width="LEVELS_W" :height="LEVELS_H" :draw="drawLevels"/>
    </demo-section>

    <demo-section
      title="放电管：霓虹灯的颜色"
      desc="把低压气体封在玻璃管里，两端加高压，气体被电离并发光，这就是气体放电灯。管里充什么气体，就发出那种气体的谱线：氖是明亮的红橙色（霓虹灯 neon 一词就来自氖），氦偏粉白，氢是紫粉色，汞发蓝白光（它的紫外线再激发荧光粉，就是日光灯），钠是黄色（老式的路灯）。其他颜色的霓虹灯，通常是在管壁涂荧光粉，或者在氖里混入氩、汞来调色。这里的颜色由各元素的主要谱线相加得到，强度是示意值，真实的放电管颜色还与气压、电流有关。"
    >
      <demo-canvas :width="TUBES_W" :height="TUBES_H" :draw="drawTubeRow"/>
    </demo-section>

    <demo-section
      title="焰色反应"
      desc="把金属盐放进火焰，金属原子被加热到激发态，回到低能级时发光，火焰就染上了特征的颜色，可以用来粗略地鉴别金属元素。焰色来自原子谱线，也来自火焰里生成的小分子（如 CaOH、SrOH）的谱带，所以与放电管里单纯的原子谱线不完全相同。下表的颜色是典型外观，手工取色，仅供参考；实际观察的颜色与火焰温度、杂质、背景都有关，钠的黄光很强，常盖住其他元素，所以观察钾时要透过蓝色钴玻璃。"
    >
      <table class="emission-table">
        <thead>
          <tr>
            <th>元素</th>
            <th>火焰颜色</th>
            <th>主要发射</th>
            <th>外观</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flame in FLAMES" :key="flame.symbol">
            <td>{{ flame.name }}（{{ flame.symbol }}）</td>
            <td>
              <span class="emission-swatch" :style="{background: flame.color}"/>
              <span class="demo-code">{{ flame.color }}</span>
            </td>
            <td>{{ flame.spectrum }}</td>
            <td>{{ flame.look }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="钠灯下，颜色去哪了"
      desc="老式的低压钠路灯几乎只发 589 nm 这一个波长。物体的颜色取决于它对各个波长的反射，光源里只有一个波长时，所有物体只剩下“在这个波长反射多少”的区别，颜色就消失了：只有明暗的差别，色相全是黄的。红色、黄色物体仍然偏亮，蓝色、紫色物体几乎是黑的。右边按这个思路渲染了同一幅场景，每个像素的反射率近似取红、绿通道的加权平均，只是示意，不是光谱级的渲染。"
    >
      <demo-canvas title="白光" :width="SCENE_W" :height="SCENE_H" :draw="drawWhite"/>
      <demo-canvas title="钠灯（589 nm）" :width="SCENE_W" :height="SCENE_H" :draw="drawSodium"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.emission-table {
  border-collapse: collapse;
  background: #FFF;
  margin: 4px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 8px 14px;
    border: 1px solid #E3E6EA;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    font-weight: 500;
  }
}
.emission-swatch {
  display: inline-block;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border: 1px solid #DDD;
  vertical-align: middle;
}
</style>
