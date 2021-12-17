<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as DOMRect;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.beginPath();
  ctx.arc(100, 75, 50, 0, 2 * Math.PI);
  ctx.stroke();
};

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="template">
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
.template {
  background-color: mintcream;
}
</style>