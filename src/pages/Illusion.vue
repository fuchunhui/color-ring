<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  GRAY,
  SIM_W,
  SIM_H,
  ALBERS_W,
  ALBERS_H,
  ALBERS_PATCH,
  ADELSON_W,
  ADELSON_H,
  MUNKER_W,
  MUNKER_H,
  MUNKER_GRAY,
  BEZOLD_W,
  BEZOLD_H,
  CELL,
  ADELSON_A,
  ADELSON_B,
  adelsonValue,
  drawSimultaneous,
  drawAlbers,
  drawAdelson,
  drawMunker,
  drawBezold
} from '../composables/illusion';

const simBridge = ref(false);
const albersBridge = ref(false);
const adelsonBridge = ref(false);
const munkerSolid = ref(false);
const accent = ref('#E03131');

const accents = [
  {value: '#E03131', label: '红'},
  {value: '#1971C2', label: '蓝'},
  {value: '#2F9E44', label: '绿'},
  {value: '#F2C500', label: '黄'}
];

const valueAt = ([col, row]: number[]) => adelsonValue((col + 0.5) * CELL, (row + 0.5) * CELL);
const aValue = valueAt(ADELSON_A);
const bValue = valueAt(ADELSON_B);

const drawSim = (ctx: CanvasRenderingContext2D) => drawSimultaneous(ctx, simBridge.value);
const drawAlb = (ctx: CanvasRenderingContext2D) => drawAlbers(ctx, albersBridge.value);
const drawAde = (ctx: CanvasRenderingContext2D) => drawAdelson(ctx, adelsonBridge.value);
const drawMun = (ctx: CanvasRenderingContext2D) => drawMunker(ctx, munkerSolid.value);
const drawBez = (ctx: CanvasRenderingContext2D) => drawBezold(ctx, accent.value);
</script>

<template>
  <demo-page>
    <demo-section
      title="同时对比：同一块灰，五种背景"
      desc="五个灰块的像素值完全相同，但放在白底上显得偏暗，放在黑底上显得偏亮，放在彩色底上还会略带背景的补色。一种常见的解释是视觉系统会强调相邻区域的差别（侧抑制），所以感知到的明暗和色相依赖周围；这只是简化的说法，真实机制还包括更高层的处理。勾选后用一条同色的连接条把灰块连起来，它们就变得一样了。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="simBridge" type="checkbox">
          盖上连接条
        </label>
        <span class="demo-code">灰块实际值：rgb({{ GRAY }}, {{ GRAY }}, {{ GRAY }})</span>
      </div>
      <demo-canvas :width="SIM_W" :height="SIM_H" :draw="drawSim"/>
    </demo-section>

    <demo-section
      title="阿尔伯斯：一种颜色，看成两种"
      desc="左右两个小方块是同一个颜色。浅色背景上它显得更深更暗，深色背景上显得更浅更亮。画家约瑟夫·阿尔伯斯用这类练习说明：颜色不是孤立存在的，我们看到的总是颜色之间的关系。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="albersBridge" type="checkbox">
          盖上连接条
        </label>
        <span class="demo-code">小方块实际值：{{ ALBERS_PATCH }}</span>
      </div>
      <demo-canvas :width="ALBERS_W" :height="ALBERS_H" :draw="drawAlb"/>
    </demo-section>

    <demo-section
      title="阿德尔森棋盘阴影"
      desc="方块 A 和方块 B 的灰度完全相同。A 周围是亮方块，B 位于圆柱的阴影里、周围是更暗的方块。大脑会把阴影的影响扣除掉，推断 B 的“真实”颜色比 A 浅，于是我们看到的 B 比 A 亮。这个例子常被用来说明：视觉看到的是对物体表面的推断，不是像素数值本身。勾选后用同灰度的连接条把两块连起来。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="adelsonBridge" type="checkbox">
          盖上连接条
        </label>
        <span class="demo-code">A = {{ aValue }}，B = {{ bValue }}（灰度，0~255）</span>
      </div>
      <demo-canvas :width="ADELSON_W" :height="ADELSON_H" :draw="drawAde"/>
    </demo-section>

    <demo-section
      title="孟克—怀特错觉：灰条被条纹“染色”"
      desc="左右两侧的灰色条完全相同，但夹在红色条纹里的灰条看上去偏红粉，夹在蓝色条纹里的偏蓝。这里条纹与灰条交替排列，颜色被“同化”，与同时对比的方向相反。解释仍有争议，常见说法涉及空间频率较高时的颜色扩散。勾选后去掉灰条上的彩色条纹，灰条就恢复一致。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="munkerSolid" type="checkbox">
          去掉灰条上的彩色条纹
        </label>
        <span class="demo-code">灰条实际值：{{ MUNKER_GRAY }}</span>
      </div>
      <demo-canvas :width="MUNKER_W" :height="MUNKER_H" :draw="drawMun"/>
    </demo-section>

    <demo-section
      title="贝措尔德扩散效应"
      desc="只把其中两段的黑线换成彩色线，这两段里的“白底”就好像被染上了线的颜色，整体变得更亮或更偏色，尽管白底的像素没有任何改变。细线的颜色会与背景在视觉上混合，这是同化的一种表现。"
    >
      <div class="demo-controls">
        <label>
          彩线颜色
          <select v-model="accent">
            <option v-for="item in accents" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>
      <demo-canvas :width="BEZOLD_W" :height="BEZOLD_H" :draw="drawBez"/>
    </demo-section>
  </demo-page>
</template>
