<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  MATERIALS,
  SPECTRUM_W,
  SPECTRUM_H,
  STRIP_W,
  STRIP_H,
  BUBBLE_SIZE,
  filmHex,
  drawFilmSpectrum,
  drawThicknessStrip,
  drawBubble
} from '../composables/thinfilm';

const material = ref('soap');
const thickness = ref(300);
const angle = ref(0);

const state = () => ({material: material.value, d: thickness.value, theta: angle.value});

const drawSpectrum = drawFilmSpectrum(state);
const drawStrip = drawThicknessStrip(state);
const drawBubbleScene = drawBubble(state);

const current = computed(() => MATERIALS.find(item => item.key === material.value) || MATERIALS[0]);
const hex = computed(() => filmHex(state()));
</script>

<template>
  <demo-page>
    <demo-section
      title="薄膜干涉：一层很薄的膜为什么有颜色"
      desc="光照到薄膜上，一部分在上表面反射，一部分穿过膜、在下表面反射后再出来。两束反射光走过的路程差约为 2·n·d·cosθ（n 是膜的折射率，d 是厚度）。某个波长的光如果两束反射光正好同相，就互相加强；反相则互相抵消。厚度不同，被加强的波长就不同，眼睛看到的颜色也就不同。下面用 Airy 公式（只算相干的多次反射，s 光与 p 光取平均）算出反射率，再用 D65 日光和 CIE 颜色匹配函数换成颜色；为了看清色相，亮度按“这层膜可能达到的最亮反射”归一化。这是一个简化模型，没有考虑色散、光源的角度扩展和真实膜的不均匀。"
    >
      <div class="demo-controls">
        <label>
          材料
          <select v-model="material">
            <option v-for="item in MATERIALS" :key="item.key" :value="item.key">
              {{ item.name }}（n = {{ item.n1 }}）
            </option>
          </select>
        </label>
        <label>
          厚度
          <input v-model.number="thickness" type="range" min="0" max="1500" step="5">
          <span class="demo-code">{{ thickness }} nm</span>
        </label>
        <label>
          入射角
          <input v-model.number="angle" type="range" min="0" max="80" step="1">
          <span class="demo-code">{{ angle }}°</span>
        </label>
      </div>
      <p class="demo-code">
        {{ current.name }}，{{ current.substrate }}（n₂ = {{ current.n2 }}）；颜色 {{ hex }}
      </p>
      <demo-canvas :width="SPECTRUM_W" :height="SPECTRUM_H" :draw="drawSpectrum"/>
    </demo-section>

    <demo-section
      title="厚度 → 颜色"
      desc="横轴是膜的厚度 0–1500 nm，颜色是该厚度下的反射色，三角标出了上面滑块的位置。薄到只有几十纳米时，两束反射光几乎抵消，膜看起来是黑的（肥皂泡顶部破裂前的“黑膜”）；厚度逐渐增加，依次出现灰白、黄、橙红、紫红、蓝、绿……这是牛顿环里的“牛顿色序”。厚到上千纳米后，不同波长的干涉条纹互相错开、叠加，颜色变淡发灰，逐渐看不出彩色。膜的折射率越高，同样的颜色出现在越薄的位置；入射角越大，光程差越小，需要更厚的膜才能得到同样的颜色。"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawStrip"/>
    </demo-section>

    <demo-section
      title="肥皂泡"
      desc="肥皂泡里的水受重力往下流，所以顶部最薄、底部最厚。这里把厚度从顶部的 0 逐渐增加到上面滑块的数值，再叠加一点不规则的涡流起伏；球面上越靠近边缘，入射角越大，反射越强，边缘的颜色也会随角度变化。顶部极薄的地方接近黑色（黑膜），往下依次是灰白、黄、紫红、蓝绿等色带，把厚度滑块拉大，色带会向上扩展。画面是示意的渲染，没有计算真实的环境反射。"
    >
      <demo-canvas :width="BUBBLE_SIZE" :height="BUBBLE_SIZE" :draw="drawBubbleScene"/>
    </demo-section>

    <demo-section
      title="结构色：不靠色素的颜色"
      desc="颜料和染料的颜色来自“吸收”：色素吸收一部分波长，反射剩下的。结构色来自“结构”：物体表面有与光波长相近的微小结构，光在其中反射、衍射、干涉，只留下特定波长。肥皂泡、油膜是薄膜干涉；闪蝶的蓝来自鳞片上层层堆叠的多层结构和凸脊的干涉与衍射；孔雀羽毛的蓝绿来自羽小枝里黑色素棒排列成的周期结构；蛋白石的闪光来自规则排列的二氧化硅小球对光的衍射。它们的共同特点是颜色随观察角度变化（虹彩），而且不会像色素一样褪色。薄膜干涉只是结构色的其中一种机制，其余几种用的是不同的光学原理，这里不展开。"
    />
  </demo-page>
</template>
