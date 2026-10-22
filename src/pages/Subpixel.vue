<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import type {Layout} from '../composables/subpixel';
import {
  SRC_W,
  SRC_H,
  TEXT_W,
  TEXT_H,
  LAYOUTS,
  getSource,
  drawSubpixels,
  getTextRaster,
  drawRaster,
  drawGammaDemo,
  drawPwm
} from '../composables/subpixel';

const VIEW_W = 560;
const VIEW_H = 360;
const TEXT_ZOOM = 7;

const layout = ref<Layout>('rgb');
const zoom = ref(12);
const panX = ref(0);
const panY = ref(0);
const throughStripe = ref(false);

const cols = computed(() => Math.floor(VIEW_W / zoom.value));
const rows = computed(() => Math.floor(VIEW_H / zoom.value));
const maxPanX = computed(() => Math.max(0, SRC_W - cols.value));
const maxPanY = computed(() => Math.max(0, SRC_H - rows.value));
const offsetX = computed(() => Math.min(panX.value, maxPanX.value));
const offsetY = computed(() => Math.min(panY.value, maxPanY.value));

const drawMacro = (ctx: CanvasRenderingContext2D) => {
  drawSubpixels(ctx, {
    raster: getSource(),
    layout: layout.value,
    zoom: zoom.value,
    ox: offsetX.value,
    oy: offsetY.value,
    width: VIEW_W,
    height: VIEW_H
  });
};

const drawSource = (ctx: CanvasRenderingContext2D) => {
  drawRaster(ctx, getSource(), 4);
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX.value * 4 + 0.5, offsetY.value * 4 + 0.5, cols.value * 4 - 1, rows.value * 4 - 1);
};

