<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {transformPlate, recompose, estimateShift} from '../utils/separation';
import type {ShiftEstimate} from '../utils/separation';
import {
  WIDTH,
  HEIGHT,
  TRI_W,
  TRI_H,
  CROP_PERSON,
  CROP_FLAG,
  plateR,
  plateG,
  plateB,
  bytesR,
  bytesG,
  bytesB,
  simultaneous,
  barycentric,
  maxwellColor,
  drawTriangle,
  putBytes,
  putCrop
} from '../composables/prokudin';
import type {DrawFn} from '../composables/prokudin';

// ---- Maxwell 三角形 ----
const marker = ref<number[] | null>([180, 203]);
const weights = computed(() => marker.value ? barycentric(marker.value[0], marker.value[1]) : null);
const mixHex = computed(() => {
  if (!weights.value) {
    return '';
  }
  return '#' + maxwellColor(weights.value).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
});
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
const drawMaxwell: DrawFn = (ctx, w, h) => {
  drawTriangle(marker.value)(ctx, w, h);
};
const onPick = (event: {x: number; y: number}) => {
  if (barycentric(event.x, event.y)) {
    marker.value = [event.x, event.y];
  }
};

// ---- 三块底片 ----
const cleanBytes = recompose(plateR, plateG, plateB);
const idealBytes = recompose(simultaneous[0], simultaneous[1], simultaneous[2]);
const drawR: DrawFn = ctx => putBytes(ctx, bytesR);
const drawG: DrawFn = ctx => putBytes(ctx, bytesG);
const drawB: DrawFn = ctx => putBytes(ctx, bytesB);
const drawClean: DrawFn = ctx => putBytes(ctx, cleanBytes);
const drawIdeal: DrawFn = ctx => putBytes(ctx, idealBytes);
const drawCleanFlag: DrawFn = ctx => putCrop(ctx, cleanBytes, CROP_FLAG, 4);
const drawIdealFlag: DrawFn = ctx => putCrop(ctx, idealBytes, CROP_FLAG, 4);

// ---- 套准误差 ----
const gdx = ref(3);
const gdy = ref(-2);
const bdx = ref(-4);
const bdy = ref(3);
const rot = ref(0.8);
const gMis = computed(() => transformPlate(plateG, gdx.value, gdy.value));
const bMis = computed(() => transformPlate(plateB, bdx.value, bdy.value, rot.value));
const misBytes = computed(() => recompose(plateR, gMis.value, bMis.value));
const drawMis: DrawFn = ctx => putBytes(ctx, misBytes.value);
const drawMisPerson: DrawFn = ctx => putCrop(ctx, misBytes.value, CROP_PERSON, 3);
const drawCleanPerson: DrawFn = ctx => putCrop(ctx, cleanBytes, CROP_PERSON, 3);

// ---- 自动对齐 ----
const info = ref<{g: ShiftEstimate; b: ShiftEstimate} | null>(null);
watch([gdx, gdy, bdx, bdy, rot], () => {
  info.value = null;
});
const align = () => {
  info.value = {g: estimateShift(plateR, gMis.value, 10), b: estimateShift(plateR, bMis.value, 10)};
};
const alignedBytes = computed(() => {
  if (!info.value) {
    return null;
  }
  const {g, b} = info.value;
  return recompose(plateR, transformPlate(gMis.value, -g.dx, -g.dy), transformPlate(bMis.value, -b.dx, -b.dy));
});
const drawAligned: DrawFn = ctx => {
  if (alignedBytes.value) {
    putBytes(ctx, alignedBytes.value);
  }
};
const drawAlignedPerson: DrawFn = ctx => {
  if (alignedBytes.value) {
    putCrop(ctx, alignedBytes.value, CROP_PERSON, 3);
  }
};
</script>

