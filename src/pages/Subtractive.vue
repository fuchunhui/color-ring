<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {rgbHex} from '../utils/spectral';
import {
  MIXERS,
  PIGMENT_W,
  PIGMENT_H,
  OVERPRINT_H,
  STRIP_W,
  STRIP_H,
  MIX_W,
  MIX_H,
  drawPigments,
  drawOverprint,
  drawMixStrips,
  drawMixSpectra
} from '../composables/subtractive';

const blue = ref(50);

const weight = () => blue.value / 100;

const drawStrips = drawMixStrips(weight);
const drawSpectra = drawMixSpectra(weight);

const results = computed(() => MIXERS.map(({name, mix}) => ({name, hex: rgbHex(mix(weight()))})));
</script>

<template>
  <demo-page>
    <demo-section
      title="颜料的反射率曲线"
      desc="颜料不会“发”光，只是吸收一部分光、反射剩下的。纵轴是反射率：白纸全部反射；青颜料吸收红光，反射蓝绿光；品红吸收绿光；黄吸收蓝光；这里的蓝颜料除了蓝光，还会反射不少青绿光，这个小细节是后面“蓝加黄变绿”的关键。所有曲线是示意用的平滑函数，不是某种真实颜料的测量值；颜色方块是它们在 D65 日光下的样子。"
    >
      <demo-canvas :width="PIGMENT_W" :height="PIGMENT_H" :draw="drawPigments"/>
    </demo-section>

    <demo-section
      title="蓝颜料 + 黄颜料：光谱混合 vs RGB 近似"
      desc="两种颜料混在一起，每一种颜料都吸收自己吸收的那部分光，所以混合后的反射率更接近两条曲线逐波长相乘（加权几何平均）；两条曲线只在青绿波段同时有反射，结果是柔和偏暗的绿色。下面把同一对端点颜色用不同方法混合做对比：光谱算术平均相当于两种颜料颗粒并排摆放、光学上不叠加（比如点彩画），结果更亮更偏黄；RGB 平均、RGB 相乘、1−RGB 叠加（本项目 CMYK 页的做法）都只看三个数，中间色的亮度和饱和度与光谱混合各不相同，其中 1−RGB 叠加在中段几乎变黑。若端点换成纯 #0000FF 与 #FFFF00（最后一行），RGB 平均的中点是纯灰色，这就是“RGB 里蓝加黄得不到绿”的经典例子。选用不同的蓝、黄端点会改变具体数值，但光谱混合给出的“绿”来自两条曲线重叠的波段，这是 RGB 三个数无法表达的。"
    >
      <div class="demo-controls">
        <label>
          蓝颜料占比
          <input v-model.number="blue" type="range" min="0" max="100" step="10">
          <span class="demo-code">蓝 {{ blue }}% / 黄 {{ 100 - blue }}%</span>
        </label>
      </div>
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawStrips"/>
      <demo-canvas :width="MIX_W" :height="MIX_H" :draw="drawSpectra"/>
      <div class="demo-code">
        <div v-for="r in results" :key="r.name">
          {{ r.name }}：{{ r.hex }}
        </div>
      </div>
    </demo-section>

    <demo-section
      title="青 + 品红 + 黄 全部叠印：为什么印刷还需要 K"
      desc="把三种理想油墨一层层叠在白纸上，曲线越叠越低，颜色依次变成蓝、红、绿，最后接近黑色。但真实油墨的吸收不是理想的，三层叠起来通常是发棕的深灰，而不是纯黑，而且三层油墨同时印刷还会让纸张过湿、成本变高。所以印刷会额外加一版黑色油墨（K，Key plate）专门负责黑色和文字，这也是 CMYK 中 K 的由来。"
    >
      <demo-canvas :width="PIGMENT_W" :height="OVERPRINT_H" :draw="drawOverprint"/>
    </demo-section>

    <demo-section
      title="为什么美术里有 RYB"
      desc="画家早就发现“蓝颜料加黄颜料变绿、红加黄变橙、红加蓝变紫”，在没有光谱和 RGB 概念的年代，红黄蓝就成了美术的三原色。从上面的实验能看出，这并不是红黄蓝有什么特殊，而是常见蓝颜料的反射率里本来就含有青绿，常见红颜料里含有品红的成分。现代印刷与摄影选择青、品红、黄做减色三原色，因为它们各自只吸收一个波段，混合范围比红黄蓝更大。"
    />
  </demo-page>
</template>
