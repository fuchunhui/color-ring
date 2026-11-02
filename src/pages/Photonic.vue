<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  PRESETS,
  SPHERES,
  MEDIA,
  SPECTRUM_W,
  SPECTRUM_H,
  ANGLE_W,
  ANGLE_H,
  ANGLE_MAX,
  PERIODS_W,
  PERIODS_H,
  OPAL_PLOT_W,
  OPAL_PLOT_H,
  DIAMETER_MIN,
  DIAMETER_MAX,
  DIAMETER_W,
  DIAMETER_H,
  CAB_W,
  CAB_H,
  drawStackSpectrum,
  drawAngleStrip,
  drawPeriods,
  drawOpalAngle,
  drawDiameterStrip,
  drawCabochon,
  opalReadout
} from '../composables/photonic';

const DEFAULT_PERIODS: Record<string, number> = {dielectric: 5, weak: 15, morpho: 6};

const preset = ref('dielectric');
const periods = ref(DEFAULT_PERIODS.dielectric);
const center = ref(520);
const theta = ref(0);
const disorder = ref(0);

watch(preset, key => {
  periods.value = DEFAULT_PERIODS[key] || 6;
});

const stackState = () => ({
  preset: preset.value,
  periods: periods.value,
  center: center.value,
  theta: theta.value,
  jitter: disorder.value / 100
});

const drawSpectrum = drawStackSpectrum(stackState);
const drawAngles = drawAngleStrip(stackState);
const drawPeriodCurves = drawPeriods(stackState);

const current = computed(() => PRESETS.find(item => item.key === preset.value) || PRESETS[0]);

const diameter = ref(250);
const sphere = ref('silica');
const medium = ref('air');
const opalTheta = ref(0);

const opalState = () => ({
  diameter: diameter.value,
  sphere: sphere.value,
  medium: medium.value,
  theta: opalTheta.value
});

const drawOpalPlot = drawOpalAngle(opalState);
const drawDiameter = drawDiameterStrip(opalState);
const drawStone = drawCabochon(opalState);
const readout = computed(() => opalReadout(opalState()));
</script>

