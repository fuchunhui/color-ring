<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {DISC_SIZE, DIAGRAM_W, DIAGRAM_H, spinDrawer, drawDiagram} from '../composables/benham';

const speed = ref(5);
const clockwise = ref(true);
const playing = ref(true);
const angle = ref(0);
const fps = ref(0);

let raf = 0;
let last = 0;
let smooth = 60;

const frame = (now: number) => {
  raf = requestAnimationFrame(frame);
  if (!last) {
    last = now;
    return;
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (dt > 0) {
    smooth += (1 / dt - smooth) * 0.1;
    fps.value = Math.round(smooth);
  }
  if (playing.value) {
    const dir = clockwise.value ? 1 : -1;
    angle.value = (angle.value + dir * speed.value * dt * Math.PI * 2) % (Math.PI * 2);
  }
};

const onVisibility = () => {
  last = 0;
};

onMounted(() => {
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  document.removeEventListener('visibilitychange', onVisibility);
});

const draw = spinDrawer(() => angle.value);
const perFrame = computed(() => (fps.value ? (speed.value * 360 / fps.value).toFixed(0) : '0'));
const toggle = () => {
  playing.value = !playing.value;
};
const flip = () => {
  clockwise.value = !clockwise.value;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="Benham 陀螺：黑白旋转出来的颜色"
      desc="这个圆盘只有黑和白，没有任何颜色。可是让它以每秒五六转的速度旋转，大多数人会在白色半圆里的四条黑弧上看到淡淡的彩色，而且换一个旋转方向，各条弧的颜色顺序会反过来。这是 1894 年玩具商 Charles Benham 推广的“主观颜色”（Fechner–Benham 颜色）。效果因人而异，也取决于光照和转速。至于它为什么会发生，科学界至今没有公认的定论，常见的猜测与不同视锥对明暗变化的响应速度有差别有关，但不能当作定论。注意：浏览器靠逐帧绘制模拟旋转，屏幕刷新率会限制转速上限，转得太快时每帧转过的角度过大，效果会失真。"
    >
      <div class="demo-controls">
        <label>
          转速
          <input v-model.number="speed" type="range" min="0" max="15" step="0.5">
          <span class="demo-code">{{ speed.toFixed(1) }} 转/秒</span>
        </label>
        <color-button :label="playing ? '暂停' : '继续'" @click="toggle"/>
        <color-button :label="clockwise ? '顺时针（点击反转）' : '逆时针（点击反转）'" @click="flip"/>
        <span class="demo-code">帧率 ≈ {{ fps }} fps，每帧转 {{ perFrame }}°</span>
      </div>
      <demo-canvas :width="DISC_SIZE" :height="DISC_SIZE" :draw="draw"/>
    </demo-section>

    <demo-section
      title="自己做一个"
      desc="想看到真正的效果，最好做一个实物：屏幕刷新带来的闪烁、色彩渲染和个人差异都会影响结果。图案没有唯一的标准，不同资料里弧线的长度、位置略有差别，这里的图案是示意版本。"
    >
      <demo-canvas :width="DIAGRAM_W" :height="DIAGRAM_H" :draw="drawDiagram"/>
    </demo-section>
  </demo-page>
</template>
