<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';
import Color from '../base/color';
import ColorList from './block/ColorList.vue';
import {download} from '../utils/download';
import {ColorButton} from './common';

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
  },
  colors: {
    type: Array,
    default: () => []
  }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as DOMRect;
let canvas = document.createElement('canvas');
const listWidth = 390;
const sideWidth = `${listWidth}px`;
const color = ref(new Color());

const makeCanvas = () => {
  canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width - listWidth;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  props.beforeConvert(ctx);
  props.convert(ctx);
  props.afterConvert(ctx);
};

const hexConvert = (imageData: ImageData) => {
  const hex = (num: number) => num.toString(16).padStart(2, '0');
  const {0: r, 1: g, 2: b, 3: a} = imageData.data;
  return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`.toUpperCase();
};

const pickColor = (event: MouseEvent) => {
  const {offsetX, offsetY} = event;
  if (offsetX < 0 || offsetY < 0) {
    return;
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = ctx.getImageData(offsetX, offsetY, 1, 1);
  const newColor = hexConvert(imageData);
  console.log('click----> ', newColor);
  color.value = new Color(newColor);
};

const downloadCanvas = () => {
  download(canvas, 'png', 'nannn');
};

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="base-canvas">
    <canvas class="base-canvas-center" ref="canvasRef" @click="pickColor"/>
    <color-list
      :colors="colors as Color[]"
      :color="color as Color"
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