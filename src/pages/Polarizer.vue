<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {BIREFRINGENT} from '../utils/optics';
import {
  SPEC_W,
  SPEC_H,
  STRIP_W,
  STRIP_H,
  FAN_SIZE,
  LAYER_W,
  LAYER_H,
  RULER_W,
  RULER_H,
  retardOf,
  drawTransmission,
  drawRetardStrip,
  drawFan,
  drawLayerStrip,
  drawRuler
} from '../composables/polarizer';

const material = ref('tape');
const thickness = ref(30);
const theta = ref(45);
const layers = ref(2);
const perLayer = ref(130);
const load = ref(60);
const crossedMode = ref(true);

const dn = computed(() => (BIREFRINGENT.find(item => item.key === material.value) || BIREFRINGENT[0]).dn);
const retardState = () => ({dn: dn.value, thickness: thickness.value, theta: theta.value});
const fanState = () => ({layers: layers.value, perLayer: perLayer.value});
const rulerState = () => ({load: load.value, crossed: crossedMode.value});

const drawSpectrum = drawTransmission(retardState);
const drawStrip = drawRetardStrip();
const drawCrossed = drawFan(fanState, true);
const drawParallel = drawFan(fanState, false);
const drawLayers = drawLayerStrip(fanState);
const drawRulerField = drawRuler(rulerState);

const retard = computed(() => retardOf(retardState()));
</script>

<template>
  <demo-page>
    <demo-section
      title="两片偏振片之间夹一层透明塑料"
      desc="很多透明塑料（胶带、玻璃纸）和晶体有双折射：光沿“快轴”和“慢轴”两个方向的传播速度不同，通过后两个分量产生相位差 Γ = 2π·Δn·d/λ，叫延迟量（retardation，R = Δn·d，单位 nm）。把这样的薄片夹在两片偏振片之间，不同波长的透过率不同：正交时 I = sin²(2θ)·sin²(πR/λ)（θ 是光轴与起偏方向的夹角），平行时是 1 减去它。于是透明的塑料就出现了颜色，而且正交与平行时的颜色互为补色。下面用 D65 背光、CIE 颜色匹配函数换算颜色，忽略了 Δn 随波长的变化。各材料的 Δn 是典型的近似值，实际因材料和工艺而异。"
    >
      <div class="demo-controls">
        <label>
          材料
          <select v-model="material">
            <option v-for="item in BIREFRINGENT" :key="item.key" :value="item.key">
              {{ item.name }}（Δn ≈ {{ item.dn }}）
            </option>
          </select>
        </label>
        <label>
          厚度
          <input v-model.number="thickness" type="range" min="1" max="150" step="1">
          <span class="demo-code">{{ thickness }} µm → 延迟量 {{ retard.toFixed(0) }} nm</span>
        </label>
        <label>
          光轴夹角 θ
          <input v-model.number="theta" type="range" min="0" max="90" step="1">
          <span class="demo-code">{{ theta }}°</span>
        </label>
      </div>
      <demo-canvas :width="SPEC_W" :height="SPEC_H" :draw="drawSpectrum"/>
    </demo-section>

    <demo-section
      title="延迟量 → 颜色"
      desc="横轴是延迟量 0–3000 nm，颜色是正交偏振片、光轴成 45° 时看到的样子。延迟量为 0 时是黑的；约 150–250 nm 是灰白；之后依次是黄、橙、红，约 551 nm（一个波长的绿光）时绿光被完全消去，只剩红和蓝，呈鲜艳的紫红色，叫“一级红”或“灵敏色”，这个位置对延迟量的变化特别敏感，岩石学里常用来判断矿物的光性。再往后是蓝、绿、黄……每隔一个“级”重复一次，但颜色越来越淡，高级次时变成接近白色的“高级白”。这就是岩石薄片显微镜里的米歇尔-列维色谱的由来。"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="drawStrip"/>
    </demo-section>

    <demo-section
      title="多层胶带与旋转的圆盘"
      desc="把光轴方向一致的几层胶带叠起来，延迟量相加，颜色随层数变化。右边两个圆盘把“胶带相对偏振片转了多少度”展开成圆盘上的方位角，所以能一眼看出 sin²(2θ) 的规律：每转 90° 重复一次，θ = 0° 与 90° 的方向上（水平和竖直）正交时是黑的，θ = 45° 时最亮；平行偏振片则相反。把几条胶带贴成不同方向，放在液晶屏幕（它发出的光本来就是偏振的）前，再透过偏光眼镜或偏振片转动着看，就能看到同样的效果。"
    >
      <div class="demo-controls">
        <label>
          层数
          <input v-model.number="layers" type="range" min="1" max="6" step="1">
          <span class="demo-code">{{ layers }}</span>
        </label>
        <label>
          每层的延迟量
          <input v-model.number="perLayer" type="range" min="50" max="400" step="10">
          <span class="demo-code">{{ perLayer }} nm</span>
        </label>
      </div>
      <demo-canvas title="正交偏振片" :width="FAN_SIZE" :height="FAN_SIZE" :draw="drawCrossed"/>
      <demo-canvas title="平行偏振片" :width="FAN_SIZE" :height="FAN_SIZE" :draw="drawParallel"/>
      <demo-canvas title="1–6 层胶带（θ = 45°）" :width="LAYER_W" :height="LAYER_H" :draw="drawLayers"/>
    </demo-section>

    <demo-section
      title="光弹性：看见塑料里的应力"
      desc="有些透明塑料受力时会产生双折射，延迟量与应力大小成正比，叫光弹性效应。把一把塑料尺放在正交偏振片之间，在中间用力弯曲（三点弯曲），尺子上就会出现彩色条纹：同一种颜色的曲线连着应力相同的点，条纹越密，应力越集中。尺子中间的黑线是中性层，这里的材料既不拉伸也不压缩。下面按材料力学的梁弯曲公式（弯矩在中点最大，沿厚度线性变化）加上加载点附近的接触应力，生成延迟量分布，再换算颜色。弯曲轴与偏振方向成 45°。这是简化的示意，不是有限元计算。"
    >
      <div class="demo-controls">
        <label>
          载荷
          <input v-model.number="load" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ load }}%</span>
        </label>
        <label>
          <input v-model="crossedMode" type="checkbox">
          正交偏振片（取消勾选＝平行偏振片）
        </label>
      </div>
      <demo-canvas :width="RULER_W" :height="RULER_H" :draw="drawRulerField"/>
    </demo-section>
  </demo-page>
</template>
