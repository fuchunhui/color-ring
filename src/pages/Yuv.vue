<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {MODELS, SUBSAMPLING, formulas, decompose, subsample, uvPlane, Channel} from '../composables/yuv';
import {getSource} from '../utils/testimage';

const CHANNEL_WIDTH = 240;
const CHANNEL_HEIGHT = 160;
const SUB_WIDTH = 300;
const SUB_HEIGHT = 200;
const PLANE_SIZE = 256;

const modelKey = ref('bt601');
const subKey = ref('420');
const level = ref(128);
const picked = ref('');

const model = computed(() => MODELS.find(item => item.key === modelKey.value) || MODELS[0]);
const sub = computed(() => SUBSAMPLING.find(item => item.key === subKey.value) || SUBSAMPLING[0]);

const channels = computed(() => {
  const [y, u, v] = model.value.names;
  return [
    {key: 'src', label: '原图'},
    {key: 'y', label: `${y}（亮度，灰度图）`},
    {key: 'u', label: `${u}（Y=128 时的色度）`},
    {key: 'v', label: `${v}（Y=128 时的色度）`},
    {key: 'chroma', label: '仅色度（Y=128，保留两个色度）'}
  ];
});

const drawChannel = (key: string) => (ctx: CanvasRenderingContext2D) => {
  const src = getSource('mix', CHANNEL_WIDTH, CHANNEL_HEIGHT);
  ctx.putImageData(key === 'src' ? src : decompose(src, model.value, key as Channel), 0, 0);
};

const drawSource = (ctx: CanvasRenderingContext2D) => {
  ctx.putImageData(getSource('stripes', SUB_WIDTH, SUB_HEIGHT), 0, 0);
};

const drawSubsampled = (ctx: CanvasRenderingContext2D) => {
  const src = getSource('stripes', SUB_WIDTH, SUB_HEIGHT);
  ctx.putImageData(subsample(src, model.value, sub.value.fx, sub.value.fy), 0, 0);
};

const drawSubsampledLuma = (ctx: CanvasRenderingContext2D) => {
  const src = getSource('stripes', SUB_WIDTH, SUB_HEIGHT);
  const result = subsample(src, model.value, sub.value.fx, sub.value.fy);
  ctx.putImageData(decompose(result, model.value, 'y'), 0, 0);
};

const drawPlane = (ctx: CanvasRenderingContext2D) => {
  const current = model.value;
  const tmp = document.createElement('canvas');
  tmp.width = PLANE_SIZE;
  tmp.height = PLANE_SIZE;
  (tmp.getContext('2d') as CanvasRenderingContext2D).putImageData(uvPlane(current, level.value, PLANE_SIZE), 0, 0);
  ctx.fillStyle = '#DDDDDD';
  ctx.fillRect(0, 0, PLANE_SIZE, PLANE_SIZE);
  ctx.drawImage(tmp, 0, 0);

  const [lo, hi] = current.range;
  const mid = (current.offset[1] - lo) / (hi - lo) * (PLANE_SIZE - 1);
  const midV = (hi - current.offset[2]) / (hi - lo) * (PLANE_SIZE - 1);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, PLANE_SIZE);
  ctx.moveTo(0, midV);
  ctx.lineTo(PLANE_SIZE, midV);
  ctx.stroke();
  ctx.fillStyle = '#333333';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${current.names[1]} →`, PLANE_SIZE - 40, PLANE_SIZE - 6);
  ctx.fillText(`${current.names[2]} ↑`, 6, 14);
};

const onPick = (payload: {color: string}) => {
  picked.value = payload.color;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="视频色彩模型（YUV / YCbCr / YIQ）"
      desc="人眼对亮度比对色彩更敏感，所以视频和 JPEG 先把 RGB 拆成亮度 Y 与两个色差分量，再对色差分量降低分辨率来节省数据。下面的系数是 0~255 全范围版本；视频里常用的有限范围（Y 取 16~235）还要再做一次缩放。"
    >
      <div v-for="item in MODELS" :key="item.key">
        <p>{{ item.label }}</p>
        <pre class="demo-code">{{ formulas(item).join('\n') }}</pre>
      </div>
      <p class="demo-section-desc">
        BT.601 与 BT.709 的区别在于亮度系数：BT.709 中绿色占比更大（0.7152 对 0.587），红、蓝占比更小，对应高清显示器更宽的色域。YIQ 是 NTSC 电视的旧模型，I、Q 相当于把 Cb、Cr 旋转了 33°。
      </p>
    </demo-section>

    <demo-section
      title="通道分解"
      desc="Y 单独看就是一张黑白照片，色彩信息全在另外两个通道里。U、V 通道以中性灰（Y=128）为底显示，Cb 偏蓝-黄，Cr 偏红-青。"
    >
      <div class="demo-controls">
        <label>
          模型
          <select v-model="modelKey">
            <option v-for="item in MODELS" :key="item.key" :value="item.key">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>
      <demo-canvas
        v-for="item in channels"
        :key="item.key"
        :title="item.label"
        :width="CHANNEL_WIDTH"
        :height="CHANNEL_HEIGHT"
        :draw="drawChannel(item.key)"
      />
    </demo-section>

    <demo-section
      title="色度子采样"
      desc="测试图上方是 3 像素宽的彩色细条纹，中间是红字压在绿底上（亮度接近），下方是 2 像素的黑白条纹。降低色度分辨率后，彩色细节会糊在一起、红字边缘出现色晕，而黑白条纹和亮度图几乎不受影响。"
    >
      <div class="demo-controls">
        <label>
          采样方式
          <select v-model="subKey">
            <option v-for="item in SUBSAMPLING" :key="item.key" :value="item.key">
              {{ item.label }}
            </option>
          </select>
        </label>
        <span>使用上面选中的模型：{{ model.label }}</span>
      </div>
      <demo-canvas title="原图" :width="SUB_WIDTH" :height="SUB_HEIGHT" :draw="drawSource"/>
      <demo-canvas title="子采样后" :width="SUB_WIDTH" :height="SUB_HEIGHT" :draw="drawSubsampled"/>
      <demo-canvas title="子采样后的亮度 Y（细节完整）" :width="SUB_WIDTH" :height="SUB_HEIGHT" :draw="drawSubsampledLuma"/>
    </demo-section>

    <demo-section
      title="U-V 平面"
      desc="固定亮度 Y，横轴是第二个分量，纵轴是第三个分量，每个点是对应的 RGB 颜色。灰色区域超出了 sRGB 色域，说明亮度很高或很低时，可用的色度范围会缩小。点击可以取色。"
    >
      <div class="demo-controls">
        <label>
          Y
          <input v-model.number="level" type="range" min="0" max="255" step="1">
          <span class="demo-code">{{ level }}</span>
        </label>
        <span v-if="picked">
          <span class="demo-swatch" :style="{background: picked}"/>
          <span class="demo-code">{{ picked }}</span>
        </span>
      </div>
      <demo-canvas :width="PLANE_SIZE" :height="PLANE_SIZE" :draw="drawPlane" @pick="onPick"/>
    </demo-section>
  </demo-page>
</template>
