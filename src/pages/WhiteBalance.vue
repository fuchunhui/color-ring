<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {linearToXyz} from '../utils/space';
import {makePhotoScene, makeFoliageScene, drawLinearImage, LinearImage} from '../utils/scene';
import {
  illuminantGain,
  applyGain,
  bradfordAdapt,
  imageMean,
  rectMean,
  grayWorldGain,
  whitePointGain,
  referenceGain,
  hexToLinear,
  toCodes
} from '../composables/whitebalance';

type DrawFn = (ctx: CanvasRenderingContext2D) => void;

interface Tile {
  key: string;
  title: string;
  img: LinearImage;
}

const W = 320;
const H = 240;
const photo = makePhotoScene(W, H);
const foliage = makeFoliageScene(W, H);

const cct = ref(3000);
const greenOnly = ref(false);
const manualHex = ref<string | null>(null);

watch([cct, greenOnly], () => {
  manualHex.value = null;
});

const scene = computed(() => (greenOnly.value ? foliage : photo));
const gain = computed(() => illuminantGain(cct.value));
const cast = computed(() => applyGain(scene.value.image, gain.value));
const manualRef = computed(() => {
  return manualHex.value ? hexToLinear(manualHex.value) : rectMean(cast.value, scene.value.grayCard);
});

const tiles = computed<Tile[]>(() => {
  const c = cast.value;
  return [
    {key: 'original', title: '原景（理想白光下）', img: scene.value.image},
    {key: 'cast', title: `拍摄结果（${cct.value}K 光源）`, img: c},
    {key: 'gray', title: '灰世界', img: applyGain(c, grayWorldGain(c))},
    {key: 'white', title: '白点法（取最亮处）', img: applyGain(c, whitePointGain(c))},
    {key: 'manual', title: '手动取灰', img: applyGain(c, referenceGain(manualRef.value))},
    {key: 'cct', title: '按色温校正（Bradford）', img: bradfordAdapt(c, linearToXyz(gain.value))}
  ];
});

const drawer = (img: LinearImage): DrawFn => ctx => {
  drawLinearImage(ctx, img);
};

const codes = (c: number[]) => `(${c.join(', ')})`;

const stat = (img: LinearImage): string => {
  const card = toCodes(rectMean(img, scene.value.grayCard));
  const mean = toCodes(imageMean(img));
  return `灰卡 ${codes(card)}  均值 ${codes(mean)}`;
};

const onPick = (key: string, payload: {color: string}) => {
  if (key === 'cast') {
    manualHex.value = payload.color;
  }
};

const manualTip = computed(() => {
  return manualHex.value ? `手动参考色 ${manualHex.value}` : '默认取拍摄结果里的灰卡，点击“拍摄结果”中任意灰色区域可更换';
});
</script>

<template>
  <demo-page>
    <demo-section
      title="色彩恒常与白平衡"
      desc="同一张白纸在烛光下偏黄、在阴天偏蓝，但大脑几乎总能认出它是白的，这叫色彩恒常：视觉系统会自动“去掉”光源的颜色。相机没有这个本领，必须靠白平衡把各通道乘上一个增益，让灰色物体回到中性灰。拖动色温滑块模拟不同光源，下面是几种常见的校正算法。所有运算都在线性光中完成：von Kries 缩放本质是“按通道乘系数”，只有在线性光里，这个系数才对应光强的比例；在 gamma 编码值上乘系数，灰色会被推歪。"
    >
      <div class="demo-controls">
        <label>
          光源色温
          <input v-model.number="cct" type="range" min="2000" max="10000" step="100">
          <span class="demo-code">{{ cct }} K</span>
        </label>
        <label>
          <input v-model="greenOnly" type="checkbox">
          场景几乎全是绿叶
        </label>
        <span class="demo-code">{{ manualTip }}</span>
      </div>
      <div
        v-for="tile in tiles"
        :key="tile.key"
        class="wb-tile"
      >
        <demo-canvas
          :title="tile.title"
          :width="W"
          :height="H"
          :draw="drawer(tile.img)"
          @pick="onPick(tile.key, $event)"
        />
        <p class="wb-tile-stat demo-code">
          {{ stat(tile.img) }}
        </p>
      </div>
    </demo-section>

    <demo-section
      title="各算法的假设与失效场景"
      desc="灰世界假设整幅画面的平均色是中性灰，对普通场景有效，但画面被一种颜色占满时（勾选“全是绿叶”）会把绿色当成偏色“校正”掉，整体反而偏品红。白点法假设最亮的地方是白色，遇到高光是彩色或过曝时会出错。手动取灰最可靠，但需要画面里有真正的灰色物体（比如 18% 灰卡）。按色温校正则要事先知道光源色温，它用 Bradford 矩阵在更接近视锥响应的空间里做色适应，比直接在 RGB 里缩放更接近人眼，所以通常是最准的一栏。观察每个画面下方的灰卡读数：越接近 (118, 118, 118) 说明校正越准。"
    />
  </demo-page>
</template>

<style lang="less">
.wb-tile {
  display: inline-block;
  vertical-align: top;
  &-stat {
    margin: -8px 16px 16px 0;
    font-size: 12px;
    color: #555;
  }
}
</style>
