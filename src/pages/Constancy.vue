<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {CASTS, SCENES, W, H, analyze, errorTable} from '../utils/constancy';
import type {Params} from '../utils/constancy';
import {PLOT_W, PLOT_H, imageDrawer, chromaDrawer, tilesOf, errorShade} from '../composables/constancy';

const sceneKey = ref('patches');
const castKey = ref('tungsten');
const strength = ref(80);
const p = ref(6);
const sigma = ref(20);
const topOnePercent = ref(false);

const params = computed<Params>(() => ({
  scene: sceneKey.value,
  cast: castKey.value,
  strength: strength.value / 100,
  p: p.value,
  sigma: sigma.value,
  percentile: topOnePercent.value ? 0.99 : 1
}));

const analysis = computed(() => analyze(params.value));
const tiles = computed(() => tilesOf(analysis.value, sigma.value).map(tile => ({...tile, draw: imageDrawer(tile.img)})));
const plotDraw = computed(() => chromaDrawer(analysis.value));
const rows = computed(() => errorTable(params.value));
const sceneNote = computed(() => (SCENES.find(item => item.key === sceneKey.value) || SCENES[0]).note);

const fmt = (deg: number): string => deg.toFixed(1);
</script>

<template>
  <demo-page>
    <demo-section
      title="同一张偏色照片，几种猜光源的办法"
      desc="相机拍到的每个像素 = 物体反射率 × 光源颜色，光源颜色不知道，只能从画面本身去猜，猜出来后每个通道除以它（von Kries 缩放），在线性光里做完再编码回 sRGB。灰度世界假定整幅画面的平均色是灰的。白块假定最亮的地方是白的。灰度之阴（Shades of Gray）把二者连起来：每个通道先取 p 次方再求平均、再开 p 次根，p = 1 就是灰度世界，p 越大越接近白块。灰边（Gray-Edge）假定边缘处的颜色差平均起来是灰的：先做 σ = 1 的高斯平滑，再对每个通道的梯度大小取 p = 5 的范数。Retinex 不猜整体光源，它把每个像素除以周围的高斯模糊值，所以改变的是局部对比。拍摄结果按传感器上限截断在 1，过曝的像素会变成纯白。场景都是程序生成的，不是照片。"
    >
      <div class="demo-controls">
        <label>
          场景
          <select v-model="sceneKey">
            <option v-for="item in SCENES" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          光源
          <select v-model="castKey">
            <option v-for="item in CASTS" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          偏色强度
          <input v-model.number="strength" type="range" min="0" max="100" step="5">
          <span class="demo-code">{{ strength }}%</span>
        </label>
      </div>
      <div class="demo-controls">
        <label>
          灰度之阴 p
          <input v-model.number="p" type="range" min="1" max="20" step="1">
          <span class="demo-code">{{ p }}</span>
        </label>
        <label>
          Retinex σ
          <input v-model.number="sigma" type="range" min="2" max="80" step="1">
          <span class="demo-code">{{ sigma }} px</span>
        </label>
        <label>
          <input v-model="topOnePercent" type="checkbox">
          白块取前 1%（忽略每个通道最亮的 1% 像素）
        </label>
      </div>
      <p class="demo-section-desc">
        {{ sceneNote }}
      </p>
      <div
        v-for="tile in tiles"
        :key="tile.key"
        class="cs-tile"
      >
        <demo-canvas :title="tile.title" :width="W" :height="H" :draw="tile.draw"/>
        <p class="cs-tile-stat demo-code">
          {{ tile.caption }}
        </p>
      </div>
      <p class="demo-section-desc">
        Retinex 没有一个全局光源可以报告，所以不出现在下面的色度图里。σ 很小时它更像边缘检测，σ 很大时模糊后的图接近整幅画面的平均色，结果就接近灰度世界。输出的平均亮度被缩放到与拍摄结果一致。
      </p>
    </demo-section>

    <demo-section
      title="估计出的光源离真实光源有多远"
      desc="下图把真实光源和各方法的估计画在 rg 色度平面上（r = R/(R+G+B)，g = G/(R+G+B)），十字是白光。每个点到“真实光源”圆圈的连线越长，误差越大；误差用两个 RGB 向量的夹角表示，单位是度，这是色彩恒常性研究里常用的 recovery angular error。经验上 3° 以内多数人看不出差别，10° 以上就能明显看出偏色，这个门槛因场景和观察者而异，只作参考。"
    >
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="plotDraw"/>
    </demo-section>

    <demo-section
      title="哪个场景会让哪种方法出错"
      desc="下表用当前的光源、强度、p 和 σ，对四个场景各跑一遍，数字是光源估计误差（度），绿色低于 3°，越红越大。最后两列是例外：Retinex 的残余偏色是它的输出平均色与原景平均色的夹角，不是光源误差，只能粗略对照；“不校正”是拍摄结果本身的偏色。"
    >
      <table class="cs-table">
        <thead>
          <tr>
            <th>场景</th>
            <th>灰度世界</th>
            <th>白块（最大值）</th>
            <th>白块（前 1%）</th>
            <th>灰度之阴 p={{ p }}</th>
            <th>灰边</th>
            <th>Retinex 残余</th>
            <th>不校正</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.scene.key">
            <th>{{ row.scene.name }}</th>
            <td :style="{background: errorShade(row.errors.gray)}">
              {{ fmt(row.errors.gray) }}°
            </td>
            <td :style="{background: errorShade(row.errors.white)}">
              {{ fmt(row.errors.white) }}°
            </td>
            <td :style="{background: errorShade(row.errors.white99)}">
              {{ fmt(row.errors.white99) }}°
            </td>
            <td :style="{background: errorShade(row.errors.sog)}">
              {{ fmt(row.errors.sog) }}°
            </td>
            <td :style="{background: errorShade(row.errors.edge)}">
              {{ fmt(row.errors.edge) }}°
            </td>
            <td :style="{background: errorShade(row.retinexResidual)}">
              {{ fmt(row.retinexResidual) }}°
            </td>
            <td class="cs-table-base">
              {{ fmt(row.untouched) }}°
            </td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        在默认的钨丝灯 80% 下可以看到：灰度世界在草地上误差约 38°，草地的平均色本来就是绿的，它把绿当成了光源。白块在草地上反而几乎完全准确（约 0.2°），靠的是两块灰石头，它们是各通道里最亮的中性物体；改成“前 1%”后，石头只占不到 1% 的像素，被一起排除，误差回到约 28°。在带高光的静物里，白块的误差和不校正完全一样（约 19°），因为高光已经过曝成纯白，最大值里没有任何光源信息。灰边在雾蒙蒙的场景里最差（约 8°），那里几乎没有边缘，梯度主要来自纹理噪声。灰度之阴取 p = 6 时，草地上的误差从灰度世界的约 38° 降到约 13°。这些数字只说明这几个程序生成的场景里发生了什么，不代表这些算法在真实照片上的平均水平。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cs-tile {
  display: inline-block;
  vertical-align: top;
  &-stat {
    max-width: 192px;
    margin: -8px 16px 16px 0;
    font-size: 12px;
    line-height: 17px;
    color: #555;
  }
}
.cs-table {
  border-collapse: collapse;
  margin: 8px 0 12px;
  font-size: 13px;
  th,
  td {
    padding: 6px 12px;
    border: 1px solid #DDDEE4;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  thead th {
    background: #F5F6FA;
    font-weight: 500;
  }
  tbody th {
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
  }
  &-base {
    color: #666;
  }
}
</style>
