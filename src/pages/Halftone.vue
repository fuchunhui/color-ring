<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {PLATES, drawPlate, drawOverprint} from '../composables/halftone';
import {getSource} from '../utils/testimage';

const SIZE = 280;

const cell = ref(10);
const enabled = ref([true, true, true, true]);
const sameAngle = ref(false);

const drawSource = (ctx: CanvasRenderingContext2D) => {
  ctx.putImageData(getSource('gradient', SIZE, SIZE), 0, 0);
};

const makePlateDraw = (index: number) => (ctx: CanvasRenderingContext2D) => {
  drawPlate(ctx, getSource('gradient', SIZE, SIZE), index, cell.value, sameAngle.value);
};

const drawComposite = (ctx: CanvasRenderingContext2D) => {
  drawOverprint(ctx, getSource('gradient', SIZE, SIZE), cell.value, enabled.value, sameAngle.value);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="印刷网点（CMYK 半色调）"
      desc="印刷机只能“有墨”或“没墨”，没法直接印出深浅。于是把每种墨拆成大小不一的网点：颜色越浓，网点越大，人眼远看时把网点和白纸混在一起，就感觉到了深浅。这里用朴素公式 k = 1 − max(R,G,B)，c、m、y = (max − 分量) / max 把图片拆成 C、M、Y、K 四张网版。印刷并不是把 RGB 取反，而是四张网版分别上墨、叠印出来的。"
    >
      <div class="demo-controls">
        <label>
          网格大小
          <input v-model.number="cell" type="range" min="4" max="24" step="1">
          <span class="demo-code">{{ cell }}px</span>
        </label>
        <label v-for="(plate, index) in PLATES" :key="plate.key">
          <input v-model="enabled[index]" type="checkbox">
          {{ plate.label }}（{{ plate.angle }}°）
        </label>
        <label>
          <input v-model="sameAngle" type="checkbox">
          所有网版同一角度（观察撞网/莫尔条纹）
        </label>
      </div>
    </demo-section>

    <demo-section
      title="原图与四张网版"
      desc="每个网点所在的格子取该处墨量的平均值，点的面积正比于墨量。每张网版单独看都只是一种墨色的点阵，网格各自旋转了不同的角度。"
    >
      <demo-canvas title="原图" :width="SIZE" :height="SIZE" :draw="drawSource"/>
      <demo-canvas
        v-for="(plate, index) in PLATES"
        :key="plate.key"
        :title="`${plate.label}（网角 ${sameAngle ? 45 : plate.angle}°）`"
        :width="SIZE"
        :height="SIZE"
        :draw="makePlateDraw(index)"
      />
    </demo-section>

    <demo-section
      title="叠印合成"
      desc="四张网版用 multiply 叠在白纸上：青 × 品红 = 蓝，青 × 黄 = 绿，品红 × 黄 = 红，三者叠加接近黑色。为什么要把四张网版的角度错开？如果角度相同，网点要么完全重叠，要么相互错位，稍有套印误差就会出现明显的色偏；角度不同则会形成规整的玫瑰花结图案，不容易被察觉。勾选“同一角度”并调整网格大小，可以对比图案的差别。黄色最浅，即使与其他版只差 15° 也不容易看出莫尔条纹；最显眼的黑版放在 45°，与青、品红各差 30°。"
    >
      <demo-canvas title="原图" :width="SIZE" :height="SIZE" :draw="drawSource"/>
      <demo-canvas title="叠印结果" :width="SIZE" :height="SIZE" :draw="drawComposite"/>
    </demo-section>
  </demo-page>
</template>
