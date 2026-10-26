<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {LOOKS, buildLut, applyLutBytes, applyGradeBytes, toCube} from '../utils/lut';
import {
  SCENE_W,
  SCENE_H,
  GRADIENT_W,
  GRADIENT_H,
  sceneBytes,
  gradientBytes,
  makeHaldIdentity,
  putBytes,
  drawChart,
  drawCurves,
  drawHald,
  drawSlices,
  compareInterpolation,
  downloadText
} from '../composables/lut';
import type {DrawFn} from '../composables/lut';

const lookKey = ref('tealorange');
const percent = ref(100);

const look = computed(() => LOOKS.find(item => item.key === lookKey.value) || LOOKS[0]);
const strength = computed(() => percent.value / 100);
const lut33 = computed(() => buildLut(look.value.grade, 33, strength.value));
const lut17 = computed(() => buildLut(look.value.grade, 17, strength.value));
const identity17 = buildLut(rgb => rgb, 17);

const gradedScene = computed(() => applyLutBytes(sceneBytes, lut33.value, 'trilinear'));

const SCALE = 1.5;
const drawOriginal: DrawFn = ctx => {
  putBytes(ctx, sceneBytes, SCENE_W, SCENE_H, 0, 0, SCALE);
};
const drawGraded: DrawFn = ctx => {
  putBytes(ctx, gradedScene.value, SCENE_W, SCENE_H, 0, 0, SCALE);
};
const drawChartNow: DrawFn = (ctx, w, h) => {
  drawChart(look.value, strength.value)(ctx, w, h);
};
const drawCurvesNow: DrawFn = (ctx, w, h) => {
  drawCurves(look.value, strength.value)(ctx, w, h);
};

const hald = makeHaldIdentity(4);
const haldGraded = computed(() => applyGradeBytes(hald.bytes, look.value.grade, strength.value));
const HALD_SCALE = 4;
const drawHaldIdentity: DrawFn = (ctx, w, h) => {
  drawHald(hald.bytes, hald.side, HALD_SCALE)(ctx, w, h);
};
const drawHaldGraded: DrawFn = (ctx, w, h) => {
  drawHald(haldGraded.value, hald.side, HALD_SCALE)(ctx, w, h);
};
const drawSlicesNow: DrawFn = (ctx, w, h) => {
  drawSlices(identity17, lut17.value)(ctx, w, h);
};

const quality = computed(() => compareInterpolation(look.value, strength.value));
const qualityDrawers = computed(() => quality.value.map(item => {
  const draw: DrawFn = ctx => {
    putBytes(ctx, item.bytes, GRADIENT_W, GRADIENT_H);
  };
  return draw;
}));
const drawSource: DrawFn = ctx => {
  putBytes(ctx, gradientBytes, GRADIENT_W, GRADIENT_H);
};

const download = () => {
  downloadText(toCube(lut17.value, look.value.label), `${look.value.key}.cube`);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="调色与 LUT"
      desc="调色（Color Grading）就是把每个像素的 RGB 映射成新的 RGB。把这种映射预先算好存成一张表，就是 LUT（Lookup Table，查找表）：拍摄后只要查表，不必再做复杂计算，各种软件和摄像机都能直接加载同一个调色。下面所有的调色都在 sRGB 编码值上进行，先看效果。"
    >
      <div class="demo-controls">
        <label>
          预设
          <select v-model="lookKey">
            <option v-for="item in LOOKS" :key="item.key" :value="item.key">{{ item.label }}</option>
          </select>
        </label>
        <label>
          强度
          <input v-model.number="percent" type="range" min="0" max="100">
          <span class="demo-code">{{ percent }}%</span>
        </label>
      </div>
      <p class="lut-desc">
        {{ look.desc }}
      </p>
      <demo-canvas title="原图" :width="SCENE_W * 1.5" :height="SCENE_H * 1.5" :draw="drawOriginal"/>
      <demo-canvas title="调色后" :width="SCENE_W * 1.5" :height="SCENE_H * 1.5" :draw="drawGraded"/>
      <demo-canvas title="灰阶与色相扫描（上：原图，下：调色后）" :width="560" :height="204" :draw="drawChartNow"/>
    </demo-section>

    <demo-section
      title="一维曲线：沿灰色对角线看调色"
      desc="把 (v, v, v) 的灰色逐点输入调色函数，画出红、绿、蓝三个通道各自的输出。三条线重合说明只是改变明暗（如 S 曲线、褪色）；三条线分开说明有偏色（如青橙、棕褐），偏色量随明暗而变，这是一维曲线做不到、必须用三维 LUT 才能表达的。灰色虚线是 y = x，即不调色。"
    >
      <demo-canvas :width="340" :height="340" :draw="drawCurvesNow"/>
    </demo-section>

    <demo-section
      title="三维 LUT 的本体：Hald CLUT 与蓝色切片"
      desc="一张 3D LUT 其实是 RGB 立方体里规则排列的一堆节点，每个节点存着“输入这个颜色，输出什么颜色”。Hald CLUT 把节点按红色最快、再绿、再蓝的顺序一个接一个排成一张图（这里是 16³ = 4096 个节点，64×64 像素，放大了 4 倍）：左边是恒等 LUT，对它套用调色，得到的图就是该调色的 Hald CLUT。下方把 17³ LUT 按蓝色下标切成 5 张 17×17 的切片，上排是恒等，下排是调色后。"
    >
      <demo-canvas title="恒等 Hald CLUT" :width="256" :height="256" :draw="drawHaldIdentity"/>
      <demo-canvas title="调色后的 Hald CLUT" :width="256" :height="256" :draw="drawHaldGraded"/>
      <demo-canvas title="17³ LUT 的蓝色切片" :width="660" :height="318" :draw="drawSlicesNow"/>
    </demo-section>

    <demo-section
      title="LUT 太小会怎样：节点数与插值方式"
      desc="LUT 只存有限个节点，其余颜色靠插值得到。最近邻取最近的节点，会出现色带；三线性插值在周围 8 个节点之间加权，平滑得多。下面把当前调色做成 5³ 和 17³ 的 LUT，与“逐像素直接计算”的标准答案比较（对象是一张色相 × 明度渐变，误差为 RGB 字节的平均绝对误差）。"
    >
      <demo-canvas title="原渐变（未调色）" :width="GRADIENT_W" :height="GRADIENT_H" :draw="drawSource"/>
      <demo-canvas
        v-for="(item, index) in quality"
        :key="item.label"
        :title="`${item.label}  误差 ${item.error.toFixed(2)}`"
        :width="GRADIENT_W"
        :height="GRADIENT_H"
        :draw="qualityDrawers[index]"
      />
    </demo-section>

    <demo-section
      title="导出 .cube 文件"
      desc=".cube 是 Adobe、DaVinci Resolve、Premiere 等软件通用的文本 LUT 格式：头部是 TITLE、LUT_3D_SIZE、DOMAIN_MIN、DOMAIN_MAX，之后每行一个节点的 R G B（0~1 的小数）。节点顺序是红色下标变化最快、其次绿色、蓝色最慢（外层循环蓝、中层绿、内层红）。下面按当前设置导出 17³ 的 LUT，可直接导入调色软件使用。注意它假定输入输出都是 sRGB 编码值，如果你的素材是 Log 或线性，需要先转换。"
    >
      <color-button u="primary" label="下载 .cube" @click="download"/>
      <span class="demo-code lut-file">{{ look.key }}.cube · 17³ = 4913 行</span>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.lut-desc {
  max-width: 900px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #666;
}
.lut-file {
  margin-left: 12px;
}
</style>
