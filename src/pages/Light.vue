<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';
import light from '../composables/light';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {width, height} = inject('rank') as DOMRect;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.globalCompositeOperation = 'lighter';
  
  light(ctx);
  // ctx.globalCompositeOperation = "lighter";
  // ctx.beginPath();
  // ctx.fillStyle = "rgba(255,0,0,1)";
  // ctx.arc(100, 200, 100, Math.PI*2, 0, false);
  // ctx.fill();
  // ctx.beginPath();
  // ctx.fillStyle = "rgba(0,0,255,1)";
  // ctx.arc(220, 200, 100, Math.PI*2, 0, false);
  // ctx.fill();
  // ctx.beginPath();
  // ctx.fillStyle = "rgba(0,255,0,1)";
  // ctx.arc(160, 100, 100, Math.PI*2, 0, false);
  // ctx.fill();
};

onMounted(() => {
  makeCanvas();
});

</script>

<template>
  <div class="light">
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
.light {
  background-color: mintcream;
}
</style>