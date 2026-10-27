<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {WALL_W, WALL_H, SWATCH_W, SWATCH_H, drawWall, drawStripes} from '../composables/shadows';

const lampColor = ref('#ff8a1f');
const power = ref(0.3);
const adapt = ref(1);

const drawPhysical = drawWall(() => lampColor.value, () => power.value, 'physical', () => 0);
const drawPerceived = drawWall(() => lampColor.value, () => power.value, 'perceived', () => adapt.value);

const assumed = ref(0);
const drawOriginal = drawStripes(() => null);
const drawAssumed = drawStripes(() => assumed.value);
const drawCool = drawStripes(() => -1);
const drawNeutral = drawStripes(() => 0);
const drawWarm = drawStripes(() => 1);
</script>

<template>
  <demo-page>
    <demo-section
      title="歌德的彩色阴影"
      desc="一根杆子立在白墙前，两盏灯从两侧照来：一盏白灯、一盏彩灯（颜色和强度可调）。墙上出现两条影子：白灯被挡住的那条，只有彩灯的光落在上面，所以呈彩灯的颜色；彩灯被挡住的那条只有白光，物理上就是纯灰色。左图是按线性光严格算出的物理结果。右图是一个对感知的简化模型：大脑把整面墙的平均照明当作“灯光的颜色”（两灯叠加，带彩灯的色调），并把它从所有区域里除掉（von Kries 缩放）。除掉之后，只被白灯照亮的阴影会偏向彩灯颜色的补色，这就是歌德描述的彩色阴影。适应程度滑块控制除掉了多少。注意：右图不是照片，也不是真实的感知测量，只是同一个想法的计算演示。"
    >
      <div class="demo-controls">
        <label>
          彩灯颜色
          <input v-model="lampColor" type="color">
        </label>
        <label>
          彩灯强度
          <input v-model.number="power" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ Math.round(power * 100) }}%</span>
        </label>
        <label>
          适应程度
          <input v-model.number="adapt" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ Math.round(adapt * 100) }}%</span>
        </label>
      </div>
      <demo-canvas title="物理上的墙面（线性光）" :width="WALL_W" :height="WALL_H" :draw="drawPhysical"/>
      <demo-canvas title="适应后的感知（简化模型）" :width="WALL_W" :height="WALL_H" :draw="drawPerceived"/>
    </demo-section>

    <demo-section
      title="光照歧义：同样的像素，不同的颜色"
      desc="颜色恒常的前提是，大脑要猜出光源的颜色，再把它除掉，得到物体“本来”的颜色。如果照片里光照线索不明确，同一组像素就能被读成不同的颜色。几年前网上流传的那张裙子照片就是这样：一部分人读成白金，一部分人读成蓝黑，一个常被提到的解释是他们对光源的先验假设不同（偏冷的阴影光，或偏暖的人造光），但具体机制仍有争议。这里没有使用那张照片，而是画了一块两种条纹组成的示意布料：一种发灰的蓝色，一种发暗的棕褐色。左边是画面里固定的像素，右边是在不同的光源假设下除掉光源后推断出的“真实颜色”。除以冷色光后，蓝灰条纹变成近乎灰白，棕褐条纹变成偏橙的金色；除以暖色光后，蓝灰条纹变得更蓝，棕褐条纹变得灰暗发黑（亮度做了归一化）。"
    >
      <div class="demo-controls">
        <label>
          假设的光源
          <input v-model.number="assumed" type="range" min="-1" max="1" step="0.05">
          <span class="demo-code">{{ assumed < 0 ? '偏冷（阴影、蓝天光）' : assumed > 0 ? '偏暖（灯泡、夕阳光）' : '中性' }}</span>
        </label>
      </div>
      <demo-canvas title="画面里的像素" :width="SWATCH_W" :height="SWATCH_H" :draw="drawOriginal"/>
      <demo-canvas title="按滑块的假设推断" :width="SWATCH_W" :height="SWATCH_H" :draw="drawAssumed"/>
      <p class="demo-section-desc">
        三个固定位置：
      </p>
      <demo-canvas title="假设光源偏冷" :width="SWATCH_W" :height="SWATCH_H" :draw="drawCool"/>
      <demo-canvas title="假设光源中性" :width="SWATCH_W" :height="SWATCH_H" :draw="drawNeutral"/>
      <demo-canvas title="假设光源偏暖" :width="SWATCH_W" :height="SWATCH_H" :draw="drawWarm"/>
    </demo-section>
  </demo-page>
</template>
