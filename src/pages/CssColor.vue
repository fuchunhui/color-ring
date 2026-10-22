<script setup lang="ts">
import {ref, computed, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import {Vec3} from '../utils/space';
import {MIX_SPACES, MixSpace, parseHex, toHex, formatAll, mixColors, oklchToWide} from '../utils/csscolor';

const supports = (css: string): boolean => typeof CSS !== 'undefined' && CSS.supports('color', css);

const hex = ref('#3b82f6');
const colorA = ref('#2563eb');
const colorB = ref('#facc15');
const percentA = ref(50);
const space = ref<MixSpace>('oklch');
const lightness = ref(0.7);
const hue = ref(145);
const copied = ref('');
let timer = 0;

const rgb = computed<Vec3>(() => parseHex(hex.value) ?? [59, 130, 246]);
const rgbA = computed<Vec3>(() => parseHex(colorA.value) ?? [37, 99, 235]);
const rgbB = computed<Vec3>(() => parseHex(colorB.value) ?? [250, 204, 21]);

const formats = computed(() => formatAll(rgb.value).map(f => ({...f, supported: supports(f.css)})));

const mixString = (weightA: number): string => {
  return `color-mix(in ${space.value}, ${colorA.value} ${Math.round(weightA * 100)}%, ${colorB.value})`;
};

const mixCss = computed(() => mixString(percentA.value / 100));
const mixSupported = computed(() => supports(mixCss.value));
const mixHex = computed(() => toHex(mixColors(rgbA.value, rgbB.value, percentA.value / 100, space.value)));

const strip = computed(() => {
  return Array.from({length: 9}, (_, i) => {
    const w = 1 - i / 8;
    return {
      ours: toHex(mixColors(rgbA.value, rgbB.value, w, space.value)),
      css: mixString(w)
    };
  });
});

const COMPARE_SPACES: MixSpace[] = ['srgb', 'srgb-linear', 'lab', 'oklab', 'oklch'];
const compare = computed(() => {
  return COMPARE_SPACES.map(name => ({
    name,
    chips: Array.from({length: 17}, (_, i) => toHex(mixColors([0, 0, 255], [255, 255, 0], 1 - i / 16, name)))
  }));
});

const wide = computed(() => {
  return Array.from({length: 10}, (_, k) => {
    const chroma = k * 0.04;
    const info = oklchToWide([lightness.value, chroma, hue.value]);
    return {
      chroma: chroma.toFixed(2),
      srgb: toHex(info.srgb),
      p3: info.p3Css,
      oklch: `oklch(${lightness.value} ${chroma.toFixed(2)} ${hue.value})`,
      inSrgb: info.inSrgb,
      inP3: info.inP3
    };
  });
});
const p3Supported = computed(() => supports('color(display-p3 1 0 0)'));
const oklchSupported = computed(() => supports('oklch(0.7 0.1 145)'));

const onText = (event: Event) => {
  const parsed = parseHex((event.target as HTMLInputElement).value);
  if (parsed) {
    hex.value = toHex(parsed);
  }
};

const copy = (key: string, text: string) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  copied.value = key;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    copied.value = '';
  }, 1200);
};

onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <demo-page>
    <demo-section
      title="同一个颜色的各种 CSS 写法"
      desc="CSS Color 4 之后，一个颜色可以用十几种语法表示。左边是换算出的字符串，“浏览器渲染”是浏览器拿这个字符串自己画出来的色块，“计算结果”是本页按原始 sRGB 值画的色块；两者一致说明换算正确。注意 lab()/lch() 使用 D50 白点，oklab()/oklch() 和 color(xyz-d65) 使用 D65 白点。"
    >
      <div class="demo-controls">
        <label>
          颜色
          <input v-model="hex" type="color">
        </label>
        <input class="css-hex" :value="hex" maxlength="7" @change="onText">
      </div>
      <table class="css-table">
        <thead>
          <tr>
            <th>写法</th>
            <th>字符串</th>
            <th>浏览器渲染</th>
            <th>计算结果</th>
            <th/>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in formats" :key="f.label">
            <td>{{ f.label }}</td>
            <td class="demo-code">
              {{ f.css }}
            </td>
            <td>
              <span v-if="f.supported" class="css-chip" :style="{background: f.css}"/>
              <span v-else class="css-unsupported">浏览器不支持</span>
            </td>
            <td><span class="css-chip" :style="{background: hex}"/></td>
            <td>
              <color-button label="复制" @click="copy(f.label, f.css)">
                {{ copied === f.label ? '已复制' : '复制' }}
              </color-button>
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section
      title="color-mix()：在哪个空间里混合"
      desc="color-mix(in 空间, 颜色A 占比, 颜色B) 让浏览器在指定的颜色空间里做插值。同样是 50% 混合，在 sRGB 里混出来是灰蒙蒙的中间色，在 oklab/oklch 里则亮度和彩度过渡更自然；hsl、hwb、lch、oklch 这类带色相的空间，默认走最短的色相路径。"
    >
      <div class="demo-controls">
        <label>
          颜色 A
          <input v-model="colorA" type="color">
        </label>
        <label>
          颜色 B
          <input v-model="colorB" type="color">
        </label>
        <label>
          空间
          <select v-model="space">
            <option v-for="s in MIX_SPACES" :key="s.value" :value="s.value">{{ s.value }}</option>
          </select>
        </label>
        <label>
          A 的占比
          <input v-model.number="percentA" type="range" min="0" max="100" step="5">
          {{ percentA }}%
        </label>
      </div>
      <p class="demo-code css-mixline">
        {{ mixCss }}
        <color-button :label="copied === 'mix' ? '已复制' : '复制'" @click="copy('mix', mixCss)"/>
      </p>
      <div class="css-mixrow">
        <div>
          <span v-if="mixSupported" class="css-chip css-chip-large" :style="{background: mixCss}"/>
          <span v-else class="css-unsupported">浏览器不支持</span>
          <p>浏览器渲染</p>
        </div>
        <div>
          <span class="css-chip css-chip-large" :style="{background: mixHex}"/>
          <p>本页计算 {{ mixHex }}</p>
        </div>
      </div>
      <p class="css-label">
        本页计算的 9 步渐变（A→B）
      </p>
      <div class="css-strip">
        <span v-for="(s, i) in strip" :key="i" :style="{background: s.ours}" :title="s.ours"/>
      </div>
      <p class="css-label">
        浏览器渲染的 9 步渐变
      </p>
      <div v-if="mixSupported" class="css-strip">
        <span v-for="(s, i) in strip" :key="i" :style="{background: s.css}"/>
      </div>
      <p v-else class="css-unsupported">
        浏览器不支持 color-mix()
      </p>
    </demo-section>

    <demo-section
      title="混合空间对比：蓝 → 黄"
      desc="同样是从 #0000ff 到 #ffff00，每一行用不同的空间插值。sRGB 的中点是纯灰(128,128,128)；线性光的中点偏亮；oklab 的中点最自然(带一点淡蓝绿)；oklch 沿着色相环走，一路保持鲜艳，但会经过绿色。"
    >
      <div v-for="row in compare" :key="row.name" class="css-compare">
        <span class="css-compare-name">{{ row.name }}</span>
        <div class="css-strip css-strip-wide">
          <span v-for="(c, i) in row.chips" :key="i" :style="{background: c}" :title="c"/>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="广色域：超出 sRGB 的颜色"
      desc="固定 oklch 的亮度和色相，逐步增加彩度。第一行是截断到 sRGB 后的颜色，第二行是 color(display-p3 …) 由浏览器原生渲染，第三行是 oklch() 原生渲染(超出显示器色域时由浏览器自己压回去)。在普通 sRGB 屏幕上三行看起来几乎一样；只有在 Display P3 屏幕(如较新的 Mac、iPhone)上，彩度大的那几格第二行才会更鲜艳。"
    >
      <div class="demo-controls">
        <label>
          亮度 L
          <input v-model.number="lightness" type="range" min="0.4" max="0.95" step="0.01">
          {{ lightness }}
        </label>
        <label>
          色相 h
          <input v-model.number="hue" type="range" min="0" max="360" step="1">
          {{ hue }}°
        </label>
        <span v-if="!p3Supported" class="css-unsupported">当前浏览器不支持 display-p3</span>
      </div>
      <div class="css-wide">
        <span class="css-wide-name">sRGB 截断</span>
        <span v-for="w in wide" :key="w.chroma" class="css-wide-chip" :style="{background: w.srgb}"/>
      </div>
      <div class="css-wide">
        <span class="css-wide-name">display-p3</span>
        <span v-for="w in wide" :key="w.chroma" class="css-wide-chip" :style="{background: p3Supported ? w.p3 : '#EEE'}"/>
      </div>
      <div class="css-wide">
        <span class="css-wide-name">oklch()</span>
        <span v-for="w in wide" :key="w.chroma" class="css-wide-chip" :style="{background: oklchSupported ? w.oklch : '#EEE'}"/>
      </div>
      <div class="css-wide">
        <span class="css-wide-name">彩度 C</span>
        <span v-for="w in wide" :key="w.chroma" class="css-wide-note">
          {{ w.chroma }}
          <i v-if="!w.inSrgb">{{ w.inP3 ? '超出 sRGB' : '超出 P3' }}</i>
        </span>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.css-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 14px 4px 0;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid #E5E7EB;
  }
}
.css-chip {
  display: inline-block;
  width: 56px;
  height: 28px;
  border: 1px solid #DDDEE4;
  border-radius: 3px;
  vertical-align: middle;
  &-large {
    width: 120px;
    height: 56px;
  }
}
.css-unsupported {
  font-size: 12px;
  color: #C92A2A;
}
.css-hex {
  width: 90px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #DDDEE4;
  font-family: Consolas, menlo, monaco, monospace;
}
.css-mixline {
  margin: 4px 0 10px;
}
.css-mixrow {
  display: flex;
  gap: 24px;
  margin-bottom: 8px;
  p {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
  }
}
.css-label {
  margin: 8px 0 4px;
  font-size: 12px;
  color: #666;
}
.css-strip {
  display: flex;
  width: 468px;
  height: 36px;
  span {
    flex: 1;
  }
  &-wide {
    width: 680px;
    height: 32px;
  }
}
.css-compare {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  &-name {
    width: 100px;
    font-size: 13px;
  }
}
.css-wide {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  &-name {
    width: 90px;
    font-size: 13px;
  }
  &-chip {
    width: 68px;
    height: 44px;
  }
  &-note {
    width: 68px;
    font-size: 12px;
    color: #444;
    i {
      display: block;
      font-style: normal;
      font-size: 11px;
      color: #C92A2A;
    }
  }
}
</style>
