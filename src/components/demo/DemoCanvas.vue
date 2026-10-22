<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, watchEffect} from 'vue';
import {pickHex} from '../../utils/pixel';

/**
 * 通用演示画布。draw 在挂载后执行一次；draw 内部读取的响应式数据（ref/reactive）
 * 或 draw 本身发生变化时会自动清空并重绘，所以页面只需把状态写进 draw 里。
 */
type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const props = withDefaults(defineProps<{
  width: number;
  height: number;
  title?: string;
  draw: DrawFn;
}>(), {
  title: ''
});

const emit = defineEmits(['pick']);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let stop: (() => void) | null = null;

onMounted(() => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  ctx = canvas.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
  stop = watchEffect(() => {
    const {width, height} = props;
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    const context = ctx as CanvasRenderingContext2D;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    props.draw(context, width, height);
    context.restore();
  });
});

onBeforeUnmount(() => {
  stop?.();
});

const onClick = (event: MouseEvent) => {
  if (!ctx) {
    return;
  }
  const {offsetX: x, offsetY: y} = event;
  emit('pick', {x, y, color: pickHex(ctx, x, y)});
};
</script>

<template>
  <div class="demo-canvas">
    <p v-if="title" class="demo-canvas-title">
      {{ title }}
    </p>
    <canvas ref="canvasRef" @click="onClick"/>
  </div>
</template>

<style lang="less">
.demo-canvas {
  display: inline-block;
  vertical-align: top;
  margin: 0 16px 16px 0;
  &-title {
    height: 28px;
    line-height: 28px;
    font-size: 14px;
  }
  canvas {
    display: block;
    background: #FFF;
    cursor: crosshair;
  }
}
</style>
