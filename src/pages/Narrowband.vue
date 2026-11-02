<script setup lang="ts">
import {ref, reactive, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {LINES, lineDisplayRgb, lineLuminous, stretchStrength} from '../utils/narrowband';
import {rgbCss, rgbHex} from '../utils/spectral';
import {
  SPEC_W,
  SPEC_H,
  MAP_W,
  MAP_H,
  PRESETS,
  cloneMapping,
  drawSpectrum,
  drawGray,
  drawPalette,
  drawTrueColor
} from '../composables/narrowband';

const strength = ref(50);
const gains = reactive([1, 1, 1]);
const matrix = reactive(cloneMapping(PRESETS[1].matrix));
const activeKey = ref(PRESETS[1].key);

const getK = () => stretchStrength(strength.value);
const kText = computed(() => (strength.value <= 0 ? '不拉伸（线性）' : `k = ${stretchStrength(strength.value).toFixed(0)}`));

const applyPreset = (key: string) => {
  const preset = PRESETS.find(p => p.key === key);
  if (!preset) {
    return;
  }
  preset.matrix.forEach((row, r) => row.forEach((v, c) => {
    matrix[r][c] = v;
  }));
  activeKey.value = key;
};

const resetGains = () => {
  gains.forEach((_, i) => {
    gains[i] = 1;
  });
};

const rows = (() => {
  const haLum = lineLuminous(LINES[1]);
  return LINES.map(line => {
    const rgb = lineDisplayRgb(line);
    return {
      name: line.name,
      waveText: line.waveText,
      origin: line.origin,
      hex: rgbHex(rgb),
      css: rgbCss(rgb),
      eye: lineLuminous(line) / haLum
    };
  });
})();

const drawGrayLinear = LINES.map((_, i) => drawGray(i, () => 0));
const drawGrayStretched = LINES.map((_, i) => drawGray(i, getK));
const drawCustom = drawPalette(() => matrix, getK, () => gains);
const drawPresets = PRESETS.map(p => drawPalette(() => p.matrix, getK, () => gains));
const drawTrue = drawTrueColor(getK);

const COLUMN_NAMES = LINES.map(line => line.name);
const ROW_NAMES = ['输出红 R', '输出绿 G', '输出蓝 B'];
</script>

<template>
  <demo-page>
    <demo-section
      title="三条谱线：两条红，一条青绿"
      desc="电离的气体只在几个特定的波长上发光。星云里最常拍的三条是 Hα（氢，656.3 nm）、[SII]（电离一次的硫，671.6 与 673.1 nm 两条）和 [OIII]（电离两次的氧，495.9 与 500.7 nm 两条，500.7 的约是 495.9 的三倍）。方括号表示这是“禁线”，在地面实验室的高密度气体里，激发态会先被碰撞带走能量而发不出光，只有星云这样极稀薄的气体里才亮。下面把它们放在光谱上，再画出人眼的明亮度响应 ȳ(λ)：同样的辐射功率，人眼对深红光的感觉暗得多。"
    >
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpectrum"/>
      <table class="nb-table">
        <thead>
          <tr>
            <th>谱线</th>
            <th>波长</th>
            <th>单独看到的颜色</th>
            <th>同功率下相对 Hα 的明亮度</th>
            <th>从哪儿来</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <td><strong>{{ row.name }}</strong></td>
            <td class="demo-code">
              {{ row.waveText }}
            </td>
            <td>
              <span class="nb-dot" :style="{background: row.css}"/>
              <span class="demo-code">{{ row.hex }}</span>
            </td>
            <td class="demo-code">
              ×{{ row.eye.toFixed(2) }}
            </td>
            <td>{{ row.origin }}</td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        Hα 和 [SII] 的颜色几乎一样，都是显示器能画出的最深的红，肉眼分不出来；[SII] 在人眼里还更暗。所以彩色照片里看到的星云是红色加青绿色，看不出硫在哪里。真实的彩色照片偏粉，是因为除了 Hα，还有 Hβ（486.1 nm，蓝）等别的谱线。这里只算这三条线。
      </p>
    </demo-section>

    <demo-section
      title="三张灰度图：线性数据几乎是黑的"
      desc="窄带成像每次只让一条谱线通过滤镜，所以得到三张黑白图，亮度表示这条线有多强。下面这片星云是程序按电离分层的思路造的，不是真实观测：[OIII] 集中在中间的炽热核心，Hα 铺成一整个壳层，[SII] 挤在外缘的细丝和几个亮结上，另外撒了一些恒星和噪声。上排是原始线性值（各自除以自己的亮度上限），绝大部分像素只有满量程的百分之几，除了亮星之外几乎什么也看不见。下排是 arcsinh 拉伸后的样子：x → asinh(k·x) / asinh(k)，暗处近似线性，亮处近似对数，把暗弱的结构拉出来而不让亮处爆掉。"
    >
      <div class="demo-controls">
        <label>
          拉伸强度
          <input v-model.number="strength" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ kText }}</span>
        </label>
      </div>
      <div>
        <demo-canvas
          v-for="(line, i) in LINES"
          :key="`lin-${line.key}`"
          :title="`${line.name}（线性）`"
          :width="MAP_W"
          :height="MAP_H"
          :draw="drawGrayLinear[i]"
        />
      </div>
      <div>
        <demo-canvas
          v-for="(line, i) in LINES"
          :key="`str-${line.key}`"
          :title="`${line.name}（拉伸后）`"
          :width="MAP_W"
          :height="MAP_H"
          :draw="drawGrayStretched[i]"
        />
      </div>
    </demo-section>

    <demo-section
      title="把三张灰度图放进红、绿、蓝"
      desc="假彩色就是决定每张图去哪个颜色通道。哈勃调色板（SHO）把 [SII] 放红、Hα 放绿、[OIII] 放蓝：三条线按波长从长到短依次对应红、绿、蓝。1995 年著名的“创生之柱”照片用的就是这个对应。代价是 Hα 本来是红的，却被画成绿色，所以这种图里的颜色不能当作星云“本来的颜色”，它的作用是把三种离子的分布分开，一眼看出哪里电离强、哪里是冲击波。下表每个格子是“这个输出通道里掺入多少这张图”，可以自己改，也可以先点一个预设。每个通道都先各自除以自己的亮度上限，再乘右边的增益。"
    >
      <div class="demo-controls">
        <color-button
          v-for="p in PRESETS"
          :key="p.key"
          :label="p.name"
          :class="{'nb-active': activeKey === p.key}"
          :title="p.note"
          @click="applyPreset(p.key)"
        />
      </div>
      <div class="nb-edit">
        <table class="nb-matrix">
          <thead>
            <tr>
              <th/>
              <th v-for="name in COLUMN_NAMES" :key="name">
                {{ name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(rowName, r) in ROW_NAMES" :key="rowName">
              <th>{{ rowName }}</th>
              <td v-for="(name, c) in COLUMN_NAMES" :key="name">
                <input v-model.number="matrix[r][c]" type="range" min="0" max="1.5" step="0.05" @input="activeKey = ''">
                <span class="demo-code">{{ matrix[r][c].toFixed(2) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="nb-gains">
          <label v-for="(line, i) in LINES" :key="line.key">
            {{ line.name }} 增益
            <input v-model.number="gains[i]" type="range" min="0" max="3" step="0.05">
            <span class="demo-code">×{{ gains[i].toFixed(2) }}</span>
          </label>
          <color-button label="增益复位" @click="resetGains"/>
        </div>
      </div>
      <div class="demo-controls">
        <label>
          拉伸强度
          <input v-model.number="strength" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ kText }}</span>
        </label>
      </div>
      <div>
        <demo-canvas title="你的对应关系" :width="MAP_W" :height="MAP_H" :draw="drawCustom"/>
        <demo-canvas title="按谱线真实颜色合成（不逐通道归一）" :width="MAP_W" :height="MAP_H" :draw="drawTrue"/>
      </div>
      <div>
        <demo-canvas
          v-for="(p, i) in PRESETS"
          :key="p.key"
          :title="p.name"
          :width="MAP_W"
          :height="MAP_H"
          :draw="drawPresets[i]"
        />
      </div>
    </demo-section>

    <demo-section
      title="假彩色是做什么的，不是做什么的"
      desc="它是一种分析手段：用颜色把不同电离程度的气体分开。SHO 里蓝色的核心是高能量、双重电离的区域，偏红的外缘是冲击波和低电离气体，这些在三张灰度图里要来回对比才看得出来，叠成彩色后一目了然。它不是人眼会看到的样子。人眼看星云，既没有这么亮，也分不出 Hα 和 [SII]。上面“按谱线真实颜色合成”那一幅虽然用了真实的谱线颜色，但同样做了拉伸，所以也只是“颜色比例正确”，而不是肉眼所见。这片星云是程序生成的示意，真实星云的分层远比这里复杂。"
    />
  </demo-page>
</template>

<style lang="less">
.nb-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 5px 12px;
    border: 1px solid #E2E4EA;
    text-align: left;
  }
  th {
    background: #F5F6FA;
    color: #5C5D5F;
  }
}
.nb-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  vertical-align: -2px;
  border: 1px solid #CCC;
}
.nb-edit {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 32px;
  margin-bottom: 8px;
}
.nb-matrix {
  border-collapse: collapse;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 4px 10px;
    border: 1px solid #E2E4EA;
    text-align: left;
    white-space: nowrap;
  }
  th {
    background: #F5F6FA;
    color: #5C5D5F;
  }
  input[type="range"] {
    width: 90px;
    vertical-align: middle;
  }
}
.nb-gains {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  input[type="range"] {
    width: 120px;
  }
}
.color-button.nb-active {
  border-color: #4B98F8;
  color: #4B98F8;
}
</style>
