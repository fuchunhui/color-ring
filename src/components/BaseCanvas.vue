<script setup lang="ts">
import {shallowRef, ref, onMounted, onBeforeUnmount, inject} from 'vue';
import Color from '../base/color';
import ColorList from './block/ColorList.vue';
import {download} from '../utils/download';
import {pickHex} from '../utils/pixel';
import {ColorButton} from './common';
import {RANK} from '../types';

type Drawer = (ctx: CanvasRenderingContext2D) => void | (() => void);

const props = withDefaults(defineProps<{
  beforeConvert?: Drawer;
  convert?: Drawer;
  afterConvert?: Drawer;
  colors?: Color[];
  title?: string;
  intro?: string[];
}>(), {
  beforeConvert: () => {},
  convert: () => {},
  afterConvert: () => {},
  colors: () => [],
  title: '',
  intro: () => []
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

const pickColor = (event: MouseEvent) => {
  const {offsetX, offsetY} = event;
  if (offsetX < 0 || offsetY < 0) {
    return;
  }

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const newColor = pickHex(ctx, offsetX, offsetY);
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
    >
      <div v-if="intro.length" class="base-canvas-intro">
        <h4 v-if="title">
          {{ title }}
        </h4>
        <p v-for="(text, index) in intro" :key="index">
          {{ text }}
        </p>
      </div>
    </color-list>
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
  &-intro {
    padding: 14px 10px 14px 0;
    font-size: 13px;
    line-height: 21px;
    color: #555;
    h4 {
      margin-bottom: 8px;
      font-size: 14px;
      color: #2C3E50;
    }
    p {
      margin-bottom: 8px;
    }
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
