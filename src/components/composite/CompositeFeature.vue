<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';
import {createInterlace} from '../../utils/canvas';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const size = inject('size') as number;
const cell = size * 2;
const sizePX = `${cell}px`;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = cell;
  canvas.height = cell;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const background = createInterlace(8, '#FFF', '#EEE');
  canvas.style.background = `url(${background})`;
  
  ctx.beginPath();
  ctx.fillStyle = 'blue';
  ctx.moveTo(0, 0);
  ctx.lineTo(0, cell);
  ctx.lineTo(cell, 0);
  ctx.fill();
  ctx.closePath();

  ctx.globalCompositeOperation = 'lighter';

  ctx.beginPath();
  ctx.fillStyle = 'red';
  ctx.moveTo(0, 0);
  ctx.lineTo(cell, 0);
  ctx.lineTo(cell, cell);
  ctx.fill();
  ctx.closePath();

  ctx.textAlign = 'center';
  ctx.font = '24px serif';
  ctx.fillStyle = 'white';
  ctx.fillText('source', size / 2, size);
  ctx.fillText('destination', size / 2 + size, size);
  ctx.fillText('both', size, size / 2);
  ctx.fillStyle = 'black';
  ctx.fillText('none', size, size / 2 + size);
};

onMounted(() => {
  makeCanvas();
});
</script>

<template>
  <div class="composite-source">
    <p class="composite-source-title">
      合成feature
    </p>
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
@width: v-bind(sizePX);

.composite-source {
  &-title {
    width: @width;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    text-align: center;
  }
}
</style>
