<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';

const props = defineProps({
  convert: {
    type: Function,
    default: () => {}
  }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as DOMRect;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  props.convert(ctx);
};

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="base-canvas">
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
.base-canvas {
  background-color: mintcream;
}
</style>