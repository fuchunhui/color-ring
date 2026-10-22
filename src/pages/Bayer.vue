<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import type {Algo} from '../utils/sensor';
import {
  CAMERA_MATRIX,
  IDENTITY,
  applyCameraPipeline,
  grayWorldGains,
  invert3,
  psnr
} from '../utils/sensor';
import type {SceneKey} from '../composables/bayer';
import {
  WIDTH,
  HEIGHT,
  CROP_W,
  CROP_H,
  ZOOM,
  ALGOS,
  ALGO_NAMES,
  getSourceBytes,
  getResult,
  getCamera,
  putBytes,
  clampCrop,
  drawCrop,
  drawLayout,
  drawRawNumbers
} from '../composables/bayer';

const scene = ref<SceneKey>('stress');
const algo = ref<Algo>('bilinear');
const olpf = ref(false);
const center = ref({x: 213, y: 96});

const result = computed(() => getResult(scene.value, olpf.value));
const crop = computed(() => clampCrop(center.value.x, center.value.y, CROP_W, CROP_H));
const rawCrop = computed(() => clampCrop(center.value.x, center.value.y, 16, 12));

const drawOriginal = (ctx: CanvasRenderingContext2D) => {
  putBytes(ctx, getSourceBytes(scene.value), WIDTH, HEIGHT);
  const {x, y} = crop.value;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x - 0.5, y - 0.5, CROP_W + 1, CROP_H + 1);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#FFE600';
  ctx.strokeRect(x - 0.5, y - 0.5, CROP_W + 1, CROP_H + 1);
};
const drawMosaic = (ctx: CanvasRenderingContext2D) => putBytes(ctx, result.value.colorBytes, WIDTH, HEIGHT);
const drawDemosaiced = (ctx: CanvasRenderingContext2D) => putBytes(ctx, result.value.demos[algo.value], WIDTH, HEIGHT);
const drawError = (ctx: CanvasRenderingContext2D) => putBytes(ctx, result.value.errors[algo.value], WIDTH, HEIGHT);

const drawCropOf = (kind: 'original' | Algo) => (ctx: CanvasRenderingContext2D) => {
  const bytes = kind === 'original' ? getSourceBytes(scene.value) : result.value.demos[kind];
  drawCrop(ctx, bytes, crop.value, CROP_W, CROP_H, ZOOM);
};
const drawRawColor = (ctx: CanvasRenderingContext2D) => drawCrop(ctx, result.value.colorBytes, rawCrop.value, 16, 12, 16);
const drawRawNumbersCanvas = (ctx: CanvasRenderingContext2D) => drawRawNumbers(ctx, result.value.mosaic, rawCrop.value);

const onPick = (payload: {x: number; y: number}) => {
  center.value = {x: payload.x, y: payload.y};
};

const scoreText = (value: number) => (Number.isFinite(value) ? `${value.toFixed(2)} dB` : '完全一致');

// ---------- 相机管线 ----------

const wbR = ref(1);
const wbB = ref(1);
const presetIndex = ref(0);
const presets = [
  {label: '中性（不做校正）', matrix: IDENTITY},
  {label: '相机校色矩阵（还原串色，轻度增强饱和）', matrix: invert3(CAMERA_MATRIX)}
];

const wbBytes = computed(() => {
  return applyCameraPipeline(getCamera().demosaiced, [wbR.value, 1, wbB.value], IDENTITY);
});
const finalBytes = computed(() => {
  return applyCameraPipeline(getCamera().demosaiced, [wbR.value, 1, wbB.value], presets[presetIndex.value].matrix);
});
const finalScore = computed(() => psnr(getCamera().target, finalBytes.value));

const drawTarget = (ctx: CanvasRenderingContext2D) => putBytes(ctx, getCamera().target, WIDTH, HEIGHT);
const drawRawStage = (ctx: CanvasRenderingContext2D) => {
  putBytes(ctx, applyCameraPipeline(getCamera().demosaiced, [1, 1, 1], IDENTITY), WIDTH, HEIGHT);
};
const drawWbStage = (ctx: CanvasRenderingContext2D) => putBytes(ctx, wbBytes.value, WIDTH, HEIGHT);
const drawFinalStage = (ctx: CanvasRenderingContext2D) => putBytes(ctx, finalBytes.value, WIDTH, HEIGHT);

