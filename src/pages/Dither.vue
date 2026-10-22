<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {makePhotoScene, toSrgbBytes} from '../utils/scene';
import {
  METHODS,
  PALETTE_OPTIONS,
  buildPalette,
  ditherGray,
  ditherColor
} from '../utils/dither';

type DrawFn = (ctx: CanvasRenderingContext2D) => void;

const RAMP_W = 480;
const RAMP_H = 56;
const IMG_W = 240;
const IMG_H = 180;
const SWATCH_W = 480;

const rampBytes = new Uint8ClampedArray(RAMP_W * RAMP_H * 4);
for (let y = 0; y < RAMP_H; y++) {
  for (let x = 0; x < RAMP_W; x++) {
    const v = Math.round(255 * x / (RAMP_W - 1));
    const i = (y * RAMP_W + x) * 4;
    rampBytes[i] = v;
    rampBytes[i + 1] = v;
    rampBytes[i + 2] = v;
    rampBytes[i + 3] = 255;
  }
}
const imageBytes = toSrgbBytes(makePhotoScene(IMG_W, IMG_H).image);

const levels = ref(4);
const paletteKey = ref('median8');
const linear = ref(false);

const bytesDrawer = (bytes: Uint8ClampedArray, w: number, h: number): DrawFn => ctx => {
  ctx.putImageData(new ImageData(bytes, w, h), 0, 0);
};

const palette = computed(() => buildPalette(paletteKey.value, imageBytes));

const grayTiles = computed(() => METHODS.map(m => {
  const out = ditherGray(rampBytes, RAMP_W, RAMP_H, levels.value, m.key, linear.value);
  return {key: m.key, label: m.label, draw: bytesDrawer(out, RAMP_W, RAMP_H)};
}));

const colorTiles = computed(() => METHODS.map(m => {
  const out = ditherColor(imageBytes, IMG_W, IMG_H, palette.value, m.key, linear.value);
  return {key: m.key, label: m.label, draw: bytesDrawer(out, IMG_W, IMG_H)};
}));

const swatchCell = computed(() => (palette.value.colors.length > 64 ? 8 : 24));
const swatchHeight = computed(() => {
  const cols = Math.floor(SWATCH_W / swatchCell.value);
  return Math.ceil(palette.value.colors.length / cols) * swatchCell.value;
});

const drawSwatches: DrawFn = ctx => {
  const cell = swatchCell.value;
  const cols = Math.floor(SWATCH_W / cell);
  palette.value.colors.forEach((c, i) => {
    ctx.fillStyle = `rgb(${c.join(',')})`;
    ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
  });
};

const original: DrawFn = ctx => {
  ctx.putImageData(new ImageData(imageBytes, IMG_W, IMG_H), 0, 0);
};

const rampOriginal: DrawFn = ctx => {
  ctx.putImageData(new ImageData(rampBytes, RAMP_W, RAMP_H), 0, 0);
};

const paletteTip = computed(() => `${palette.value.colors.length} 色`);
</script>

<template>
  <demo-page>
    <demo-section
      title="灰阶渐变：只有几级灰时怎么表现平滑过渡"
      desc="屏幕只能显示有限的颜色（比如 GIF 只有 256 色，早期设备更少）。把平滑渐变直接取最近的灰阶会出现一条条明显的色带；抖动（dithering）用空间上的点阵或噪声，让相邻像素在两级之间交替出现，远看时平均亮度就接近原来的渐变。有序抖动用固定的阈值矩阵，规整但有纹路；误差扩散（Floyd–Steinberg、Atkinson）把每个像素的量化误差分给邻居，更自然；随机噪声没有规律，但颗粒最粗。"
    >
      <div class="demo-controls">
        <label>
          灰阶级数
          <select v-model.number="levels">
            <option :value="2">2 级</option>
            <option :value="4">4 级</option>
            <option :value="8">8 级</option>
            <option :value="16">16 级</option>
          </select>
        </label>
        <label>
          <input v-model="linear" type="checkbox">
          在线性光中判定并扩散误差
        </label>
      </div>
      <demo-canvas title="原图（256 级）" :width="RAMP_W" :height="RAMP_H" :draw="rampOriginal"/>
      <demo-canvas
        v-for="tile in grayTiles"
        :key="tile.key"
        :title="tile.label"
        :width="RAMP_W"
        :height="RAMP_H"
        :draw="tile.draw"
      />
    </demo-section>

    <demo-section
      title="彩色量化：用有限的调色板还原一幅图"
      desc="彩色图片要先决定用哪些颜色，再决定每个像素用哪一个。中位切分（median cut）按图片里实际出现的颜色分布，反复把颜色最分散的那组从中位数切开，每组取平均作为调色板，适合少色数；RGB332 和网页安全色是固定的网格调色板，不依赖图片。同一个调色板下，不同抖动方式的差别非常明显，尤其在天空的渐变和草地的纹理上。"
    >
      <div class="demo-controls">
        <label>
          调色板
          <select v-model="paletteKey">
            <option
              v-for="option in PALETTE_OPTIONS"
              :key="option.key"
              :value="option.key"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <span class="demo-code">{{ paletteTip }}</span>
      </div>
      <demo-canvas title="当前调色板" :width="SWATCH_W" :height="swatchHeight" :draw="drawSwatches"/>
      <div>
        <demo-canvas title="原图" :width="IMG_W" :height="IMG_H" :draw="original"/>
        <demo-canvas
          v-for="tile in colorTiles"
          :key="tile.key"
          :title="tile.label"
          :width="IMG_W"
          :height="IMG_H"
          :draw="tile.draw"
        />
      </div>
    </demo-section>

    <demo-section
      title="为什么要在线性光里做"
      desc="量化误差的本质是“少了多少光”，应当按光强相加。如果在 gamma 编码值上扩散误差，就等于把亮度当成了线性量，结果整体偏暗或偏亮：2 级黑白时，一块 50% 光强的区域（编码值约 188）应该由大约一半的白点和一半的黑点组成，而在编码空间里扩散，只会得到约 74% 的白点（188/255），看起来比原图亮。勾选“在线性光中判定并扩散误差”，对比灰阶渐变中间段的明暗，可以看到线性光的结果更接近原图的亮度，但暗部会出现更多孤立的亮点。"
    />
  </demo-page>
</template>
