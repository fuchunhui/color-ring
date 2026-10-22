<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {apcaContrast} from '../utils/apca';
import {contrastRatio, Vec3} from '../utils/space';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const fg = ref('#767676');
const bg = ref('#ffffff');

const parse = (hex: string): Vec3 => {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Vec3;
};

const lc = computed(() => apcaContrast(parse(fg.value), parse(bg.value)));
const ratio = computed(() => contrastRatio(parse(fg.value), parse(bg.value)));

const polarity = computed(() => {
  if (Math.abs(lc.value) < 1) {
    return '几乎没有对比';
  }
  return lc.value > 0 ? '浅底深字（正极性）' : '深底浅字（负极性）';
});

const verdict = computed(() => {
  const v = Math.abs(lc.value);
  if (v >= 90) {
    return '正文优选';
  }
  if (v >= 75) {
    return '可用于正文';
  }
  if (v >= 60) {
    return '适合大字号、标题';
  }
  if (v >= 45) {
    return '仅适合很大的文字';
  }
  if (v >= 30) {
    return '仅适合非文字内容或占位符';
  }
  return '不适合承载文字';
});

const swap = () => {
  [fg.value, bg.value] = [bg.value, fg.value];
};

const LEVELS = 16;
const CELL = 20;
const MARGIN = 28;
const SIZE = MARGIN + LEVELS * CELL + 22;

const gray = (i: number): Vec3 => {
  const v = Math.round(i * 255 / (LEVELS - 1));
  return [v, v, v];
};

const heat = (draw: (fgIndex: number, bgIndex: number) => string, ctx: CanvasRenderingContext2D, title: string) => {
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('背景 浅→深', MARGIN + LEVELS * CELL / 2, 10);
  ctx.save();
  ctx.translate(10, MARGIN + LEVELS * CELL / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('文字 浅→深', 0, 0);
  ctx.restore();
  for (let f = 0; f < LEVELS; f++) {
    for (let b = 0; b < LEVELS; b++) {
      ctx.fillStyle = draw(LEVELS - 1 - f, LEVELS - 1 - b);
      ctx.fillRect(MARGIN + b * CELL, MARGIN + f * CELL, CELL - 1, CELL - 1);
    }
  }
  ctx.fillStyle = '#333';
  ctx.fillText(title, MARGIN + LEVELS * CELL / 2, SIZE - 8);
};

const mix = (t: number, color: Vec3): string => {
  const k = Math.min(1, Math.max(0, t));
  const c = color.map(v => Math.round(255 + (v - 255) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

const drawApca: DrawFn = ctx => {
  heat((f, b) => mix(Math.abs(apcaContrast(gray(f), gray(b))) / 108, [30, 90, 200]), ctx, 'APCA |Lc|（越深越强）');
};

const drawWcag: DrawFn = ctx => {
  heat((f, b) => mix(Math.log(contrastRatio(gray(f), gray(b))) / Math.log(21), [30, 150, 80]), ctx, 'WCAG 2 对比度（越深越强）');
};

const drawDiff: DrawFn = ctx => {
  heat((f, b) => {
    const wcagPass = contrastRatio(gray(f), gray(b)) >= 4.5;
    const apcaPass = Math.abs(apcaContrast(gray(f), gray(b))) >= 75;
    if (wcagPass && !apcaPass) {
      return 'rgb(220, 70, 60)';
    }
    if (!wcagPass && apcaPass) {
      return 'rgb(240, 160, 40)';
    }
    return wcagPass ? 'rgb(200, 225, 205)' : 'rgb(235, 235, 235)';
  }, ctx, '红=WCAG 过 APCA 不过　橙=反之');
};
</script>

<template>
  <demo-page>
    <demo-section
      title="APCA 对比度"
      desc="WCAG 2 的对比度公式只看两个颜色的相对亮度之比，不区分谁是文字、谁是背景，也不考虑字号和字重。APCA（Accessible Perceptual Contrast Algorithm）是 WCAG 3 草案中提出的新算法：结果带符号，浅底深字和深底浅字的感知不同，所以数值不对称。需要说明：APCA 仍是草案，目前合规检查的现行标准依旧是 WCAG 2。"
    >
      <div class="demo-controls">
        <label>
          文字色
          <input v-model="fg" type="color">
          <span class="demo-code">{{ fg }}</span>
        </label>
        <label>
          背景色
          <input v-model="bg" type="color">
          <span class="demo-code">{{ bg }}</span>
        </label>
        <color-button label="互换" @click="swap"/>
      </div>
      <div class="apca-sample" :style="{background: bg, color: fg}">
        <div class="apca-large">
          大字示例 Large Text 32px
        </div>
        <div class="apca-body">
          小字示例 Body text 16px：色彩的世界，不只是红绿蓝。
        </div>
      </div>
      <p class="demo-code apca-result">
        APCA Lc = {{ lc.toFixed(1) }}（{{ polarity }}）&emsp;WCAG 2 = {{ ratio.toFixed(2) }} : 1&emsp;→ {{ verdict }}
      </p>
    </demo-section>
    <demo-section
      title="灰阶对比：APCA 与 WCAG 2 在哪里不一致"
      desc="横轴是背景灰度，纵轴是文字灰度，各取 16 级。左：APCA 的 |Lc|。中：WCAG 2 对比度。右：以“正文”为口径比较 —— WCAG 2 ≥ 4.5 对应 APCA |Lc| ≥ 75：红色格子是 WCAG 通过但 APCA 认为偏低，橙色格子相反。红格主要沿 WCAG 刚好及格的边界分布（4.54 : 1 的浅底深字约为 Lc 72，深底浅字约为 Lc 77）；差异最大的是黑字放在中灰背景上，WCAG 2 给出 4.6 : 1（通过），APCA 的 |Lc| 只有约 32。口径 75 只是常见的参考值，并非规范。"
    >
      <demo-canvas :width="SIZE" :height="SIZE" :draw="drawApca"/>
      <demo-canvas :width="SIZE" :height="SIZE" :draw="drawWcag"/>
      <demo-canvas :width="SIZE" :height="SIZE" :draw="drawDiff"/>
    </demo-section>
    <demo-section
      title="常被引用的 Lc 参考值"
      desc="参考，非规范原文，字号字重的完整对照请查 APCA 官方文档。"
    >
      <table class="apca-table">
        <thead>
          <tr>
            <th>用途</th>
            <th>参考 |Lc|</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>正文（常规字重、较小字号）</td>
            <td>75 以上，90 更优</td>
          </tr>
          <tr>
            <td>大字号、标题</td>
            <td>约 60</td>
          </tr>
          <tr>
            <td>很大的字、粗体装饰文字</td>
            <td>约 45</td>
          </tr>
          <tr>
            <td>占位符、非文字内容（图标、分隔线）</td>
            <td>约 30</td>
          </tr>
          <tr>
            <td>不承载信息的装饰</td>
            <td>15 以下也可</td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.apca-sample {
  max-width: 560px;
  padding: 18px 20px;
  border: 1px solid #DDDEE4;
}
.apca-large {
  font-size: 32px;
  line-height: 44px;
}
.apca-body {
  margin-top: 8px;
  font-size: 16px;
}
.apca-result {
  margin-top: 10px;
}
.apca-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 6px 16px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
}
</style>
