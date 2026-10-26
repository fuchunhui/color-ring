<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  DISCS,
  SCREEN_W,
  SCREEN_H,
  ORDERS_W,
  ORDERS_H,
  LASER_W,
  LASER_H,
  DISC_SIZE,
  SLIT_W,
  SLIT_H,
  gratingPitch,
  drawGratingScreen,
  drawOrdersPlot,
  drawLaserDots,
  drawDisc,
  drawSlitPlot
} from '../composables/diffraction';

const lines = ref(600);
const dist = ref(60);
const kind = ref('cd');
const lightAz = ref(90);
const lightEl = ref(25);
const viewEl = ref(60);
const slits = ref(5);
const ratio = ref(0.3);

const gratingState = () => ({lines: lines.value, dist: dist.value});
const discState = () => ({kind: kind.value, lightAz: lightAz.value, lightEl: lightEl.value, viewEl: viewEl.value});
const slitState = () => ({n: slits.value, ratio: ratio.value});

const drawScreen = drawGratingScreen(gratingState);
const drawOrders = drawOrdersPlot(gratingState);
const drawLasers = drawLaserDots(gratingState);
const drawDiscPicture = drawDisc(discState);
const drawSlits = drawSlitPlot(slitState);

const pitchText = computed(() => `d = ${(gratingPitch(lines.value) / 1000).toFixed(2)} µm`);
</script>

<template>
  <demo-page>
    <demo-section
      title="透射光栅：白光变成彩带"
      desc="光栅是一排间距为 d 的细缝（或刻线）。光通过每条缝后都会向各个方向衍射，只有在满足 d·sinθ = mλ（m 为整数，叫“级”）的方向上，来自所有缝的光才同相叠加、互相加强。波长越长，同一级的 θ 越大，所以白光会按颜色排开，红光偏得最远，这和棱镜相反（棱镜里紫光偏得最多）。0 级（m = 0）所有颜色都在中央重合，仍然是白色；m = 1、2、3 …… 各自展开成一条光谱，级数越高，光谱越宽，相邻级的光谱会重叠。下面的颜色是对连续光谱逐位置积分得到的，重叠处的颜色相加。"
    >
      <div class="demo-controls">
        <label>
          刻线密度
          <input v-model.number="lines" type="range" min="100" max="1200" step="20">
          <span class="demo-code">{{ lines }} 条/mm（{{ pitchText }}）</span>
        </label>
        <label>
          光栅到屏的距离
          <input v-model.number="dist" type="range" min="20" max="100" step="5">
          <span class="demo-code">{{ dist }} cm</span>
        </label>
      </div>
      <demo-canvas title="屏上的图样（光源是 D65 日光，假设缝宽是缝间距的 0.4 倍）" :width="SCREEN_W" :height="SCREEN_H" :draw="drawScreen"/>
      <demo-canvas title="各级光谱在屏上的位置" :width="ORDERS_W" :height="ORDERS_H" :draw="drawOrders"/>
    </demo-section>

    <demo-section
      title="激光：单色光变成一排亮点"
      desc="换成单色激光，每一级就只剩一个亮点，位置 x = L·tanθ，sinθ = mλ/d。波长越长，亮点离中心越远；刻线越密（d 越小），亮点分得越开，能出现的级数也越少（sinθ 不能超过 1）。用已知波长的激光测出亮点的位置，就能反过来算出光栅的间距，反过来，用已知光栅就能测量未知光的波长，这就是光栅光谱仪的原理。这里沿用上面的刻线密度与屏距。"
    >
      <div class="demo-controls">
        <label>
          刻线密度
          <input v-model.number="lines" type="range" min="100" max="1200" step="20">
          <span class="demo-code">{{ lines }} 条/mm</span>
        </label>
      </div>
      <demo-canvas :width="LASER_W" :height="LASER_H" :draw="drawLasers"/>
    </demo-section>

    <demo-section
      title="光碟为什么有彩虹色"
      desc="CD 和 DVD 上刻着螺旋形的细密轨道，CD 的轨距是 1.6 µm，DVD 是 0.74 µm，相当于一个反射式光栅。光栅方程变成 sinθm = sinθi + mλ/d，观察方向与光源方向确定后，圆盘上每个位置的轨道朝向不同，满足条件的波长也不同，所以盘面呈现出一圈圈、一块块不同的颜色，换个角度颜色就变，这是结构色，不是涂上去的色素。DVD 的轨距更小，同样的角度下衍射光出射得更偏，彩色区域也更宽。这里假设光源和观察者都足够远，并给光线留了约 10° 的方向宽度，颜色强度是示意值。光源和观察者在盘面两侧、高度相近时接近镜面反射，几乎看不到衍射色，把光源调低、视线调高，彩色扇区才会出现。"
    >
      <div class="demo-controls">
        <label>
          光碟
          <select v-model="kind">
            <option v-for="item in DISCS" :key="item.key" :value="item.key">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          光源方位
          <input v-model.number="lightAz" type="range" min="0" max="360" step="5">
          <span class="demo-code">{{ lightAz }}°</span>
        </label>
        <label>
          光源高度
          <input v-model.number="lightEl" type="range" min="10" max="85" step="1">
          <span class="demo-code">{{ lightEl }}°</span>
        </label>
        <label>
          视线高度
          <input v-model.number="viewEl" type="range" min="20" max="90" step="1">
          <span class="demo-code">{{ viewEl }}°</span>
        </label>
      </div>
      <demo-canvas :width="DISC_SIZE" :height="DISC_SIZE" :draw="drawDiscPicture"/>
    </demo-section>

    <demo-section
      title="单缝包络与多缝干涉"
      desc="N 条缝的总强度是两个因子的乘积：单缝衍射的包络 sinc²（宽度由缝宽 a 决定）乘上多缝干涉因子（由缝间距 d 和缝数 N 决定）。N = 1 时只有包络；N = 2 是杨氏双缝的明暗条纹；N 越大，主极大越窄越亮，主极大之间出现 N − 2 个弱的次极大。光栅有几千条缝，所以每一级都是极细的亮线，能把相近的波长分开。缝宽越小，包络越宽，高级次的亮线也不会被压暗；包络的零点会让对应位置的某些级“缺级”。"
    >
      <div class="demo-controls">
        <label>
          缝数 N
          <input v-model.number="slits" type="range" min="1" max="20" step="1">
          <span class="demo-code">{{ slits }}</span>
        </label>
        <label>
          缝宽 / 缝间距
          <input v-model.number="ratio" type="range" min="0.1" max="0.9" step="0.05">
          <span class="demo-code">{{ ratio.toFixed(2) }}</span>
        </label>
      </div>
      <demo-canvas :width="SLIT_W" :height="SLIT_H" :draw="drawSlits"/>
    </demo-section>
  </demo-page>
</template>