const drawText = (subpixel: boolean) => (ctx: CanvasRenderingContext2D) => {
  const raster = getTextRaster(subpixel);
  if (throughStripe.value) {
    drawSubpixels(ctx, {
      raster,
      layout: 'rgb',
      zoom: TEXT_ZOOM,
      ox: 0,
      oy: 0,
      width: TEXT_W * TEXT_ZOOM,
      height: TEXT_H * TEXT_ZOOM
    });
  } else {
    drawRaster(ctx, raster, TEXT_ZOOM);
  }
};
const drawTextActual = (subpixel: boolean) => (ctx: CanvasRenderingContext2D) => {
  drawRaster(ctx, getTextRaster(subpixel), 1);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="屏幕上的“一个像素”"
      desc="放大到足够大你会发现，屏幕上没有真正的“白点”或“黄点”，每个像素是由几个只会发红、绿或蓝光的小点（子像素）拼成的，眼睛离得远，三个点的光混在一起，就被看成了一个颜色。这正是加色混合：白色 = 三个子像素全亮，黄色 = 红 + 绿亮、蓝熄灭。下面把一张 48×32 的小图按所选的排列方式展开成子像素，每个子像素的亮度取该像素对应通道的数值。"
    >
      <div class="demo-controls">
        <label>
          排列方式
          <select v-model="layout">
            <option v-for="item in LAYOUTS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          放大倍数
          <input v-model.number="zoom" type="range" min="6" max="24" step="2">
          <span class="demo-code">{{ zoom }}×</span>
        </label>
        <label>
          水平平移
          <input v-model.number="panX" type="range" min="0" :max="maxPanX" :disabled="maxPanX === 0">
        </label>
        <label>
          垂直平移
          <input v-model.number="panY" type="range" min="0" :max="maxPanY" :disabled="maxPanY === 0">
        </label>
      </div>
      <demo-canvas title="展开成子像素" :width="VIEW_W" :height="VIEW_H" :draw="drawMacro"/>
      <demo-canvas title="原图（黄框是当前放大范围）" :width="SRC_W * 4" :height="SRC_H * 4" :draw="drawSource"/>
      <p class="subpixel-note">
        RGB 条纹是最常见的 LCD 排列，三个竖条并排；BGR 只是顺序相反。PenTile 的每个像素只有两个子像素：一个绿加一个红或蓝，红和蓝交替出现，用更少的子像素（对寿命较短的蓝色 OLED 尤其有利）靠算法“补”回分辨率，所以同样标称分辨率下文字边缘会更毛。三角点阵是 CRT 显像管的样子，荧光点被一块打孔的荫罩隔开。这里的画法是示意：真实面板的子像素大小、间隙和形状各不相同，PenTile 的渲染还要做滤波。
      </p>
    </demo-section>

    <demo-section
      title="ClearType：把子像素当作三倍的水平分辨率"
      desc="既然 RGB 条纹屏的每个像素里，红、绿、蓝是从左到右排好的，就可以把它们当成三个独立的小像素，让文字的竖直笔画在水平方向上有三倍的精度。做法是：先在三倍水平分辨率下算出文字的覆盖率，再用 [1, 2, 3, 2, 1] / 9 的滤波器分别算出每个通道的亮度。滤波是为了压住彩边，但笔画边缘仍会带一点颜色。上图左边是普通灰度抗锯齿，右边是这种子像素渲染。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="throughStripe" type="checkbox">
          通过 RGB 条纹子像素显示（更接近肉眼在屏幕上看到的样子）
        </label>
      </div>
      <demo-canvas title="灰度抗锯齿（放大 7 倍）" :width="TEXT_W * TEXT_ZOOM" :height="TEXT_H * TEXT_ZOOM" :draw="drawText(false)"/>
      <demo-canvas title="子像素渲染（放大 7 倍）" :width="TEXT_W * TEXT_ZOOM" :height="TEXT_H * TEXT_ZOOM" :draw="drawText(true)"/>
      <demo-canvas title="实际大小：灰度" :width="TEXT_W" :height="TEXT_H" :draw="drawTextActual(false)"/>
      <demo-canvas title="实际大小：子像素" :width="TEXT_W" :height="TEXT_H" :draw="drawTextActual(true)"/>
      <p class="subpixel-note">
        这种方法只适合已知排列的屏幕：换成 BGR、PenTile，或者把屏幕旋转 90 度，彩边就会出现在错误的方向；截图发给别人、在投影仪或电视上显示时，也会看到不该有的彩色边缘。所以苹果在 macOS Mojave 之后就不再使用子像素抗锯齿了，高分辨率屏幕上它的收益也很小。
      </p>
    </demo-section>

    <demo-section
      title="PWM 调光：用开关的快慢代替亮度"
      desc="很多屏幕的背光（以及 OLED 的低亮度模式）无法连续调节亮度，而是以很高的频率快速开关，用“亮的时间占多大比例”（占空比）来控制平均亮度。下图是 10 毫秒内的亮度波形：蓝线是实际的亮灭，橙色虚线是眼睛感受到的平均亮度。同样是 10% 亮度，240 Hz 时每个周期里亮的时间约 0.4 毫秒、灭 3.75 毫秒；1000 Hz 则密得多。"
    >
      <demo-canvas title="亮度 100% / 50% / 10% 的波形" :width="560" :height="300" :draw="drawPwm"/>
      <p class="subpixel-note">
        频率低、亮度低时，开关的间隔长到快速转动视线或拍视频时能察觉到闪烁，敏感的人会头晕、眼睛疲劳；高频（几千赫兹）或者直流调光就没有这个问题。拍摄屏幕时出现的横向暗条，也是相机的曝光时间和 PWM 频率不同步造成的。
      </p>
    </demo-section>

    <demo-section
      title="灰色不是“一半亮度”"
      desc="白色就是三个子像素全亮；数值 128 的灰把每个子像素的驱动值设为 128，但屏幕的亮度响应有 gamma 曲线，实际发出的光只有最亮时的约 22%，要发出一半的光，需要 188 左右。红色只亮红色子像素，黄色是红 + 绿亮、蓝熄灭，所以黄色比红色更亮——这就是加色混合。详见“Gamma与线性光”。"
    >
      <demo-canvas title="几个颜色的 RGB 条纹子像素" :width="360" :height="84" :draw="drawGammaDemo"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.subpixel-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
</style>
