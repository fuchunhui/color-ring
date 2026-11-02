<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {SCENES, makeScene, transferReinhard, transferRgb, transferSpace, blend} from '../utils/colortransfer';
import type {Space} from '../utils/colortransfer';
import {
  SCENE_W,
  SCENE_H,
  SPACE_NAMES,
  FAIL_SRC,
  FAIL_REF,
  drawImg,
  failCase,
  statRow,
  corrRow
} from '../composables/colortransfer';

const srcKey = ref('snow');
const refKey = ref('dusk');
const space = ref<Space>('lab');
const strength = ref(100);

const sceneName = (key: string): string => SCENES.find(item => item.key === key)?.name || key;

const src = computed(() => makeScene(srcKey.value));
const refImg = computed(() => makeScene(refKey.value));
const reinhardFull = computed(() => transferReinhard(src.value, refImg.value));
const rgbFull = computed(() => transferRgb(src.value, refImg.value));
const spaceFull = computed(() => transferSpace(src.value, refImg.value, space.value));

const shown = computed(() => {
  const t = strength.value / 100;
  return {
    reinhard: blend(src.value, reinhardFull.value, t),
    rgb: blend(src.value, rgbFull.value, t),
    space: blend(src.value, spaceFull.value, t)
  };
});

const tiles = computed(() => [
  {key: 'src', title: `源图：${sceneName(srcKey.value)}`, img: src.value},
  {key: 'ref', title: `参考图：${sceneName(refKey.value)}`, img: refImg.value},
  {key: 'reinhard', title: 'Reinhard（lαβ）', img: shown.value.reinhard},
  {key: 'rgb', title: 'sRGB 逐通道', img: shown.value.rgb},
  {key: 'space', title: `${SPACE_NAMES[space.value]} 逐通道`, img: shown.value.space}
]);

const STAT_HEAD = ['l 均值', 'l 标准差', 'α 均值', 'α 标准差', 'β 均值', 'β 标准差'];
const CORR_HEAD = ['R–G', 'R–B', 'G–B', 'l–α', 'l–β', 'α–β'];

const statRows = computed(() => [
  statRow('源图', src.value),
  statRow('参考图', refImg.value),
  statRow(`Reinhard 结果（强度 ${strength.value}%）`, shown.value.reinhard)
]);

const corrRows = computed(() => [corrRow('源图', src.value), corrRow('参考图', refImg.value)]);

const fail = computed(() => failCase());
const failTiles = computed(() => [
  {key: 'src', title: `源图：${sceneName(FAIL_SRC)}`, img: fail.value.src},
  {key: 'ref', title: `参考图：${sceneName(FAIL_REF)}`, img: fail.value.ref},
  {key: 'reinhard', title: 'Reinhard（lαβ）', img: fail.value.reinhard},
  {key: 'rgb', title: 'sRGB 逐通道', img: fail.value.rgb},
  {key: 'lab', title: 'CIELAB 逐通道', img: fail.value.lab},
  {key: 'oklab', title: 'OKLab 逐通道', img: fail.value.oklab}
]);
const failRows = computed(() => [
  statRow('源图', fail.value.src),
  statRow('参考图', fail.value.ref),
  statRow('Reinhard 结果', fail.value.reinhard)
]);
const clipPercent = computed(() => (fail.value.clipShare * 100).toFixed(0));
</script>

