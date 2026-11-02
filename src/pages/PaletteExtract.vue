<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {ColorButton} from '../components/common';
import {SCENE_DEFS, ACCENT_KEPT, getScene, analyse, stability} from '../utils/paletteextract';
import type {Stability} from '../utils/paletteextract';
import {PE_W, PE_H, sceneDrawer, bytesDrawer, css, hexOf, percent} from '../composables/paletteextract';

const sceneKey = ref('flowers');
const k = ref(5);
const seed = ref(1);
const stab = ref<Stability[] | null>(null);

const scene = computed(() => getScene(sceneKey.value));
const drawOriginal = sceneDrawer(() => sceneKey.value);

const tiles = computed(() => analyse(sceneKey.value, k.value, seed.value).map(r => ({
  ...r,
  draw: bytesDrawer(r.recon as Uint8ClampedArray)
})));

const runStability = () => {
  stab.value = stability(sceneKey.value, k.value);
};

watch([sceneKey, k], () => {
  stab.value = null;
});
</script>

<template>
  <demo-page>
    <demo-section
      title="同一张图，四种取色方法"
      desc="从画面里每隔 3 个像素取一个点（约 4000 个）当样本，用不同方法把样本归成 k 类，每一类的平均色就是一个主色。中位切分：把所有样本装进一个 RGB 盒子，每次挑范围最大的盒子，沿最宽的通道在中位数处切成两半，切到 k 个盒子为止。k-means：先用 k-means++ 选 k 个彼此尽量远的像素当中心，再反复做“每个点归到最近的中心、中心移到本类的平均位置”，最多 20 轮。三种 k-means 流程完全相同，只有量距离的色彩空间不同：sRGB 里的坐标距离和眼睛看到的差异不成比例，CIELAB 与 OKLab 里的距离更接近感知差异。效果图把每个像素换成最近的主色（距离按各自的空间量，中位切分按 sRGB 量）。场景都是程序画的，没有读取任何图片。"
    >
      <div class="demo-controls">
        <label>
          场景
          <select v-model="sceneKey">
            <option v-for="s in SCENE_DEFS" :key="s.key" :value="s.key">
              {{ s.name }}
            </option>
          </select>
        </label>
        <label>
          颜色数 k
          <input v-model.number="k" type="range" min="2" max="10" step="1">
          <span class="demo-code">{{ k }}</span>
        </label>
        <label>
          k-means 随机种子
          <ColorButton label="换一个种子" @click="seed++"/>
          <span class="demo-code">#{{ seed }}</span>
        </label>
      </div>

      <div class="pe-row">
        <div class="pe-card">
          <p class="pe-name">
            原图：{{ scene.name }}
          </p>
          <demo-canvas :width="PE_W" :height="PE_H" :draw="drawOriginal"/>
          <p class="pe-meta">
            <span class="demo-swatch pe-dot" :style="{background: css(scene.accent)}"/>
            点缀色：{{ scene.accentName }} {{ hexOf(scene.accent) }}，约占画面 {{ percent(scene.accentShare, 2) }}
          </p>
        </div>

        <div v-for="r in tiles" :key="r.key" class="pe-card">
          <p class="pe-name">
            {{ r.label }}
          </p>
          <demo-canvas :width="PE_W" :height="PE_H" :draw="r.draw"/>
          <div class="pe-bar">
            <span
              v-for="i in r.order"
              :key="i"
              :style="{width: percent(r.share[i], 3), background: css(r.palette[i])}"
            />
          </div>
          <ul class="pe-chips">
            <li v-for="i in r.order" :key="i">
              <span class="demo-swatch pe-dot" :style="{background: css(r.palette[i])}"/>
              <span class="demo-code">{{ hexOf(r.palette[i]) }}</span>
              <span class="pe-share">{{ percent(r.share[i]) }}</span>
            </li>
          </ul>
          <p class="pe-meta">
            平均 ΔE2000：<strong>{{ r.meanDe.toFixed(2) }}</strong>（越小越接近原图）<br>
            色板里离点缀色最近的颜色 ΔE2000 = {{ r.accentDe.toFixed(1) }}，
            <strong :class="r.accentKept ? 'pe-keep' : 'pe-lose'">{{ r.accentKept ? '保留了' : '丢了' }}</strong>
          </p>
        </div>
      </div>
      <p class="demo-section-desc">
        平均 ΔE2000 在 4000 个样本点上计算。点缀色按“色板里有一个颜色与它的 ΔE2000 小于 {{ ACCENT_KEPT }}”算保留。点缀色只占不到 2% 的像素，对平均色差几乎没有贡献，所以平均 ΔE 很低的方法也可能把它丢掉。
      </p>
    </demo-section>

    <demo-section
      title="结果稳不稳：换 12 个随机种子"
      desc="k-means 的结果取决于初始中心，同一个 k 换个种子可能得到不同的色板。点按钮，对当前场景和当前 k，把三种 k-means 各跑 12 次（种子 1 到 12），列出平均 ΔE2000 的最小值和最大值，以及点缀色被保留了几次。中位切分没有随机数，只算一次。"
    >
      <div class="demo-controls">
        <ColorButton label="跑 12 个种子" @click="runStability"/>
        <span class="demo-code">{{ scene.name }}，k = {{ k }}</span>
      </div>
      <table v-if="stab" class="pe-table">
        <thead>
          <tr>
            <th>方法</th>
            <th>平均 ΔE2000（最小 ~ 最大）</th>
            <th>点缀色保留次数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in stab" :key="row.key">
            <td>{{ row.label }}</td>
            <td class="demo-code">
              {{ row.seeded ? `${row.minDe.toFixed(2)} ~ ${row.maxDe.toFixed(2)}` : row.minDe.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ row.kept }} / {{ row.runs }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        在这几个场景里，面积不到 2% 的点缀色经常被并进相邻的大色块，k 取得大一些、或者初始中心恰好落在它上面时才会留下。换成 CIELAB 或 OKLab 不保证留下它，只是改变了哪些颜色先被合并，保留次数以上表为准。同一种方法在不同种子之间的平均 ΔE 也会差出不少，所以拿一次运行的结果去比较两种方法，说服力有限。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.pe-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
}
.pe-card {
  width: 240px;
  .demo-canvas {
    margin: 0;
  }
}
.pe-name {
  height: 24px;
  line-height: 24px;
  font-size: 14px;
}
.pe-meta {
  margin-top: 8px;
  font-size: 12px;
  line-height: 19px;
  color: #666;
  strong {
    color: #333;
  }
}
.demo-page .pe-card .pe-dot {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  vertical-align: -3px;
}
.pe-bar {
  display: flex;
  height: 18px;
  margin-top: 8px;
  border: 1px solid #DDDEE4;
  span {
    display: block;
    height: 100%;
  }
}
.pe-chips {
  margin-top: 6px;
  font-size: 12px;
  line-height: 20px;
  list-style: none;
  li {
    display: flex;
    align-items: center;
  }
}
.pe-share {
  margin-left: auto;
  color: #666;
}
.pe-keep {
  color: #1E8E5A !important;
}
.pe-lose {
  color: #C0392B !important;
}
.pe-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 6px 14px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    background: #F5F6F9;
  }
}
</style>
