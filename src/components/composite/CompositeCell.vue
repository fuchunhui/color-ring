<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {createInterlace} from '../../utils/canvas';

const props = defineProps<{
  operator: string;
  white: boolean;
}>();

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

  if (props.white) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
  }

  ctx.globalCompositeOperation = props.operator;

  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 100, 100);

  ctx.fillStyle = 'blue';
  ctx.fillRect(50, 50, 100, 100);
};

onMounted(() => {
  makeCanvas();
});
</script>

<template>
  <div class="composite-cell">
    <p class="composite-cell-title">
      {{ operator }}
    </p>
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
@width: v-bind(sizePX);

.composite-cell {
  &-title {
    width: @width;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    text-align: center;
  }
}
</style>
