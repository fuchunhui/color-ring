<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import type {InputKey} from '../composables/roundtrip';
import {
  SPACES,
  MAX_N,
  TILES_W,
  TILES_H,
  PLOT_W,
  PLOT_H,
  BAND_W,
  BAND_H,
  HIST_W,
  HIST_H,
  getStats,
  originalUnique,
  makeTilesDraw,
  makeErrorPlotDraw,
  drawBands,
  makeHistDraw
} from '../composables/roundtrip';

const input = ref<InputKey>('gradient');
const space = ref(SPACES[0].key);
const count = ref(1);
const gain = ref(4);

const drawTiles = makeTilesDraw(() => input.value, () => space.value, () => count.value);
const drawPlot = makeErrorPlotDraw(() => input.value, () => space.value, () => count.value);
const drawHist = makeHistDraw(() => gain.value);

const info = computed(() => SPACES.find(s => s.key === space.value));
const stats = computed(() => getStats(input.value, space.value));
const lost = computed(() => originalUnique(input.value) - stats.value.unique[count.value - 1]);
</script>

<template>
  <demo-page>
    <demo-section
      title="颜色空间转换会损失多少"
      desc="每次从 sRGB 换到另一个空间再换回来，只要中间那个空间用 8 位整数保存，就会产生舍入误差，还会让一些原本不同的颜色并成同一个。把这个来回重复 N 次，看误差怎样累积。注意：这里的“往返”是 sRGB 8 位 → 目标空间 8 位 → sRGB 8 位，每一跳都取整。误差通常在最初几次就稳定下来，因为第二次转换的输入已经落在目标空间能表示的网格上。"
    >
      <div class="demo-controls">
        <label>
          图像
          <select v-model="input">
            <option value="gradient">渐变测试图</option>
            <option value="photo">示意场景</option>
          </select>
        </label>
        <label>
          转换
          <select v-model="space">
            <option v-for="s in SPACES" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
        </label>
        <label>
          往返次数
          <input v-model.number="count" type="range" min="1" :max="MAX_N">
          <span class="demo-code">{{ count }}</span>
        </label>
      </div>
      <p v-if="info" class="rt-note">
        被量化的内容：{{ info.quantised }}。
      </p>
      <demo-canvas :width="TILES_W" :height="TILES_H" :draw="drawTiles"/>
      <p class="rt-note">
        第 {{ count }} 次往返后：最大误差 {{ stats.max[count - 1] }}，平均误差 {{ stats.mean[count - 1].toFixed(3) }}（码值，0~255），
        不同颜色数 {{ originalUnique(input) }} → {{ stats.unique[count - 1] }}（减少 {{ lost }} 种）。
        {{ stats.converged < MAX_N ? `第 ${stats.converged} 次起结果不再变化。` : '' }}
      </p>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawPlot"/>
    </demo-section>

    <demo-section
      title="位深与色彩条带"
      desc="同一条 0~1 的灰色渐变，量化到不同位深：位数少时能看到明显的台阶（条带）。每个位深画两行，上行直接四舍五入，下行加 8×8 Bayer 有序抖动，抖动用空间换位深，条带变成细点。RGB565 是红 5 位、绿 6 位、蓝 5 位，三个通道的台阶位置不一致，所以灰色渐变里会出现偏绿、偏品红的条纹。10 位和 12 位在这个宽度下已经看不到台阶了；是否看得出还取决于你的屏幕本身是不是 8 位。"
    >
      <demo-canvas :width="BAND_W" :height="BAND_H" :draw="drawBands"/>
    </demo-section>

    <demo-section
      title="后期拉伸会把低位深的缺陷放大"
      desc="一条只占亮度中间一小段的低反差渐变，用“色阶”把对比度拉大。8 位源文件本来在这一段只有约 41 个码值，拉伸后输出的 8 位直方图出现一根根梳齿，中间是空缺的码值，对应画面里的台阶；16 位或浮点源文件有更多中间值，拉伸后的直方图是连续的。这就是后期调色常建议用 RAW、16 位或浮点工作流的原因。"
    >
      <div class="demo-controls">
        <label>
          拉伸倍数
          <input v-model.number="gain" type="range" min="1" max="6" step="0.5">
          <span class="demo-code">{{ gain.toFixed(1) }}×</span>
        </label>
      </div>
      <demo-canvas :width="HIST_W" :height="HIST_H" :draw="drawHist"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.rt-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
</style>
