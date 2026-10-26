<script setup lang="ts">
import {ref, computed, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import {CHINESE, JAPANESE, CN_GROUPS, JP_GROUPS, rgbOf, sortByHue, matchesQuery} from '../utils/traditional';
import type {TradColor} from '../utils/traditional';
import {formatAll} from '../utils/csscolor';
import {nearestNames} from '../utils/colorname';
import {contrastRatio} from '../utils/space';

const region = ref<'cn' | 'jp'>('cn');
const query = ref('');
const sortMode = ref<'group' | 'hue'>('group');
const selected = ref<TradColor>(CHINESE[0]);
const copied = ref('');
let timer = 0;

const source = computed(() => (region.value === 'cn' ? CHINESE : JAPANESE));

const sections = computed(() => {
  const list = source.value.filter(item => matchesQuery(item, query.value));
  if (sortMode.value === 'hue') {
    return [{title: '', items: sortByHue(list)}];
  }
  const groups = region.value === 'cn' ? CN_GROUPS : JP_GROUPS;
  return groups
    .map(title => ({title, items: list.filter(item => item.group === title)}))
    .filter(section => section.items.length);
});

const total = computed(() => sections.value.reduce((sum, section) => sum + section.items.length, 0));

const switchRegion = (value: 'cn' | 'jp') => {
  region.value = value;
  selected.value = source.value[0];
};

const detail = computed(() => {
  const rgb = rgbOf(selected.value);
  const labels = ['Hex', 'rgb()', 'hsl()', 'lab()', 'oklch()'];
  const formats = formatAll(rgb).filter(item => labels.includes(item.label));
  const white = contrastRatio(rgb, [255, 255, 255]);
  const black = contrastRatio(rgb, [0, 0, 0]);
  const [nearest] = nearestNames(rgb, 1);
  return {
    formats,
    white,
    black,
    text: white >= black ? '#FFFFFF' : '#000000',
    nearest
  };
});

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  copied.value = text;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    copied.value = '';
  }, 1200);
};

onBeforeUnmount(() => {
  window.clearTimeout(timer);
});
</script>

<template>
  <demo-page>
    <demo-section
      title="中国传统色与日本传统色"
      desc="传统色名大多来自三类来源：矿物颜料（朱砂、石青、石绿）、植物染料（靛蓝、茜草、藤黄）和自然意象（月白、柳绿、桜色）。这些名字历史很长，但“色值”是后人为了在屏幕上显示而定的近似，所以这里的数字属于常见取值，不同资料略有出入。点击色块查看详情。"
    >
      <div class="demo-controls">
        <color-button :u="region === 'cn' ? 'primary' : ''" label="中国传统色" @click="switchRegion('cn')"/>
        <color-button :u="region === 'jp' ? 'primary' : ''" label="日本传统色" @click="switchRegion('jp')"/>
        <label>
          搜索
          <input v-model="query" type="text" placeholder="名称 / 拼音 / 色值">
        </label>
        <label>
          排序
          <select v-model="sortMode">
            <option value="group">按分类</option>
            <option value="hue">按色相</option>
          </select>
        </label>
        <span>共 {{ total }} 个</span>
      </div>

      <div class="trad-layout">
        <div class="trad-list">
          <p v-if="!total" class="trad-empty">
            没有匹配的颜色
          </p>
          <div v-for="section in sections" :key="section.title" class="trad-group">
            <h4 v-if="section.title" class="trad-group-title">
              {{ section.title }}
            </h4>
            <div class="trad-grid">
              <div
                v-for="item in section.items"
                :key="item.name"
                :class="['trad-chip', {'trad-chip-active': item.name === selected.name}]"
                @click="selected = item"
              >
                <span class="trad-chip-color" :style="{background: item.hex}"/>
                <span class="trad-chip-name">{{ item.name }}</span>
                <span class="trad-chip-reading">{{ item.reading }}</span>
                <span class="trad-chip-hex">{{ item.hex }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="trad-detail">
          <div class="trad-big" :style="{background: selected.hex, color: detail.text}">
            <div class="trad-big-name">
              {{ selected.name }}
            </div>
            <div class="trad-big-reading">
              {{ selected.reading }}
            </div>
          </div>
          <p v-if="selected.note" class="trad-note">
            {{ selected.note }}
          </p>
          <table class="trad-table">
            <tbody>
              <tr v-for="item in detail.formats" :key="item.label">
                <th>{{ item.label }}</th>
                <td class="demo-code">
                  {{ item.css }}
                </td>
                <td>
                  <color-button label="复制" @click="copy(item.css)"/>
                </td>
              </tr>
              <tr>
                <th>最接近的 CSS 名</th>
                <td class="demo-code" colspan="2">
                  {{ detail.nearest.name }}（ΔE {{ detail.nearest.delta.toFixed(1) }}）
                </td>
              </tr>
              <tr>
                <th>对比度</th>
                <td class="demo-code" colspan="2">
                  白字 {{ detail.white.toFixed(2) }} : 1，黑字 {{ detail.black.toFixed(2) }} : 1
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="copied" class="trad-copied">
            已复制：{{ copied }}
          </p>
          <div class="trad-sample" :style="{background: selected.hex, color: detail.text}">
            <strong>{{ selected.name }}</strong>
            <span>用它做背景时，{{ detail.text === '#FFFFFF' ? '白' : '黑' }}色文字的对比度更高。</span>
          </div>
        </div>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.trad-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}
.trad-list {
  flex: 1;
  min-width: 0;
}
.trad-group-title {
  margin: 10px 0 6px;
  font-size: 14px;
}
.trad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 118px);
  gap: 10px;
}
.trad-chip {
  display: flex;
  flex-direction: column;
  padding: 6px;
  border: 1px solid #DDDEE4;
  border-radius: 4px;
  background: #FFF;
  cursor: pointer;
  &:hover {
    border-color: #4B98F8;
  }
  &-active {
    border-color: #4B98F8;
    box-shadow: 0 0 0 2px rgba(75, 152, 248, 0.3);
  }
  &-color {
    height: 46px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
  &-name {
    margin-top: 6px;
    font-size: 14px;
    font-weight: 500;
  }
  &-reading {
    font-size: 11px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &-hex {
    font-family: Consolas, menlo, monaco, monospace;
    font-size: 11px;
    color: #666;
  }
}
.trad-empty {
  padding: 20px 0;
  color: #888;
}
.trad-detail {
  position: sticky;
  top: 0;
  width: 400px;
  flex-shrink: 0;
  padding: 12px;
  background: #FFF;
  border: 1px solid #DDDEE4;
  border-radius: 4px;
}
.trad-big {
  padding: 18px 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  &-name {
    font-size: 28px;
    font-weight: 600;
  }
  &-reading {
    margin-top: 4px;
    font-size: 13px;
    opacity: 0.85;
  }
}
.trad-note {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: #555;
}
.trad-table {
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
  th {
    width: 96px;
    padding: 4px 6px 4px 0;
    font-size: 12px;
    text-align: left;
    color: #666;
    vertical-align: middle;
  }
  td {
    padding: 4px 0;
    font-size: 12px;
    word-break: break-all;
    vertical-align: middle;
    .color-button {
      min-width: 44px;
      height: 24px;
    }
  }
}
.trad-copied {
  margin-top: 6px;
  font-size: 12px;
  color: #188038;
}
.trad-sample {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding: 14px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 20px;
  strong {
    font-size: 16px;
  }
}
</style>