<template>
  <demo-page>
    <demo-section
      title="三色分色摄影：用三张黑白底片拍出彩色照片"
      desc="1861 年，麦克斯韦（James Clerk Maxwell）用红、绿、蓝三块滤光片给同一条格子布缎带拍了三张黑白照片，再用三台投影机分别套上同样的滤光片投到银幕上，叠出了第一张彩色照片。1905 到 1915 年，俄国摄影师普罗库金-戈尔斯基（Prokudin-Gorsky）把这个办法用得极好：同一景物依次拍三张，再用三色光叠加。这正是 RGB 加色原理的实物证明——彩色可以拆成三个通道分别记录。"
    >
      <p class="prokudin-note">
        下面的画面是程序生成的示意场景，不是历史照片。
      </p>
    </demo-section>

    <demo-section
      title="Maxwell 色三角：三种光的比例决定颜色"
      desc="三角形的三个顶点是纯红光、纯绿光和纯蓝光，三角形里任意一点到三个顶点的距离（重心坐标）就是三种光的比例。点击三角形内任意位置查看。为了只表示“色”而不表示光的“量”，颜色按最亮的通道归一化后显示，所以三角形中心是白。三个比例相加等于 1，所以只需要两个数就能确定一点：这就是 rg 色度坐标 r = R / (R + G + B)、g = G / (R + G + B) 的由来，再往前一步就是 CIE 色度图。"
    >
      <demo-canvas :width="TRI_W" :height="TRI_H" :draw="drawMaxwell" @pick="onPick"/>
      <div v-if="weights" class="prokudin-readout">
        <p>
          R <span class="demo-code">{{ percent(weights[0]) }}</span>
          G <span class="demo-code">{{ percent(weights[1]) }}</span>
          B <span class="demo-code">{{ percent(weights[2]) }}</span>
        </p>
        <p>
          <span class="demo-swatch" :style="{background: mixHex}"/>
          <span class="demo-code">{{ mixHex }}</span>
        </p>
        <p>r = {{ weights[0].toFixed(3) }}，g = {{ weights[1].toFixed(3) }}（b = 1 − r − g）</p>
      </div>
    </demo-section>

    <demo-section
      title="三块底片与运动彩边"
      desc="三块底片分别通过红、绿、蓝滤光片拍摄，滤光片并不完美，红滤光片也会漏进一点绿光（串色矩阵：红 0.92/0.08/0，绿 0.06/0.84/0.10，蓝 0/0.12/0.88），合成时按这个矩阵的逆还原。三次曝光有间隔：红底片拍在最前，蓝底片最后。静止的房子、栅栏、天空三张底片完全一致，叠出来没有问题；但旗、小船、行人、树冠在三次曝光之间动了，叠出来就会出现红、绿、蓝的彩边——右侧是理想情况（三块底片同时曝光）的对照。"
    >
      <demo-canvas title="红底片 (t = 0)" :width="WIDTH" :height="HEIGHT" :draw="drawR"/>
      <demo-canvas title="绿底片 (t = 1)" :width="WIDTH" :height="HEIGHT" :draw="drawG"/>
      <demo-canvas title="蓝底片 (t = 2)" :width="WIDTH" :height="HEIGHT" :draw="drawB"/>
      <br>
      <demo-canvas title="三块底片叠合" :width="WIDTH" :height="HEIGHT" :draw="drawClean"/>
      <demo-canvas title="理想：同时曝光" :width="WIDTH" :height="HEIGHT" :draw="drawIdeal"/>
      <demo-canvas title="旗面放大（叠合）" :width="240" :height="176" :draw="drawCleanFlag"/>
      <demo-canvas title="旗面放大（理想）" :width="240" :height="176" :draw="drawIdealFlag"/>
    </demo-section>

    <demo-section
      title="套准误差：底片没对准"
      desc="三块玻璃底片要叠得严丝合缝很难：拍摄间隔里相机会晃，扫描时底片会偏。下面的滑块给绿底片和蓝底片加上平移，给蓝底片加一点点旋转，叠出来的边缘会出现明显的彩色重影。放大的是行人部分，对比左边没有套准误差的叠合。"
    >
      <div class="demo-controls">
        <label>绿底片 dx <input v-model.number="gdx" type="range" min="-8" max="8"><span class="demo-code">{{ gdx }}</span></label>
        <label>dy <input v-model.number="gdy" type="range" min="-8" max="8"><span class="demo-code">{{ gdy }}</span></label>
        <label>蓝底片 dx <input v-model.number="bdx" type="range" min="-8" max="8"><span class="demo-code">{{ bdx }}</span></label>
        <label>dy <input v-model.number="bdy" type="range" min="-8" max="8"><span class="demo-code">{{ bdy }}</span></label>
        <label>旋转 <input v-model.number="rot" type="range" min="-2" max="2" step="0.1"><span class="demo-code">{{ rot.toFixed(1) }}°</span></label>
      </div>
      <demo-canvas title="套准误差下的叠合" :width="WIDTH" :height="HEIGHT" :draw="drawMis"/>
      <demo-canvas title="行人放大 · 有误差" :width="270" :height="174" :draw="drawMisPerson"/>
      <demo-canvas title="行人放大 · 无误差" :width="270" :height="174" :draw="drawCleanPerson"/>
    </demo-section>

    <demo-section
      title="自动对齐：用互相关找出平移量"
      desc="计算机怎样把三块底片对准？先把每块底片变成边缘图（Sobel 梯度幅值），因为三块底片的明暗常常相反（天空在蓝底片上亮、红底片上暗），但边缘位置是一致的；然后以红底片为基准，在 ±10 像素范围内试遍所有平移，选使归一化互相关（NCC）最大的那一个。这里只估计整像素平移，不处理旋转，所以对有旋转的底片只能对准一部分。真实的扫描件有几千像素宽，要先缩成小图找到大致位置，再逐级放大精修，这种做法叫图像金字塔。"
    >
      <color-button u="primary" label="自动对齐（±10 像素）" @click="align"/>
      <template v-if="info">
        <p class="prokudin-readout">
          绿底片：检测到偏移 ({{ info.g.dx }}, {{ info.g.dy }})，实际加入 ({{ gdx }}, {{ gdy }})，NCC = {{ info.g.score.toFixed(3) }}<br>
          蓝底片：检测到偏移 ({{ info.b.dx }}, {{ info.b.dy }})，实际加入 ({{ bdx }}, {{ bdy }})，旋转 {{ rot.toFixed(1) }}° 未被补偿，NCC = {{ info.b.score.toFixed(3) }}
        </p>
        <demo-canvas title="对齐后" :width="WIDTH" :height="HEIGHT" :draw="drawAligned"/>
        <demo-canvas title="行人放大 · 对齐后" :width="270" :height="174" :draw="drawAlignedPerson"/>
        <demo-canvas title="行人放大 · 对齐前" :width="270" :height="174" :draw="drawMisPerson"/>
      </template>
      <p v-else class="prokudin-note">
        点击按钮开始。调整上面的滑块会清空结果。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.prokudin-note {
  margin: 4px 0 8px;
  font-size: 13px;
  color: #888;
}
.prokudin-readout {
  display: inline-block;
  vertical-align: top;
  margin: 8px 0 12px 12px;
  font-size: 13px;
  line-height: 26px;
  color: #444;
  .demo-code {
    margin: 0 10px 0 4px;
  }
}
</style>
