<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {Vec3} from '../utils/space';
import {XYZ_TO_CIERGB, CIERGB_TO_XYZ} from '../utils/vision';
import {
  PRIMARY_COLORS,
  CMF_W,
  CMF_H,
  FIELD_W,
  FIELD_H,
  RG_W,
  RG_H,
  bestMatch,
  needsNegative,
  xToWavelength,
  drawCmfPlot,
  drawFields,
  drawRgChart
} from '../composables/matching';

const wavelength = ref(500);
const r = ref(0);
const g = ref(0);
const b = ref(0);

const amounts = computed<Vec3>(() => [r.value, g.value, b.value]);
const best = computed(() => bestMatch(wavelength.value));
const negative = computed(() => needsNegative(wavelength.value));

const drawCmf = drawCmfPlot(() => wavelength.value);
const drawField = drawFields(() => wavelength.value, () => amounts.value);
const drawRg = drawRgChart(() => wavelength.value);

const onPick = ({x}: {x: number}) => {
  wavelength.value = xToWavelength(x);
};

const showBest = () => {
  [r.value, g.value, b.value] = best.value;
};

const reset = () => {
  r.value = 0;
  g.value = 0;
  b.value = 0;
};

const fmt = (m: number[][]): string[] => m.map(row => row.map(v => v.toFixed(5).padStart(9)).join('  '));
const forward = fmt(XYZ_TO_CIERGB);
const inverse = fmt(CIERGB_TO_XYZ);
</script>

<template>
  <demo-page>
    <demo-section
      title="CIE RGB 颜色匹配函数"
      desc="20 世纪 20 年代末，Wright 和 Guild 让观察者用三束单色光（700nm 红、546.1nm 绿、435.8nm 蓝）去调出和某个单色光看起来一样的颜色，记录下三束光各用多少，就得到 r̄、ḡ、b̄ 三条匹配函数。有趣的是 r̄ 在约 436–546nm 之间是负数：这些颜色太饱和，三个原色根本调不出来。曲线由本项目的 CIE 1931 XYZ 数据经标准矩阵换算而来，纵轴采用教科书的单位。"
    >
      <demo-canvas :width="CMF_W" :height="CMF_H" :draw="drawCmf" @pick="onPick"/>
    </demo-section>

    <demo-section
      title="亲手做一次颜色匹配"
      desc="左半边是试验光（某个单色光），右半边是三个原色按你设定的用量混出来的光。拖动三个滑块让两边一样。滑块为负，表示要把这个原色加到试验光一侧，这正是历史上实验者的做法。点“显示最佳匹配”可以看到正确答案。屏幕无法显示真正的单色光，这里是色域外去饱和后的近似。"
    >
      <div class="demo-controls">
        <label>
          试验光波长
          <input v-model.number="wavelength" type="range" min="400" max="700" step="1">
          <span class="demo-code">{{ wavelength }} nm</span>
        </label>
      </div>
      <div class="demo-controls">
        <label :style="{color: PRIMARY_COLORS[0]}">
          R 700nm
          <input v-model.number="r" type="range" min="-1" max="1" step="0.005">
          <span class="demo-code">{{ r.toFixed(3) }}</span>
        </label>
        <label :style="{color: PRIMARY_COLORS[1]}">
          G 546.1nm
          <input v-model.number="g" type="range" min="-1" max="1" step="0.005">
          <span class="demo-code">{{ g.toFixed(3) }}</span>
        </label>
        <label :style="{color: PRIMARY_COLORS[2]}">
          B 435.8nm
          <input v-model.number="b" type="range" min="-1" max="1" step="0.005">
          <span class="demo-code">{{ b.toFixed(3) }}</span>
        </label>
      </div>
      <div class="demo-controls">
        <color-button u="primary" label="显示最佳匹配" @click="showBest"/>
        <color-button label="清零" @click="reset"/>
        <span class="demo-code">最佳匹配：R {{ best[0] }}  G {{ best[1] }}  B {{ best[2] }}</span>
        <span class="demo-code">{{ negative ? '这个波长需要负的原色' : '这个波长不需要负的原色' }}</span>
      </div>
      <demo-canvas :width="FIELD_W" :height="FIELD_H" :draw="drawField"/>
    </demo-section>

    <demo-section
      title="为什么要发明 XYZ"
      desc="把单色光放进 rg 色度图（r = R/(R+G+B)，g = G/(R+G+B)），光谱轨迹跑到了三个原色围成的三角形之外，凡是在三角形外的颜色都需要负的原色。负数在当时的手工计算里很不方便，于是 CIE 在 1931 年用一个线性变换把原色换成三个“虚拟原色”X、Y、Z，让整个光谱轨迹落在它们围成的三角形里，匹配函数全部为正，并且让 Y 恰好等于亮度。XYZ 和 CIE RGB 之间只差一个 3×3 矩阵："
    >
      <div class="demo-controls">
        <div>
          <p class="demo-code">
            XYZ → CIE RGB
          </p>
          <pre class="demo-code">{{ forward.join('\n') }}</pre>
        </div>
        <div>
          <p class="demo-code">
            CIE RGB → XYZ
          </p>
          <pre class="demo-code">{{ inverse.join('\n') }}</pre>
        </div>
      </div>
      <demo-canvas :width="RG_W" :height="RG_H" :draw="drawRg"/>
    </demo-section>
  </demo-page>
</template>
