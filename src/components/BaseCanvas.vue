<script setup lang="ts">
import {shallowRef, ref, onMounted, onBeforeUnmount, inject} from 'vue';
import Color from '../base/color';
import ColorList from './block/ColorList.vue';
import {download} from '../utils/download';
import {ColorButton} from './common';
import {RANK} from '../types';

type Drawer = (ctx: CanvasRenderingContext2D) => void | (() => void);

const props = withDefaults(defineProps<{
  beforeConvert?: Drawer;
  convert?: Drawer;
  afterConvert?: Drawer;
  colors?: Color[];
}>(), {
  beforeConvert: () => {},
  convert: () => {},
  afterConvert: () => {},
  colors: () => []
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as RANK;
let canvas = document.createElement('canvas');
const listWidth = 390;
const sideWidth = `${listWidth}px`;
const color = shallowRef(new Color());
let cleanup: void | (() => void);

const makeCanvas = () => {
  canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width - listWidth;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  props.beforeConvert(ctx);
  cleanup = props.convert(ctx);
  props.afterConvert(ctx);
};

const hexConvert = (imageData: ImageData) => {
  const hex = (num: number) => Math.round(num).toString(16).padStart(2, '0');
  const {0: r, 1: g, 2: b, 3: a} = imageData.data;
  // 半透明像素按白色背景合成，得到肉眼实际看到的颜色
  const flatten = (c: number) => c * a / 255 + 255 * (1 - a / 255);
  return `#${hex(flatten(r))}${hex(flatten(g))}${hex(flatten(b))}`.toUpperCase();
};

const pickColor = (event: MouseEvent) => {
  const {offsetX, offsetY} = event;
  if (offsetX < 0 || offsetY < 0) {
    return;
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = ctx.getImageData(offsetX, offsetY, 1, 1);
  const newColor = hexConvert(imageData);
  color.value = new Color(newColor);

  navigator.clipboard?.writeText(newColor).catch(() => {});
};

const downloadCanvas = () => {
  download(canvas, 'png', 'color');
};

onBeforeUnmount(() => {
  if (typeof cleanup === 'function') {
    cleanup();
  }
});

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="base-canvas">
    <canvas class="base-canvas-center" ref="canvasRef" @click="pickColor"/>
    <color-list
      :colors="colors"
      :color="color"
    />
    <color-button class="download" u="primary" label="下载" @click="downloadCanvas"/>
  </div>
</template>

<style lang="less">
.base-canvas {
  display: flex;
  background-color: #FFF;
  &-center {
    cursor: pointer;
  }
  .color-list {
    width: v-bind(sideWidth);
  }
  .download {
    min-width: 40px;
    position: fixed;
    right: 10px;
    bottom: 10px;
    opacity: 0.1;
    &:hover {
      opacity: 1;
    }
  }
}
</style>