<template>
  <demo-page>
    <demo-section
      title="多层膜：一摞薄膜怎样反射出一种颜色"
      desc="把折射率高低交替的薄层叠在一起，每个界面只反射一小部分光。在某个波长上，所有界面的反射光刚好同相叠加，这一段波长就被强烈反射，形成一条高反射带，也就是一维的光子晶体。垂直入射时，反射带的中心大约在 λ₀ = 2(n₁d₁ + n₂d₂)；斜着看时，光在每层里走的路径变短，中心近似变成 2(n₁d₁cosθ₁ + n₂d₂cosθ₂)，向短波移动，颜色因此偏蓝。下面用特征矩阵法（传输矩阵法）逐层算出干涉，入射介质是空气，s 光和 p 光分别计算，再用 D65 日光和 CIE 颜色匹配函数换成颜色；亮度按 0° 时的反射峰值归一化，方便看色相的变化。所有材料都按无吸收、折射率不随波长变化处理，是简化模型。"
    >
      <div class="demo-controls">
        <label>
          叠层
          <select v-model="preset">
            <option v-for="item in PRESETS" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          周期数
          <input v-model.number="periods" type="range" min="1" max="30" step="1">
          <span class="demo-code">{{ periods }}</span>
        </label>
        <label v-if="current.tunable">
          设计波长 λ₀
          <input v-model.number="center" type="range" min="400" max="700" step="5">
          <span class="demo-code">{{ center }} nm</span>
        </label>
        <label>
          入射角
          <input v-model.number="theta" type="range" min="0" :max="ANGLE_MAX" step="1">
          <span class="demo-code">{{ theta }}°</span>
        </label>
        <label>
          层厚起伏
          <input v-model.number="disorder" type="range" min="0" max="40" step="1">
          <span class="demo-code">±{{ disorder }}%</span>
        </label>
      </div>
      <p class="demo-section-desc">
        {{ current.note }}
      </p>
      <demo-canvas :width="SPECTRUM_W" :height="SPECTRUM_H" :draw="drawSpectrum"/>
      <p class="demo-section-desc">
        “层厚起伏”让每一层的厚度各自随机变化，再取 10 组随机叠层的平均，用来示意不整齐的结构：反射带会变宽、变矮，边缘变得模糊。入射角最大只取到 70°，再斜下去，任何界面的反射都会在所有波长上一起升高，反射带就看不清了。
      </p>
    </demo-section>

    <demo-section
      title="入射角 → 颜色"
      desc="横轴是入射角 0°–70°，颜色是该角度下的反射色，三角标出上面滑块的位置。随着角度增大，反射带向短波移动，颜色朝蓝紫方向变化，这就是虹彩（颜色随角度变化）。移动量由叠层的平均折射率决定：中心波长近似正比于 √(n_平均² − sin²θ)，平均折射率越高，同样的角度下移动得越少。"
    >
      <demo-canvas :width="ANGLE_W" :height="ANGLE_H" :draw="drawAngles"/>
    </demo-section>

    <demo-section
      title="周期数：反射带有多高、多陡"
      desc="反射带的位置只由每层的光学厚度决定，周期数只影响它有多高、边缘有多陡。1 个周期时只有微弱的起伏；周期数增加，峰值逐渐逼近 100%，两侧的小波纹也越来越密。反射带的宽度主要由折射率对比决定，四分之一波长叠层的带宽近似为 Δλ/λ₀ ≈ (4/π)·arcsin((n_H − n_L)/(n_H + n_L))：TiO₂ / SiO₂ 的相对带宽约 28%，n = 1.60 / 1.45 的约 6%，所以后者窄得多，也要叠几十层才够高。下面按当前选的叠层、设计波长和入射角，画出 1、2、4、8、16 个周期的反射率。"
    >
      <demo-canvas :width="PERIODS_W" :height="PERIODS_H" :draw="drawPeriodCurves"/>
    </demo-section>

    <demo-section
      title="闪蝶：蓝色来自哪里，没有解释的是什么"
      desc="闪蝶翅膀的蓝色不含蓝色素。鳞片表面有一排排凸脊，凸脊的侧面是 5~10 层薄薄的几丁质薄片，片与片之间是空气，上面选“闪蝶鳞片（示意）”就是这种叠层。它把 430~460 nm 一带的蓝光反射出来，并且随角度向短波移动，这些本页的一维模型都能算出来。（注意：下面的反射带重心因为带形不对称，会比公式估计的 433 nm 略偏长。）但这个模型解释不了闪蝶从很大的角度范围看都还是蓝色：一维叠层的颜色会像上面的条带一样，斜到 45° 以后明显偏向蓝紫。文献里常见的解释有几条，这里都没有计算：凸脊只有几百纳米宽，会把反射光衍射到很宽的角度；相邻凸脊上薄片的高度并不一致，把各自的颜色平均开了；鳞片上方还有透明的覆盖鳞片。这里只放了“层厚起伏”一个滑块，示意无序让反射带变宽、变淡，不能说明它们各自的贡献有多大。"
    />

    <demo-section
      title="蛋白石：小球排成的三维光子晶体"
      desc="蛋白石由大小几乎相同的二氧化硅小球紧密堆成，小球间的空隙里是空气或水。这是一个三维的周期结构，沿着 (111) 面的方向就像一摞间距为 d₁₁₁ 的面，d₁₁₁ = D·√(2/3) ≈ 0.816·D（面心立方堆积，D 是小球直径）。把 Bragg 公式和折射定律合起来（Bragg–Snell 公式）：λ = 2·d₁₁₁·√(n_eff² − sin²θ)，其中 θ 是空气里的入射角，n_eff² = f·n_球² + (1−f)·n_隙²，f = 0.74 是紧密堆积时小球占的体积比例。小球直径 250 nm 的二氧化硅蛋白石，孔隙里是空气时，垂直方向反射峰约 550 nm，是绿色；孔隙进了水，n_eff 变大，峰移到约 580 nm，偏黄。下面的反射带形状是示意的高斯形，宽度取中心波长的 8%，峰值反射率取 90%。真实的蛋白石还有排列的缺陷、吸收和多重散射，这些模型都没有计算，这里只算反射峰的位置。"
    >
      <div class="demo-controls">
        <label>
          小球直径
          <input v-model.number="diameter" type="range" :min="DIAMETER_MIN" :max="DIAMETER_MAX" step="5">
          <span class="demo-code">{{ diameter }} nm</span>
        </label>
        <label>
          小球材料
          <select v-model="sphere">
            <option v-for="item in SPHERES" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          孔隙里是
          <select v-model="medium">
            <option v-for="item in MEDIA" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          入射角
          <input v-model.number="opalTheta" type="range" min="0" max="80" step="1">
          <span class="demo-code">{{ opalTheta }}°</span>
        </label>
      </div>
      <p class="demo-code">
        垂直入射 {{ readout.normal.toFixed(0) }} nm；{{ opalTheta }}° 时 {{ readout.current.toFixed(0) }} nm，颜色 {{ readout.hex }}
        {{ readout.current < 380 ? '（紫外，看不见）' : readout.current > 780 ? '（红外，看不见）' : '' }}
      </p>
      <demo-canvas :width="OPAL_PLOT_W" :height="OPAL_PLOT_H" :draw="drawOpalPlot"/>
    </demo-section>

    <demo-section
      title="小球直径 → 颜色"
      desc="横轴是小球直径 150–350 nm，颜色是按当前的小球材料、孔隙介质和入射角算出的反射色，三角是上面滑块的位置。直径越大，反射峰越向长波移。以二氧化硅小球、孔隙是空气、垂直入射为例：小于约 173 nm 时反射峰在紫外，看不见（条带里黑色的部分）；约 200 nm 蓝，250 nm 绿，280 nm 橙，300 nm 红，到 350 nm 左右已接近红外。天然蛋白石里的小球大致在这个范围内；红色需要的小球更大；天然蛋白石里，红色的变彩也是最少见的。"
    >
      <demo-canvas :width="DIAMETER_W" :height="DIAMETER_H" :draw="drawDiameter"/>
    </demo-section>

    <demo-section
      title="蛋白石的色斑（示意）"
      desc="真实的蛋白石不是一整块晶体，而是许多取向各不相同的小晶粒拼成的，同一个观察角度下，不同晶粒相对光线的角度不同，反射的颜色也不同，这就是“变彩”。这里随机生成约 230 个晶粒，每个晶粒有自己的取向偏差（±40° 内）和反射强度，再加上球面造成的左右倾斜，用上面的参数和入射角，按各自的 Bragg–Snell 公式分别算出颜色，铺在一块深色基底上。晶粒的位置和取向是固定的随机数，拖动入射角时，色斑会整体流动，就像转动一块真的蛋白石。这是示意图，不是某块石头的复原。"
    >
      <demo-canvas :width="CAB_W" :height="CAB_H" :draw="drawStone"/>
    </demo-section>
  </demo-page>
</template>
