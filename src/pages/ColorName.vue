<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {NAMED, nearestNames, hslToRgb, toHex, parseHex} from '../utils/colorname';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
type PickEvent = {x: number; y: number};

const color = ref('#4b98f8');
const matches = computed(() => nearestNames(parseHex(color.value)));

const COLS = 24;
const ROWS = 10;
const CELL_W = 30;
const CELL_H = 28;
const GRID_W = COLS * CELL_W;
const GRID_H = ROWS * CELL_H;

const cellRgb = (col: number, row: number) => {
  return hslToRgb(col * 360 / COLS, 0.75, 0.92 - row * 0.08);
};

const hover = ref('点击色格，查看它最接近的颜色名');

const drawGrid: DrawFn = ctx => {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = toHex(cellRgb(col, row));
      ctx.fillRect(col * CELL_W, row * CELL_H, CELL_W - 1, CELL_H - 1);
    }
  }
};

const onGrid = ({x, y}: PickEvent) => {
  const col = Math.min(COLS - 1, Math.floor(x / CELL_W));
  const row = Math.min(ROWS - 1, Math.floor(y / CELL_H));
  const rgb = cellRgb(col, row);
  color.value = toHex(rgb).toLowerCase();
  hover.value = `${toHex(rgb)} → ${nearestNames(rgb, 1)[0].name}`;
};

interface Term {
  name: string;
  label: string;
  hex: string;
}

const T: Record<string, Term> = {
  black: {name: 'black', label: '黑', hex: '#111111'},
  white: {name: 'white', label: '白', hex: '#FFFFFF'},
  red: {name: 'red', label: '红', hex: '#E02020'},
  green: {name: 'green', label: '绿', hex: '#2E9E4B'},
  yellow: {name: 'yellow', label: '黄', hex: '#FFD60A'},
  blue: {name: 'blue', label: '蓝', hex: '#1F5FD6'},
  brown: {name: 'brown', label: '棕', hex: '#8B5A2B'},
  purple: {name: 'purple', label: '紫', hex: '#7E3FA8'},
  pink: {name: 'pink', label: '粉', hex: '#FF9FC0'},
  orange: {name: 'orange', label: '橙', hex: '#FF8A1E'},
  grey: {name: 'grey', label: '灰', hex: '#8A8A8A'}
};

const STAGES: Array<{stage: string; note: string; terms: Term[]}> = [
  {stage: 'I', note: '只有黑和白（暗冷色与亮暖色）两个词', terms: [T.black, T.white]},
  {stage: 'II', note: '出现红', terms: [T.red]},
  {stage: 'III', note: '出现绿或黄（二者择一）', terms: [T.green, T.yellow]},
  {stage: 'IV', note: '绿和黄都有了', terms: [T.green, T.yellow]},
  {stage: 'V', note: '出现蓝', terms: [T.blue]},
  {stage: 'VI', note: '出现棕', terms: [T.brown]},
  {stage: 'VII', note: '出现紫、粉、橙、灰', terms: [T.purple, T.pink, T.orange, T.grey]}
];
</script>

<template>
  <demo-page>
    <demo-section
      title="这个颜色叫什么？"
      :desc="`在 ${NAMED.length} 个 CSS 命名色里，按 ΔE2000（在 Lab 空间里模拟人眼感知的色差）找最接近的名字。`"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="color" type="color">
          <span class="demo-code">{{ color.toUpperCase() }}</span>
        </label>
      </div>
      <table class="name-table">
        <thead>
          <tr>
            <th>色块</th>
            <th>名称</th>
            <th>色值</th>
            <th>ΔE2000</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in matches" :key="item.name">
            <td>
              <span class="demo-swatch" :style="{background: item.hex}"/>
            </td>
            <td>{{ item.name }}</td>
            <td class="demo-code">
              {{ item.hex }}
            </td>
            <td class="demo-code">
              {{ item.delta.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>
    <demo-section
      title="色相 × 明度：每一格叫什么"
      desc="横向是 24 个色相，纵向是由浅到深的 10 级明度（饱和度固定）。点击任一格，它的颜色会成为上面的“当前颜色”，并给出最接近的 CSS 名。"
    >
      <demo-canvas :width="GRID_W" :height="GRID_H" :draw="drawGrid" @pick="onGrid"/>
      <p class="demo-code">
        {{ hover }}
      </p>
    </demo-section>
    <demo-section
      title="Berlin–Kay：基本颜色词是怎么长出来的"
      desc="1969 年，人类学家 Brent Berlin 和语言学家 Paul Kay 比较了多种语言，提出各语言的基本颜色词按固定顺序出现：先有黑、白两个词，然后依次出现红、绿或黄、蓝、棕，最后是紫、粉、橙、灰。英语一共有 11 个基本颜色词，处于最后阶段。"
    >
      <div v-for="item in STAGES" :key="item.stage" class="name-stage">
        <span class="name-stage-no">{{ item.stage }}</span>
        <span v-for="term in item.terms" :key="term.name" class="name-term">
          <span class="demo-swatch" :style="{background: term.hex}"/>
          {{ term.label }} {{ term.name }}
        </span>
        <span class="name-stage-note">{{ item.note }}</span>
      </div>
      <p class="name-caveat">
        后来的研究（如世界颜色调查 World Color Survey）修正了这个顺序，“颜色分类究竟有多少是人类共通的，有多少取决于语言和文化”至今仍有争论。例如俄语把浅蓝（goluboy）和深蓝（siniy）当作两个基本颜色词，纳米比亚的 Himba 人的颜色分类也与英语不同。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.name-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 6px 18px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6FA;
  }
}
.name-stage {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 6px 0;
  font-size: 13px;
  &-no {
    width: 36px;
    font-weight: bold;
  }
  &-note {
    color: #888;
  }
}
.name-term {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 90px;
}
.name-caveat {
  max-width: 800px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 21px;
  color: #666;
}
</style>
