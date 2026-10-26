<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {dirLuminance} from '../utils/csf';
import {
  CHART_CANVAS_W,
  CHART_CANVAS_H,
  CURVE_W,
  CURVE_H,
  IMG_W,
  IMG_H,
  drawLumaChart,
  drawRgChart,
  drawByChart,
  drawCurves,
  blurDrawer,
  pixelsPerDegree
} from '../composables/csf';

const sigma = ref(6);
const distance = ref(60);

const ppd = computed(() => pixelsPerDegree(distance.value));
const cutoff = computed(() => ppd.value / (2 * Math.PI * Math.max(sigma.value, 0.5)));

const drawOriginal = blurDrawer('original', () => sigma.value);
const drawLuma = blurDrawer('luma', () => sigma.value);
const drawChroma = blurDrawer('chroma', () => sigma.value);

const lumRg = dirLuminance('rg').toExponential(1);
const lumBy = dirLuminance('by').toExponential(1);
</script>

<template>
  <demo-page>
    <demo-section
      title="Campbell–Robson 图：看看你自己的对比敏感度"
      desc="横轴是空间频率（条纹有多细，从左到右对数增大），纵轴是对比度（条纹有多淡，从上到下对数降低）。每一列的条纹粗细是固定的，每一行的深浅是固定的，所以理论上整幅图每处都是清晰的条纹，但实际看到的条纹可见区域有一条拱形的边界：中间（大约每度 4 到 10 周）最敏感，条纹一直延伸到画面很靠下的位置；向两侧，条纹都要更深才看得到。这条边界就是你的对比敏感度函数。边界位置取决于你与屏幕的距离，所以贴近或远离屏幕，拱的位置会左右移动。"
    >
      <demo-canvas title="亮度光栅（明暗条纹）" :width="CHART_CANVAS_W" :height="CHART_CANVAS_H" :draw="drawLumaChart"/>
    </demo-section>

    <demo-section
      title="等亮度的彩色光栅：可见区域缩到低频"
      :desc="`下面两幅图的条纹只有颜色变化，没有亮度变化：红绿条纹的亮度调制幅度是 ${lumRg}，蓝黄条纹是 ${lumBy}（用 Rec.709 亮度系数在线性光里计算，接近于 0）。你会发现可见的区域比亮度图小得多，而且只在左侧的低频部分：眼睛对色度细节远没有对亮度细节敏感，蓝黄尤其差。注意：显示器是用 sRGB 数值驱动的，每个人的眼睛、屏幕和环境光都不同，所谓“等亮度”是按标准公式算出来的近似，不一定和你主观的等亮度完全一致。`"
    >
      <demo-canvas title="红绿光栅（等亮度）" :width="CHART_CANVAS_W" :height="CHART_CANVAS_H" :draw="drawRgChart"/>
      <demo-canvas title="蓝黄光栅（等亮度）" :width="CHART_CANVAS_W" :height="CHART_CANVAS_H" :draw="drawByChart"/>
    </demo-section>

    <demo-section
      title="CSF 曲线"
      desc="把上面的拱形边界画成曲线，就是对比敏感度函数。亮度曲线用的是 Mannos 和 Sakrison（1974）的经验公式，峰值约在每度 8 周；红绿和蓝黄两条是我设的低通示意曲线，截止频率分别取 3 和 1.5 周/度，并没有对照具体的实验数据，只是表达“色度敏感度低得多，也没有低频衰减”这个趋势。"
    >
      <demo-canvas :width="CURVE_W" :height="CURVE_H" :draw="drawCurves"/>
    </demo-section>

    <demo-section
      title="色度子采样为什么可行"
      desc="既然眼睛对色度细节不敏感，图像和视频就可以把色度压得更粗，而基本不损失观感（4:2:0 就是这样做的，见“视频色彩模型”页）。下面用 YCbCr 拆分：第二张只把亮度 Y 模糊，第三张只把色度 Cb、Cr 用同样大小模糊。对比原图，第二张细节明显糊了，第三张几乎看不出区别，只有色块的边缘颜色略微渗开。"
    >
      <div class="demo-controls">
        <label>
          模糊半径 σ
          <input v-model.number="sigma" type="range" min="0" max="12" step="0.5">
          <span class="demo-code">{{ sigma.toFixed(1) }} 像素</span>
        </label>
        <label>
          观看距离
          <input v-model.number="distance" type="range" min="30" max="200" step="5">
          <span class="demo-code">{{ distance }} cm</span>
        </label>
        <span class="demo-code">1 度 ≈ {{ ppd.toFixed(0) }} 像素，模糊后的截止频率 ≈ {{ cutoff.toFixed(1) }} 周/度</span>
      </div>
      <p class="demo-section-desc">
        换算假设：屏幕像素间距 0.2646 mm（约 96 dpi），模糊的截止频率按高斯函数的 1/e 点 1 / (2πσ) 周/像素估算。色度的示意截止频率约 1.5 到 3 周/度，亮度的峰值在 8 周/度附近；当模糊的截止频率远低于亮度敏感范围、却还高于色度的截止时，就会出现“糊亮度很明显、糊色度不明显”。
      </p>
      <demo-canvas title="原图" :width="IMG_W" :height="IMG_H" :draw="drawOriginal"/>
      <demo-canvas title="只模糊亮度 Y" :width="IMG_W" :height="IMG_H" :draw="drawLuma"/>
      <demo-canvas title="只模糊色度 Cb、Cr" :width="IMG_W" :height="IMG_H" :draw="drawChroma"/>
    </demo-section>
  </demo-page>
</template>
