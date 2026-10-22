<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {Vec3} from '../utils/space';
import {
  STARE_SECONDS,
  useStare,
  BARS_W,
  BARS_H,
  PLANE_W,
  PLANE_H,
  FLAG_W,
  FLAG_H,
  PATCH_SIZE,
  PREDICT_W,
  PREDICT_H,
  HUES_W,
  HUES_H,
  drawOpponentBars,
  drawOpponentPlane,
  drawFlag,
  drawPatch,
  drawPrediction,
  drawUniqueHues
} from '../composables/opponent';

const hex = ref('#e8643c');
const patchHex = ref('#e03a3a');

const toRgb = (value: string): Vec3 => {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgb = computed(() => toRgb(hex.value));
const patchRgb = computed(() => toRgb(patchHex.value));

const drawBars = drawOpponentBars(() => rgb.value);

const flag = useStare();
const patch = useStare();
const drawFlagCanvas = drawFlag(() => flag.phase.value);
const drawPatchCanvas = drawPatch(() => patch.phase.value, () => patchRgb.value);
const drawPredict = drawPrediction(() => patchRgb.value);

const status = (phase: string, left: number): string => {
  if (phase === 'staring') {
    return `请盯住中间的圆点，不要移动视线……还剩 ${left} 秒`;
  }
  if (phase === 'after') {
    return '现在背景已变成中性色，继续盯着圆点，看看浮现出了什么颜色';
  }
  return `点击按钮后盯住圆点 ${STARE_SECONDS} 秒`;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="对立色通道：视锥之后的一级处理"
      desc="三色理论（视锥）和对立色理论并不矛盾，它们描述的是视觉系统的两个阶段：视网膜上先由 L、M、S 三种视锥接收光，再由后面的神经细胞把三路信号重新组合成三条对立通道——明暗（L+M）、红—绿（L−M）、蓝—黄（S−(L+M)）。红和绿、蓝和黄在同一条通道上互相抵消，所以我们看不到“偏红的绿”或“偏蓝的黄”。下面的公式是对这一级的简化线性模型，LMS 先按 D65 白色归一化，所以灰色的红—绿、蓝—黄恒为 0。"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="hex" type="color">
          <span class="demo-code">{{ hex.toUpperCase() }}</span>
        </label>
      </div>
      <demo-canvas :width="BARS_W" :height="BARS_H" :draw="drawBars"/>
    </demo-section>

    <demo-section
      title="色相在红—绿 × 蓝—黄平面上"
      desc="把同样明度、同样彩度的 12 个色相放进对立色平面：横轴是红—绿，纵轴是蓝—黄。色相环在这里变成了一个环：黄和蓝处在竖轴两端，红和绿处在横轴两端，这正是赫林提出的四个“独特色相”。红—绿通道的数值本来就比蓝—黄通道小得多，所以图中横轴放大了 4 倍。这是线性模型的结果，真实的神经响应是非线性的。"
    >
      <demo-canvas :width="PLANE_W" :height="PLANE_H" :draw="drawOpponentPlane"/>
    </demo-section>

    <demo-section
      title="负后像实验"
      desc="长时间盯着一种颜色，对应视锥会“疲劳”，增益下降；这时再看一块中性色，疲劳的视锥响应偏弱，于是看到的是偏向补色的颜色，这就是负后像。下面这面旗帜是荷兰国旗（红白蓝）的反色版本——青、黑、黄。盯住圆点后，背景换成中性色，你会看到红、白、蓝。注意：后像发生在你的眼睛和大脑里，屏幕并没有画出这些颜色。"
    >
      <div class="demo-controls">
        <color-button u="primary" :label="flag.phase.value === 'idle' ? '开始（盯住圆点 30 秒）' : '重来'" @click="flag.phase.value === 'idle' ? flag.start() : flag.reset()"/>
        <span class="demo-code">{{ status(flag.phase.value, flag.left.value) }}</span>
      </div>
      <demo-canvas :width="FLAG_W" :height="FLAG_H" :draw="drawFlagCanvas"/>
    </demo-section>

    <demo-section
      title="换一个颜色试试"
      desc="选一个颜色盯 30 秒再看灰背景。右边的“预测后像”是用 von Kries 视锥增益适应模型算出的示意颜色：被刺激越强的视锥增益下降越多，中性色经过它们之后落在原色的补色一侧。真实后像的颜色和持续时间因人而异。"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="patchHex" type="color">
          <span class="demo-code">{{ patchHex.toUpperCase() }}</span>
        </label>
        <color-button u="primary" :label="patch.phase.value === 'idle' ? '开始（盯住圆点 30 秒）' : '重来'" @click="patch.phase.value === 'idle' ? patch.start() : patch.reset()"/>
        <span class="demo-code">{{ status(patch.phase.value, patch.left.value) }}</span>
      </div>
      <demo-canvas :width="PATCH_SIZE" :height="PATCH_SIZE" :draw="drawPatchCanvas"/>
      <demo-canvas :width="PREDICT_W" :height="PREDICT_H" :draw="drawPredict"/>
    </demo-section>

    <demo-section
      title="独特色相在光谱上的位置"
      desc="赫林把不带其他色调的“纯”红、绿、黄、蓝叫独特色相。独特蓝、独特绿、独特黄在光谱上都能找到大致的波长，而独特红在光谱上没有对应的单色光：它需要长波光再混入少量短波光。这些波长因人而异，下面的数值是常被引用的大致范围，不是精确值。"
    >
      <demo-canvas :width="HUES_W" :height="HUES_H" :draw="drawUniqueHues"/>
    </demo-section>
  </demo-page>
</template>
