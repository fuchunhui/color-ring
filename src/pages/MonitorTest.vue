<script setup lang="ts">
import {ref, nextTick, onMounted, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import {PATTERNS, SOLIDS, mountPattern} from '../composables/monitortest';
import type {SolidColor} from '../composables/monitortest';

type FullscreenHost = HTMLElement & {webkitRequestFullscreen?: () => void};

const root = ref<HTMLElement | null>(null);
const overlay = ref<HTMLElement | null>(null);
const solid = ref<SolidColor | null>(null);
let entered = false;

const close = () => {
  solid.value = null;
  entered = false;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
};

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close();
  }
};

const onFullscreenChange = () => {
  if (document.fullscreenElement) {
    entered = true;
  } else if (entered) {
    solid.value = null;
    entered = false;
  }
};

const open = async (item: SolidColor) => {
  solid.value = item;
  await nextTick();
  const el = overlay.value as FullscreenHost | null;
  if (!el) {
    return;
  }
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }
};

onMounted(() => {
  const host = root.value as HTMLElement;
  host.querySelectorAll<HTMLCanvasElement>('canvas[data-pattern]').forEach(canvas => {
    const p = PATTERNS.find(item => item.key === canvas.dataset.pattern);
    if (p) {
      mountPattern(canvas, p);
    }
  });
  window.addEventListener('keydown', onKey);
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
});
</script>

<template>
  <demo-page>
    <div ref="root">
      <demo-section
        title="显示器自检图"
        desc="一组常见的显示器测试图（思路类似 Lagom LCD 测试）。每张图都按设备物理像素绘制，所以测的是屏幕本身而不是浏览器的缩放。测试前请把浏览器缩放设为 100%，关掉护眼、夜间模式和 HDR，屏幕亮度调到平时用的位置。"
      >
        <p class="mt-note">
          注意：网页里的颜色经过浏览器色彩管理，如果显示器带 ICC 配置文件，测试图的数值会被转换，灰阶和 Gamma 的结果会受影响；环境光、观看角度（特别是 IPS 与 VA 屏）也会改变你看到的东西。这些图只能做粗略的检查，不能代替仪器校准。
        </p>
      </demo-section>

      <demo-section
        v-for="p in PATTERNS"
        :key="p.key"
        :title="p.title"
        :desc="p.desc"
      >
        <canvas :data-pattern="p.key" class="mt-canvas"/>
      </demo-section>

      <demo-section
        title="整屏纯色：找坏点与漏光"
        desc="点击按钮后，整个屏幕（或整个窗口，如果浏览器不允许全屏）会铺满一种纯色。依次看黑、白、红、绿、蓝、50% 灰：黑屏下找亮点（常亮坏点）和边缘漏光，白屏和彩色屏下找暗点和色斑。点击屏幕或按 Esc 退出。"
      >
        <div class="demo-controls">
          <color-button v-for="s in SOLIDS" :key="s.key" :label="s.label" @click="open(s)"/>
        </div>
      </demo-section>
    </div>

    <div
      v-if="solid"
      ref="overlay"
      class="mt-overlay"
      :style="{background: solid.color}"
      @click="close"
    >
      <span class="mt-overlay-tip" :style="{color: solid.key === 'black' || solid.key === 'blue' ? '#444' : '#999'}">
        点击或按 Esc 退出
      </span>
    </div>
  </demo-page>
</template>

<style lang="less">
.mt-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
.mt-canvas {
  display: block;
  border: 1px solid #DDDEE4;
  background: #FFF;
}
.mt-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  cursor: none;
  &-tip {
    margin-bottom: 12px;
    font-size: 12px;
    opacity: 0.35;
  }
}
</style>