const autoWhiteBalance = () => {
  const gains = grayWorldGains(getCamera().demosaiced);
  wbR.value = Math.round(gains[0] * 100) / 100;
  wbB.value = Math.round(gains[2] * 100) / 100;
};
const resetWhiteBalance = () => {
  wbR.value = 1;
  wbB.value = 1;
};
</script>

<template>
  <demo-page>
    <demo-section
      title="拜耳滤镜：每个像素只认识一种颜色"
      desc="相机传感器上的每个感光点只能测出光的强弱，不认识颜色。为了得到彩色，厂商在每个感光点前盖一小片红、绿或蓝的滤光片，最常见的排列叫拜耳（Bayer）阵列：每 2×2 个像素里有 1 个红、1 个蓝、2 个绿。绿色占一半，是因为人眼对绿光最敏感，画面的亮度细节主要靠绿色通道提供。这样一来，每个位置只记录了三个颜色中的一个，另外两个要靠周围的像素“猜”出来，这一步叫去马赛克（demosaicing）。"
    >
      <demo-canvas title="RGGB 排列（粗框是 2×2 的重复单元）" :width="224" :height="224" :draw="drawLayout"/>
    </demo-section>

    <demo-section
      title="从原图到去马赛克"
      desc="选一张测试图和一种插值算法。压力测试图由三部分组成：越来越密的斜条纹、细小笔画和带放射条纹的色轮，它们的细节小到只有一两个像素，最容易暴露算法的缺陷：边缘出现锯齿状的“拉链”，以及原图里没有的伪色（彩色摩尔纹）。点击左边的原图可以移动下面的放大区域。"
    >
      <div class="demo-controls">
        <label>
          测试图
          <select v-model="scene">
            <option value="stress">压力测试图</option>
            <option value="photo">照片场景</option>
          </select>
        </label>
        <label>
          去马赛克算法
          <select v-model="algo">
            <option v-for="item in ALGOS" :key="item" :value="item">
              {{ ALGO_NAMES[item] }}
            </option>
          </select>
        </label>
        <label>
          <input v-model="olpf" type="checkbox">
          光学低通滤波（OLPF）
        </label>
      </div>
      <demo-canvas title="原图（点击选择放大区域）" :width="WIDTH" :height="HEIGHT" :draw="drawOriginal" @pick="onPick"/>
      <demo-canvas title="传感器记录的（彩色滤镜示意）" :width="WIDTH" :height="HEIGHT" :draw="drawMosaic"/>
      <demo-canvas :title="`去马赛克：${ALGO_NAMES[algo]}`" :width="WIDTH" :height="HEIGHT" :draw="drawDemosaiced"/>
      <demo-canvas title="与原图的误差（放大 6 倍，越亮误差越大）" :width="WIDTH" :height="HEIGHT" :draw="drawError"/>
      <table class="bayer-table">
        <thead>
          <tr>
            <th>算法</th>
            <th>PSNR（与原图比，越高越接近）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in ALGOS" :key="item" :class="{'bayer-table-active': item === algo}">
            <td>{{ ALGO_NAMES[item] }}</td>
            <td class="demo-code">
              {{ scoreText(result.psnr[item]) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="bayer-note">
        光学低通滤波是相机传感器前的一层微弱模糊：它故意损失一点点锐度，让过细的纹理在到达传感器之前就被抹平，从而减少伪色。勾选后，PSNR 仍然是与没有模糊的原图相比，所以数值未必变好，但压力测试图里的彩色摩尔纹明显减轻。
      </p>
    </demo-section>

    <demo-section
      title="放大 8 倍看细节"
      desc="同一块区域在四种情况下的样子。最近邻把 2×2 的四个像素涂成同一个颜色，边缘是明显的方块；双线性使边缘平滑，但会在黑白交界处渗出彩色边；Malvar–He–Cutler 用 5×5 邻域并利用其他通道的梯度做校正，细节更好，但在噪点多的画面上也会放大噪声。"
    >
      <demo-canvas title="原图" :width="CROP_W * ZOOM" :height="CROP_H * ZOOM" :draw="drawCropOf('original')"/>
      <demo-canvas
        v-for="item in ALGOS"
        :key="item"
        :title="ALGO_NAMES[item]"
        :width="CROP_W * ZOOM"
        :height="CROP_H * ZOOM"
        :draw="drawCropOf(item)"
      />
    </demo-section>

    <demo-section
      title="传感器真正记录的数据"
      desc="左图是同一区域放大 16 倍的彩色滤镜示意，每个像素只亮自己那个通道。右图把它们换成灰度，格内数字是线性 raw 值（0~255），左上角的小色块标出这是 R、G 还是 B 像素。可以看到，相邻像素的数字差别很大，其实是因为它们看的是不同颜色。"
    >
      <demo-canvas title="彩色滤镜（16×12 像素）" :width="256" :height="192" :draw="drawRawColor"/>
      <demo-canvas title="灰度 raw 与数值" :width="256" :height="192" :draw="drawRawNumbersCanvas"/>
    </demo-section>

    <demo-section
      title="去马赛克之后：白平衡、色彩矩阵与 gamma"
      desc="下面模拟一台相机：它的滤光片会彼此串色，并且红、蓝通道灵敏度低于绿通道，所以直接得到的 raw 又暗又偏绿。需要依次做三步：白平衡（给红、蓝通道乘增益，让灰色回到中性）、色彩校正矩阵（用 3×3 矩阵抵消串色）、gamma 编码。拖动滑块试着让画面回到左边的目标；“灰世界”按钮假定整幅画面的平均色是灰色，自动求出增益，但这个假设对这张照片并不精确。"
    >
      <div class="demo-controls">
        <label>
          红增益
          <input v-model.number="wbR" type="range" min="0.5" max="3" step="0.01">
          <span class="demo-code">{{ wbR.toFixed(2) }}</span>
        </label>
        <label>
          蓝增益
          <input v-model.number="wbB" type="range" min="0.5" max="3" step="0.01">
          <span class="demo-code">{{ wbB.toFixed(2) }}</span>
        </label>
        <label>
          色彩矩阵
          <select v-model.number="presetIndex">
            <option v-for="(item, index) in presets" :key="item.label" :value="index">
              {{ item.label }}
            </option>
          </select>
        </label>
        <color-button label="灰世界自动白平衡" @click="autoWhiteBalance"/>
        <color-button label="复位增益" @click="resetWhiteBalance"/>
      </div>
      <demo-canvas title="目标（真实场景）" :width="WIDTH" :height="HEIGHT" :draw="drawTarget"/>
      <demo-canvas title="① 去马赛克后的 raw" :width="WIDTH" :height="HEIGHT" :draw="drawRawStage"/>
      <demo-canvas title="② 白平衡后" :width="WIDTH" :height="HEIGHT" :draw="drawWbStage"/>
      <demo-canvas title="③ 色彩矩阵 + gamma 编码" :width="WIDTH" :height="HEIGHT" :draw="drawFinalStage"/>
      <p class="bayer-note">
        结果与目标的 PSNR：<span class="demo-code">{{ scoreText(finalScore) }}</span>。红增益 1.82、蓝增益 1.43 并选用相机校色矩阵时，只剩去马赛克本身的误差。真实的 RAW 转换器还要做黑电平扣除、镜头暗角校正、降噪、色调曲线、锐化、色彩管理等许多步骤，这里只画出了与颜色最相关的几步。
      </p>
    </demo-section>

    <demo-section
      title="别的传感器"
      desc="并非所有相机都用拜耳阵列。富士的 X-Trans 用 6×6 的不规则排列，让每行每列都有三种颜色，从而不依赖低通滤波就能压住摩尔纹；Sigma 的 Foveon 传感器在同一个位置纵向叠三层感光层，利用硅对不同波长光的吸收深度不同来分色，不需要去马赛克；还有手机上常见的 Quad Bayer，把 2×2 个同色像素当作一组，暗处合并成一个大像素，亮处再分开读取。"
    />
  </demo-page>
</template>

<style lang="less">
.bayer-table {
  margin: 4px 0 8px;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 12px;
    border: 1px solid #DDDEE4;
    text-align: left;
    background: #FFF;
  }
  &-active td {
    background: #EDF4FE;
    color: #4B98F8;
  }
}

.bayer-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
</style>
