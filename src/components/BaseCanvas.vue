<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';

const props = defineProps({
  beforeConvert: {
    type: Function,
    default: () => {}
  },
  convert: {
    type: Function,
    default: () => {}
  },
  afterConvert: {
    type: Function,
    default: () => {}
  }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as DOMRect;
let canvas = document.createElement('canvas');

const makeCanvas = () => {
  canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.globalCompositeOperation = 'lighter';
  props.beforeConvert(ctx);
  props.convert(ctx);
  props.afterConvert(ctx);
};

const hexConvert = (imageData: ImageData) => {
  const hex = (num: number) => num.toString(16).padStart(2, '0');
  const {0: r, 1: g, 2: b, 3: a} = imageData.data;
  // return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`.toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
};

const pickColor = (event: MouseEvent) => {
  const {offsetX, offsetY} = event;
  if (offsetX < 0 || offsetY < 0) {
    return;
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = ctx.getImageData(offsetX, offsetY, 1, 1);
  const color = hexConvert(imageData);
  console.log('click----> ', color);
};

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="base-canvas">
    <canvas class="base-canvas-center" ref="canvasRef" @click="pickColor"/>
  </div>
</template>

<style lang="less">
.base-canvas {
  background-color: mintcream;
  &-center {
    cursor: pointer;
  }
}
</style>