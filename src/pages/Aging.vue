<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {sConeSignal, lensDensity} from '../utils/aging';
import {
  PLOT_W,
  PLOT_H,
  SCENE_W,
  SCENE_H,
  PAIR_W,
  PAIR_H,
  drawTransmittance,
  drawScene,
  drawPairs
} from '../composables/aging';

const age = ref(70);
const adapt = ref(0.9);

const drawCurve = drawTransmittance(() => age.value);
const drawYoung = drawScene(() => null, () => 0);
const drawRaw = drawScene(() => age.value, () => 0);
const drawAdapted = drawScene(() => age.value, () => adapt.value);
const drawPair = drawPairs(() => age.value, () => adapt.value);

const sSignal = computed(() => Math.round(sConeSignal(age.value) * 100));
const d400 = computed(() => lensDensity(400, age.value).toFixed(2));
</script>

<template>
  <demo-page>
    <demo-section
      title="晶状体会随年龄变黄"
      desc="眼睛里的晶状体是一块透明的蛋白质组织，终生都在缓慢积累黄色色素，对短波（蓝紫）光的吸收越来越强。Pokorny、Smith 和 Lutze（1987）的研究总结：400nm 处的晶状体光密度，在 20 到 60 岁之间平均每十年增加 0.12 个密度单位，60 岁以后每十年增加 0.40。本页模型只采用了这两个增长速率；20 岁的基线密度（0.6）和密度随波长变化的快慢（指数衰减，40nm）是为演示而设的假设值，我没能核对到原始的光谱表（CIE 203:2012 的完整公式含固定部分和随年龄变化的两个分量），所以曲线形状只是示意，不要当作测量值。"
    >
      <div class="demo-controls">
        <label>
          年龄
          <input v-model.number="age" type="range" min="20" max="80" step="1">
          <span class="demo-code">{{ age }} 岁</span>
        </label>
        <span class="demo-code">400nm 密度 {{ d400 }}，S 视锥白光信号 ≈ 20 岁的 {{ sSignal }}%</span>
      </div>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawCurve"/>
    </demo-section>

    <demo-section
      title="透过老眼睛看世界"
      desc="第二张是“突然换眼睛”：不做任何适应，蓝色和白色明显偏黄、偏暗。第三张模拟视觉系统的适应：大脑会把三种视锥的增益重新调整，让白色回到白色（von Kries 缩放）。研究发现，人并不会觉得世界在慢慢变黄，因为这种变化很慢，适应几乎抵消了它；不过白色以外的颜色，尤其是蓝紫色，仍会有一些偏移，信号变弱后噪声的相对比例也变大。适应程度滑块用来调节“补偿了多少”：0 是没有适应，1 是完全适应。需要说明：这是在 3×3 视锥空间里的简化模型，三原色光谱是我设的宽带近似，没有计入瞳孔缩小和视网膜的其他变化。白内障手术摘除变黄的晶状体后，患者常说世界变得“更蓝、更亮”，正是这种适应被突然打破的结果。"
    >
      <div class="demo-controls">
        <label>
          适应程度
          <input v-model.number="adapt" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ Math.round(adapt * 100) }}%</span>
        </label>
      </div>
      <demo-canvas title="20 岁的眼睛" :width="SCENE_W" :height="SCENE_H" :draw="drawYoung"/>
      <demo-canvas :title="`${age} 岁，未适应`" :width="SCENE_W" :height="SCENE_H" :draw="drawRaw"/>
      <demo-canvas :title="`${age} 岁，适应 ${Math.round(adapt * 100)}%`" :width="SCENE_W" :height="SCENE_H" :draw="drawAdapted"/>
    </demo-section>

    <demo-section
      title="蓝色和紫色更难分辨"
      desc="下面每一行是两个很接近的蓝紫色。ΔE 越小越难区分。未适应时，短波信号被晶状体削弱，这对色块的差异也一起变小；适应后差异被拉回一些，但这个模型没有计入噪声：真实的老眼睛里，信号变弱而噪声不变，所以分辨蓝色系的能力仍会下降，这也是为什么老年人在区分深蓝与黑色时常有困难。颜色分辨的下降也有视网膜和神经方面的因素，这里只模拟光学部分。"
    >
      <demo-canvas :width="PAIR_W" :height="PAIR_H" :draw="drawPair"/>
    </demo-section>

    <demo-section
      title="没有做的部分"
      desc="计划中的“2° 与 10° 标准观察者对比”需要 CIE 1964 10° 颜色匹配函数的数据表。我没能取到可核对的表格，也不想凭记忆录入，所以这一项没有做。"
    />
  </demo-page>
</template>
