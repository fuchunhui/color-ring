<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {colors} from '../composables/twelve';
import {
  TEST_W,
  TEST_H,
  GRAY_METHODS,
  WCAG_LEVELS,
  grayTable,
  originalImage,
  grayImage,
  formatRatio,
  ratioOf,
  bestText
} from '../composables/contrast';

const grayCanvases = GRAY_METHODS.map(({key, title, fn}) => ({key, title, draw: grayImage(fn)}));

const fg = ref('#767676');
const bg = ref('#ffffff');

const ratio = computed(() => ratioOf(fg.value, bg.value));
const ratioText = computed(() => formatRatio(ratio.value));
const levels = computed(() => WCAG_LEVELS.map(({label, min}) => ({label, min, pass: ratio.value >= min})));

const swap = () => {
  [fg.value, bg.value] = [bg.value, fg.value];
};

const swatches = colors.map(color => {
  const best = bestText(color.rgb() as [number, number, number]);
  return {
    hex: color.toHex().toUpperCase(),
    text: best.color,
    black: formatRatio(best.black),
    white: formatRatio(best.white)
  };
});
</script>

<template>
  <demo-page>
    <demo-section
      title="灰度转换：同一幅图的四种灰度算法"
      desc="彩色转灰度时，三个通道对亮度的贡献并不相同：人眼对绿最敏感、对蓝最不敏感。平均值法把三个通道一视同仁，纯蓝会变得和纯绿一样亮；Rec.601、Rec.709 加权以及线性光亮度法则让纯蓝明显变暗、纯绿明显变亮。其中前三种直接在 gamma 编码值上运算，最后一种在线性光中算亮度再重新编码，是最接近物理亮度的做法。"
    >
      <demo-canvas title="原图" :width="TEST_W" :height="TEST_H" :draw="originalImage"/>
      <demo-canvas
        v-for="item in grayCanvases"
        :key="item.key"
        :title="item.title"
        :width="TEST_W"
        :height="TEST_H"
        :draw="item.draw"
      />
      <table class="contrast-table">
        <thead>
          <tr>
            <th>算法</th>
            <th>纯红灰度</th>
            <th>纯绿灰度</th>
            <th>纯蓝灰度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in grayTable" :key="row.title">
            <td>{{ row.title }}</td>
            <td v-for="(value, index) in row.values" :key="index" class="demo-code">
              {{ value }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="WCAG 对比度计算器"
      desc="对比度 = (较亮颜色的相对亮度 + 0.05) / (较暗颜色的相对亮度 + 0.05)，范围 1~21。相对亮度在线性光中按 0.2126R + 0.7152G + 0.0722B 计算。AA 要求正文 ≥ 4.5、大字 ≥ 3；AAA 要求正文 ≥ 7、大字 ≥ 4.5。"
    >
      <div class="demo-controls">
        <label>
          前景色
          <input v-model="fg" type="color">
          <span class="demo-code">{{ fg.toUpperCase() }}</span>
        </label>
        <label>
          背景色
          <input v-model="bg" type="color">
          <span class="demo-code">{{ bg.toUpperCase() }}</span>
        </label>
        <color-button label="互换前景/背景" @click="swap"/>
      </div>
      <div class="contrast-sample" :style="{color: fg, backgroundColor: bg}">
        <p class="contrast-sample-large">
          大字示例 Large Text 24px
        </p>
        <p class="contrast-sample-small">
          小字示例 Small text 14px，对比度 {{ ratioText }} : 1
        </p>
      </div>
      <div class="contrast-ratio">
        对比度 <strong>{{ ratioText }} : 1</strong>
        <span
          v-for="item in levels"
          :key="item.label"
          :class="['contrast-badge', item.pass ? 'contrast-badge-pass' : 'contrast-badge-fail']"
        >
          {{ item.label }}（≥{{ item.min }}）{{ item.pass ? '通过' : '未通过' }}
        </span>
      </div>
    </demo-section>

    <demo-section
      title="自动选字色：黑字还是白字"
      desc="对 12 个色环颜色分别计算黑字、白字的对比度，取较大者。黄色、青色等亮色配黑字，蓝色、红色等配白字。这个规则比「看 RGB 平均值」更可靠，因为它基于相对亮度。"
    >
      <div class="contrast-grid">
        <div
          v-for="item in swatches"
          :key="item.hex"
          class="contrast-cell"
          :style="{backgroundColor: item.hex, color: item.text}"
        >
          <strong>{{ item.hex }}</strong>
          <span>黑字 {{ item.black }}</span>
          <span>白字 {{ item.white }}</span>
          <span>选用：{{ item.text === '#FFFFFF' ? '白字' : '黑字' }}</span>
        </div>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.contrast-table {
  margin-top: 4px;
  border-collapse: collapse;
  font-size: 13px;
  th, td {
    border: 1px solid #DDDEE4;
    padding: 4px 12px;
    text-align: center;
  }
}

.contrast-sample {
  width: 420px;
  padding: 16px 20px;
  border: 1px solid #DDDEE4;
  &-large {
    font-size: 24px;
    font-weight: bold;
  }
  &-small {
    margin-top: 8px;
    font-size: 14px;
  }
}

.contrast-ratio {
  margin-top: 10px;
  font-size: 14px;
  line-height: 28px;
  strong {
    margin-right: 12px;
    font-size: 18px;
  }
}

.contrast-badge {
  display: inline-block;
  margin-right: 8px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 12px;
  &-pass {
    background: #E6F4EA;
    color: #137333;
  }
  &-fail {
    background: #FCE8E6;
    color: #C5221F;
  }
}

.contrast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 150px);
  gap: 10px;
}

.contrast-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100px;
  padding: 10px;
  border: 1px solid #DDDEE4;
  font-size: 12px;
}
</style>
