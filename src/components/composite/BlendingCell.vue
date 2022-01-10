<script setup lang="ts">
import {ref, onMounted, inject} from 'vue';
import {createInterlace} from '../../utils/canvas';
import Color from '../../base/color';
import blending from '../../utils/blending';

const props = defineProps<{
  formula: string;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const size = inject('size') as number;
const sizePX = `${size}px`;

const makeCanvas = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const background = createInterlace(8, '#FFF', '#EEE');
  canvas.style.background = `url(${background})`;

  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 100, 100);

  ctx.globalCompositeOperation = props.formula;

  ctx.fillStyle = 'blue';
  ctx.fillRect(50, 50, 100, 100);

  const red = new Color('#FF0000');
  const blue = new Color('#0000FF');
  const method = props.formula.replace('-', '');
  const result = blending(method, blue, red);

  ctx.fillStyle = result.toHex();
  ctx.fillRect(120, 10, 30, 30);
};

onMounted(() => {
  makeCanvas();
});
</script>

<template>
  <div class="blending-cell">
    <p class="blending-cell-title">
      {{ formula }}
    </p>
    <canvas ref="canvasRef"/>
  </div>
</template>

<style lang="less">
@width: v-bind(sizePX);

.blending-cell {
  &-title {
    width: @width;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    text-align: center;
  }
}
</style>