<template>
  <demo-page>
    <demo-section
      title="把一张图的色调搬到另一张图上"
      desc="色彩迁移是让源图的形状和内容不变，只把整体色调换成参考图的样子。Reinhard 等人 2001 年的做法很简单：把两张图都换到 lαβ 空间，对每个通道分别做 x' = (x − μ源) × (σ参考 ÷ σ源) + μ参考，也就是把均值和标准差调成参考图的，再换回 RGB。下面三种做法用的都是这个公式，区别只在公式用在哪个空间：lαβ（先转线性光再取对数）、sRGB 编码值本身、CIELAB 或 OKLab。本页的 6 个场景都是程序按固定参数画的示意图，不是照片，也不支持上传。强度滑块是在输出的 sRGB 码值上把源图和结果线性混合。"
    >
      <div class="demo-controls">
        <label>
          源图
          <select v-model="srcKey">
            <option v-for="s in SCENES" :key="s.key" :value="s.key">{{ s.name }}</option>
          </select>
        </label>
        <label>
          参考图
          <select v-model="refKey">
            <option v-for="s in SCENES" :key="s.key" :value="s.key">{{ s.name }}</option>
          </select>
        </label>
        <label>
          对比空间
          <select v-model="space">
            <option value="lab">CIELAB</option>
            <option value="oklab">OKLab</option>
          </select>
        </label>
        <label>
          强度
          <input v-model.number="strength" type="range" min="0" max="100" step="5">
          <span class="demo-code">{{ strength }}%</span>
        </label>
      </div>
      <demo-canvas
        v-for="tile in tiles"
        :key="tile.key"
        :title="tile.title"
        :width="SCENE_W"
        :height="SCENE_H"
        :draw="drawImg(tile.img)"
      />
    </demo-section>

    <demo-section
      title="lαβ 是什么，为什么能逐通道处理"
      desc="lαβ 来自 Ruderman 等人 1998 年对自然图像的统计研究。做法：线性 RGB 乘一个矩阵得到 LMS（近似三种视锥的响应），取 log10，再做一次正交变换得到三个轴。l = (L+M+S)/√3 是亮度；α = (L+M−2S)/√6 是黄–蓝轴（S 对应蓝，α 越大越偏黄）；β = (L−M)/√2 是红–绿轴（β 越大越偏红）。取对数是因为视觉对光强的变化按比例响应。他们在大量自然照片上发现这三个轴之间的相关性很小。轴与轴几乎不相关时，改动一个通道的均值和方差基本不会连带改变另外两个，所以可以对每个通道单独处理；RGB 三个通道的相关性很高，单独拉伸红色会同时改变亮度和色相。"
    >
      <table class="ct-table">
        <thead>
          <tr>
            <th/>
            <th v-for="h in STAT_HEAD" :key="h">
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in statRows" :key="row.label">
            <th>{{ row.label }}</th>
            <td v-for="(c, i) in row.cells" :key="i" class="demo-code">
              {{ c }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="ct-note">
        上表是 lαβ 的均值和标准差（log10 单位）。结果一行是对输出图重新测量的数：强度 100% 时应当接近参考图，但转回 sRGB 时超出可显示范围的像素会被截断，所以不一定完全相等；强度小于 100% 时则介于源图和参考图之间。
      </p>
      <table class="ct-table">
        <thead>
          <tr>
            <th/>
            <th v-for="h in CORR_HEAD" :key="h">
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in corrRows" :key="row.label">
            <th>{{ row.label }}</th>
            <td v-for="(c, i) in row.cells" :key="i" class="demo-code">
              {{ c }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="ct-note">
        上表是通道两两之间的相关系数（左三列是 sRGB 码值，右三列是 lαβ）。需要注意：“几乎不相关”是对大量自然照片的统计结论。本页的场景是手工画的，只有几块颜色，相关系数有高有低，lαβ 并不总比 RGB 小，所以这个性质不是对每一张图都成立。
      </p>
    </demo-section>
    <demo-section
      title="会失效的情形：蓝色海面的色调套到绿色森林上"
      desc="这个方法只看整张图的均值和标准差，并不知道图里有什么。这里固定用蓝色海天作参考，去套绿色森林。参考图里几乎没有绿色，所以 Reinhard 的结果里树叶整体偏青蓝，棕色树干偏紫，本来是浅蓝的天空缺口反而变成了淡紫色。原因是树叶、树干、天空被当成同一个分布，全部按同一个量平移和缩放，每种物体应有的颜色没有被考虑。换成 CIELAB、OKLab 或直接在 sRGB 里做，结果的偏色方式各不相同（CIELAB 和 OKLab 里树叶变成发白的浅蓝，sRGB 里偏青绿），所以换空间不能解决问题。论文里的办法是在两张图上各选一小块对应的区域分别匹配，或者只在内容相近的两张图之间使用。"
    >
      <demo-canvas
        v-for="tile in failTiles"
        :key="tile.key"
        :title="tile.title"
        :width="SCENE_W"
        :height="SCENE_H"
        :draw="drawImg(tile.img)"
      />
      <table class="ct-table">
        <thead>
          <tr>
            <th/>
            <th v-for="h in STAT_HEAD" :key="h">
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in failRows" :key="row.label">
            <th>{{ row.label }}</th>
            <td v-for="(c, i) in row.cells" :key="i" class="demo-code">
              {{ c }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="ct-note">
        Reinhard 的结果里有 {{ clipPercent }}% 的像素超出了 sRGB 能显示的范围，被截断到边界上，所以结果的 α、β 标准差（{{ failRows[2].cells[3] }}、{{ failRows[2].cells[5] }}）比参考图（{{ failRows[1].cells[3] }}、{{ failRows[1].cells[5] }}）小，匹配并没有完全达成。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.ct-table {
  border-collapse: collapse;
  margin: 6px 0 4px;
  font-size: 12px;
  th,
  td {
    padding: 4px 10px;
    border: 1px solid #DDDEE4;
    text-align: right;
    white-space: nowrap;
  }
  thead th {
    background: #F5F6FA;
    font-weight: 500;
  }
  tbody th {
    background: #F5F6FA;
    font-weight: 500;
    text-align: left;
  }
}
.ct-note {
  max-width: 900px;
  margin: 4px 0 12px;
  font-size: 12px;
  line-height: 19px;
  color: #666;
}
</style>
