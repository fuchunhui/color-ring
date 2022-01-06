<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {createInterlace} from '../../utils/canvas';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const size = 160;
const sizePX = `${size}px`;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const background = createInterlace(8, '#FFF', '#EEE');
  canvas.style.background = `url(${background})`;

  ctx.fillStyle = 'blue';
  ctx.fillRect(50, 50, 100, 100);
};

onMounted(() => {
  makeCanvas();
});
</script>

<template>
  <div class="composite-destination">
    <p class="composite-destination-title">
      destination
    </p>
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
@width: v-bind(sizePX);

.composite-destination {
  &-title {
    width: @width;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    text-align: center;
  }
}
</style>
