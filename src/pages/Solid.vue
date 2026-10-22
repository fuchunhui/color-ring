<script setup lang="ts">
import {ref, shallowRef, computed, watch, onMounted, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {buildSolid, renderSolid, project, Solid, SolidModel} from '../utils/solid3d';

const WIDTH = 640;
const HEIGHT = 560;

const MODELS: Array<{value: SolidModel; label: string; desc: string}> = [
  {
    value: 'rgb',
    label: 'RGB 立方体',
    desc: '三条轴分别是红、绿、蓝的强度。黑色在一个角上，白色在对角，灰色沿体对角线排列；红、绿、蓝是三个角，青、品红、黄是它们各自的对角。'
  },
  {
    value: 'hsv',
    label: 'HSV 圆锥',
    desc: '色相绕轴一圈，饱和度是离轴的距离，明度是高度。顶面（V=1）是各色相最亮的颜色，尖端是黑。这里把半径画成 S×V 才是圆锥；常见的另一种画法把 S 直接当半径，得到圆柱。'
  },
  {
    value: 'hsl',
    label: 'HSL 双锥',
    desc: '亮度 L 是高度，L=0 全黑、L=1 全白，纯色都在 L=0.5 的赤道圆上，上下两端都收成一个点。和 HSV 相比，HSL 的“白”只有一个点，更对称。'
  },
  {
    value: 'hwb',
    label: 'HWB',
    desc: 'HWB（色相、白度、黑度）是 HSV 的另一种参数化：往纯色里掺多少白、多少黑，比饱和度、明度更接近画画的直觉。它的几何形状与 HSV 圆锥完全相同（半径 = 1 − W − B）。勾选“色相切片”可看到由纯色、白、黑三点构成的三角形。'
  },
  {
    value: 'lab',
    label: 'CIELAB 色域',
    desc: '把 sRGB 色域里的每个颜色放到 (a*, b*, L*) 坐标中。形状凹凸不平：蓝色离中轴很远却很暗，黄色亮度很高，红、绿向两侧伸出。因为 sRGB 的三原色并不是感知空间里“圆润”的一块。'
  },
  {
    value: 'oklch',
    label: 'OKLCH 色域',
    desc: '同一个 sRGB 色域放进 OKLab（以柱坐标 C、h、L 观察）。形状比 Lab 更规整，蓝色一带的色相也更“直”，但仍然不是圆柱：每个色相能到达的最大彩度和对应亮度都不同。'
  }
];

const HUE_MODELS: SolidModel[] = ['hsv', 'hsl', 'hwb'];

const canvasRef = ref<HTMLCanvasElement | null>(null);
const model = ref<SolidModel>('rgb');
const density = ref(24);
const zoom = ref(1.2);
const cut = ref(0);
const autoRotate = ref(false);
const slice = ref(false);
const hue = ref(30);
const solid = shallowRef<Solid>(buildSolid('rgb', 24));

const isHue = computed(() => HUE_MODELS.includes(model.value));
const current = computed(() => MODELS.find(item => item.value === model.value) as typeof MODELS[number]);

let yaw = 0.7;
let pitch = 0.45;
let image: ImageData | null = null;
let depth: Float32Array | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;

const render = () => {
  if (!ctx || !image || !depth) {
    return;
  }
  const scale = Math.min(WIDTH, HEIGHT) * 0.27 * zoom.value;
  const sliced = slice.value && isHue.value;
  const spacing = scale * 2 / (sliced ? density.value * 1.6 : density.value);
  const view = {
    width: WIDTH,
    height: HEIGHT,
    yaw,
    pitch,
    zoom: zoom.value,
    cut: cut.value / 100,
    pointSize: Math.min(10, Math.max(2, Math.round(spacing * (sliced ? 1.1 : 0.6))))
  };
  renderSolid(solid.value, view, image, depth);
  ctx.putImageData(image, 0, 0);

  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillStyle = '#FFF';
  solid.value.anchors.forEach(({text, pos}) => {
    const [x, y, z] = project(view, pos[0], pos[1], pos[2]);
    const px = Math.round(x);
    const py = Math.round(y);
    const inside = px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT;
    if (inside && depth && depth[py * WIDTH + px] > z + 0.12) {
      return;
    }
    ctx?.strokeText(text, x, y);
    ctx?.fillText(text, x, y);
  });
};

const frame = () => {
  raf = 0;
  if (autoRotate.value) {
    yaw += 0.012;
  }
  render();
  if (autoRotate.value) {
    raf = requestAnimationFrame(frame);
  }
};

const request = () => {
  if (!raf) {
    raf = requestAnimationFrame(frame);
  }
};

const rebuild = () => {
  const sliceHue = isHue.value && slice.value ? hue.value : null;
  solid.value = buildSolid(model.value, density.value, sliceHue);
  request();
};

const onMove = (event: MouseEvent) => {
  if (!dragging) {
    return;
  }
  yaw += (event.clientX - lastX) * 0.01;
  pitch = Math.min(1.5, Math.max(-1.5, pitch + (event.clientY - lastY) * 0.01));
  lastX = event.clientX;
  lastY = event.clientY;
  request();
};

const onUp = () => {
  dragging = false;
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', onUp);
};

const onDown = (event: MouseEvent) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};

const onWheel = (event: WheelEvent) => {
  zoom.value = Math.min(2.4, Math.max(0.6, +(zoom.value - event.deltaY * 0.001).toFixed(2)));
};

watch([model, density, slice, hue], rebuild);
watch([zoom, cut], request);
watch(autoRotate, value => {
  if (value) {
    request();
  }
});

onMounted(() => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  image = ctx.createImageData(WIDTH, HEIGHT);
  depth = new Float32Array(WIDTH * HEIGHT);
  render();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  onUp();
});
</script>

<template>
  <demo-page>
    <demo-section
      title="色立体 3D 浏览器"
      desc="同一批颜色，换一种坐标系，形状就完全不同。拖动画面旋转，滚轮缩放；用“切开”滑块削掉一半，看看里面是什么颜色。画面由程序在 Canvas 上逐点软件渲染，没有用 WebGL。"
    >
      <div class="demo-controls">
        <label>
          模型
          <select v-model="model">
            <option v-for="item in MODELS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          采样密度
          <input v-model.number="density" type="range" min="10" max="36">
          <span class="demo-code">{{ solid.count }} 点</span>
        </label>
        <label>
          缩放
          <input v-model.number="zoom" type="range" min="0.6" max="2.4" step="0.1">
        </label>
        <label>
          切开
          <input v-model.number="cut" type="range" min="0" max="100">
        </label>
        <label>
          <input v-model="autoRotate" type="checkbox">
          自动旋转
        </label>
      </div>
      <div v-if="isHue" class="demo-controls">
        <label>
          <input v-model="slice" type="checkbox">
          只看色相切片（含互补半面）
        </label>
        <label>
          色相
          <input v-model.number="hue" type="range" min="0" max="359" :disabled="!slice">
          <span class="demo-code">{{ hue }}°</span>
        </label>
      </div>
      <canvas
        ref="canvasRef"
        class="solid-canvas"
        :width="WIDTH"
        :height="HEIGHT"
        @mousedown="onDown"
        @wheel.prevent="onWheel"
      />
      <p class="solid-desc">
        {{ current.desc }}
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.solid-canvas {
  display: block;
  cursor: grab;
  border: 1px solid #DDDEE4;
  &:active {
    cursor: grabbing;
  }
}
.solid-desc {
  max-width: 640px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 21px;
  color: #555;
}
</style>
