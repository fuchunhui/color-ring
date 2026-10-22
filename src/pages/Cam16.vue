<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {Vec3, rgbToXyz} from '../utils/space';
import {Surround, xyzToCam16} from '../utils/cam16';
import {xyzToJzazbz, xyzToICtCp, srgbToAbsXyz} from '../utils/cam16hdr';
import {RING_W, RING_H, PLOT_W, PLOT_H, viewingFor, ringColors, drawRing, drawTransfer} from '../composables/cam16';

const color = ref('#c8472e');
const laLog = ref(1.8);
const surround = ref<Surround>('average');
const background = ref('gray');

const la = computed(() => 10 ** laLog.value);
const rgb = computed(() => [1, 3, 5].map(i => parseInt(color.value.slice(i, i + 2), 16)) as Vec3);
const xyz = computed(() => rgbToXyz(rgb.value).map(v => v * 100) as Vec3);

const current = computed(() => xyzToCam16(xyz.value, viewingFor(la.value, background.value, surround.value)));

const CONDITIONS: Array<{label: string; la: number; surround: Surround; background: string}> = [
  {label: '明亮办公室（平均环境，L_A = 200）', la: 200, surround: 'average', background: 'gray'},
  {label: '普通室内（平均环境，L_A = 64）', la: 64, surround: 'average', background: 'gray'},
  {label: '昏暗客厅看电视（昏暗环境，L_A = 16）', la: 16, surround: 'dim', background: 'gray'},
  {label: '暗室看投影（黑暗环境，L_A = 4）', la: 4, surround: 'dark', background: 'gray'}
];

const comparison = computed(() => CONDITIONS.map(c => ({
  label: c.label,
  cam: xyzToCam16(xyz.value, viewingFor(c.la, c.background, c.surround))
})));

const jp = ref(60);
const mp = ref(22);
const okL = ref(0.7);
const okC = ref(0.1);

const camRing = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  drawRing(ringColors('cam16', jp.value, mp.value))(ctx, w, h);
};
const okRing = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  drawRing(ringColors('oklch', okL.value, okC.value))(ctx, w, h);
};

const sdrWhite = ref(100);
const hlgPeak = ref(1000);
const transfer = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  drawTransfer({sdrWhite: sdrWhite.value, hlgPeak: hlgPeak.value})(ctx, w, h);
};

const peak = ref(100);
const hdr = computed(() => {
  const abs = srgbToAbsXyz(rgb.value, peak.value);
  return {jz: xyzToJzazbz(abs), ictcp: xyzToICtCp(abs)};
});
const hdrWhite = computed(() => {
  const abs = srgbToAbsXyz([255, 255, 255], peak.value);
  return {jz: xyzToJzazbz(abs), ictcp: xyzToICtCp(abs)};
});
</script>

<template>
  <demo-page>
    <demo-section
      title="CAM16：颜色的“外观”"
      desc="CIELAB 之类的色彩空间只描述“颜色本身”，而人眼看到的颜色会随周围环境改变：同一块红色，在明亮的办公室里和在昏暗的客厅里看起来明度、鲜艳度都不一样。色貌模型（Color Appearance Model）把环境（白点、适应亮度 L_A、背景、周围环境亮度）考虑进来，输出明度 J、色度 C、色相 h 等“外观相关量”。CAM16 是目前最常用的一个。注意：这一页是计算器和演示，不是完整的色彩管理流程；这里也没有对 XYZ 做任何设备特征化。"
    >
      <div class="demo-controls">
        <label>颜色 <input v-model="color" type="color"></label>
        <label>
          适应亮度 L_A
          <input v-model.number="laLog" type="range" min="0" max="3" step="0.05">
          <span class="demo-code">{{ la.toFixed(0) }} cd/m²</span>
        </label>
        <label>
          周围环境
          <select v-model="surround">
            <option value="average">平均</option>
            <option value="dim">昏暗</option>
            <option value="dark">黑暗</option>
          </select>
        </label>
        <label>
          背景
          <select v-model="background">
            <option value="white">白（Yb = 100）</option>
            <option value="gray">中灰（Yb = 20）</option>
            <option value="black">近黑（Yb = 2）</option>
          </select>
        </label>
      </div>
      <table class="cam-table">
        <thead>
          <tr>
            <th>条件</th>
            <th>J 明度</th>
            <th>C 色度</th>
            <th>h 色相</th>
            <th>M 鲜艳度</th>
            <th>s 饱和度</th>
            <th>Q 亮度</th>
          </tr>
        </thead>
        <tbody>
          <tr class="cam-current">
            <th>当前设置</th>
            <td>{{ current.J.toFixed(2) }}</td>
            <td>{{ current.C.toFixed(2) }}</td>
            <td>{{ current.h.toFixed(1) }}°</td>
            <td>{{ current.M.toFixed(2) }}</td>
            <td>{{ current.s.toFixed(2) }}</td>
            <td>{{ current.Q.toFixed(2) }}</td>
          </tr>
          <tr v-for="row in comparison" :key="row.label">
            <th>{{ row.label }}</th>
            <td>{{ row.cam.J.toFixed(2) }}</td>
            <td>{{ row.cam.C.toFixed(2) }}</td>
            <td>{{ row.cam.h.toFixed(1) }}°</td>
            <td>{{ row.cam.M.toFixed(2) }}</td>
            <td>{{ row.cam.s.toFixed(2) }}</td>
            <td>{{ row.cam.Q.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="cam-note">
        上面几行用的是同一个 XYZ，只是观察条件不同，J 和 C 就不同：环境越暗，J 反而变大（感知对比度降低，中间调显得更浅），C 变小（没那么鲜艳）。白点固定为 D65，背景为中灰。白色的 C 不是 0，因为人眼对环境光的适应度 D 小于 1（适应不完全）。
      </p>
    </demo-section>

    <demo-section
      title="CAM16-UCS 色相环 vs OKLCH 色相环"
      desc="CAM16-UCS 把 CAM16 的 J、M、h 变换成一个近似均匀的笛卡尔空间（J'、a'、b'）。这里固定 J' 和 M'（即色度半径），每 30° 取一个色相。OKLCH 是 2020 年提出的更简单的近似。两个环的 Lab L* 并不完全相同，而且部分色相会超出 sRGB 色域（斜线格）。"
    >
      <div class="demo-controls">
        <label>
          CAM16-UCS J'
          <input v-model.number="jp" type="range" min="20" max="90">
          <span class="demo-code">{{ jp }}</span>
        </label>
        <label>
          M'
          <input v-model.number="mp" type="range" min="0" max="45">
          <span class="demo-code">{{ mp }}</span>
        </label>
        <label>
          OKLCH L
          <input v-model.number="okL" type="range" min="0.3" max="0.95" step="0.01">
          <span class="demo-code">{{ okL.toFixed(2) }}</span>
        </label>
        <label>
          C
          <input v-model.number="okC" type="range" min="0" max="0.25" step="0.005">
          <span class="demo-code">{{ okC.toFixed(3) }}</span>
        </label>
      </div>
      <demo-canvas title="CAM16-UCS" :width="RING_W" :height="RING_H" :draw="camRing"/>
      <demo-canvas title="OKLCH" :width="RING_W" :height="RING_H" :draw="okRing"/>
    </demo-section>

    <demo-section
      title="HDR 的传递函数：sRGB、PQ、HLG"
      desc="sRGB 的编码值是相对的：255 就是这块屏幕的最亮（常见 80~200 cd/m²）。HDR 需要表示 1000 甚至 10000 cd/m² 的高光，8 位的 sRGB 曲线不够用。PQ（SMPTE ST 2084）按人眼对亮度的敏感度设计，直接编码 0~10000 cd/m² 的绝对亮度，100 cd/m² 约对应 0.508、1000 cd/m² 约对应 0.752；HLG 则是相对亮度的混合曲线（暗部类似 gamma，亮部用对数），不依赖绝对亮度。"
    >
      <div class="demo-controls">
        <label>
          sRGB 参考白
          <select v-model.number="sdrWhite">
            <option :value="80">80 cd/m²</option>
            <option :value="100">100 cd/m²</option>
            <option :value="203">203 cd/m²</option>
          </select>
        </label>
        <label>
          HLG 显示峰值
          <select v-model.number="hlgPeak">
            <option :value="1000">1000 cd/m²</option>
            <option :value="4000">4000 cd/m²</option>
          </select>
        </label>
      </div>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="transfer"/>
    </demo-section>

    <demo-section
      title="Jzazbz 与 ICtCp：为 HDR 设计的色彩空间"
      desc="CIELAB 是在 100 cd/m² 左右的显示条件下拟合的，到了 HDR 的高亮度就不再均匀。Jzazbz（2017）和 ICtCp（BT.2100）都以 PQ 为基础，直接使用绝对亮度。选一个颜色和显示器峰值亮度，查看它的坐标。这里把颜色当作 sRGB 白色等于峰值亮度的显示，并不是真实的 HDR 内容。"
    >
      <div class="demo-controls">
        <label>
          峰值白亮度
          <select v-model.number="peak">
            <option :value="100">100 cd/m²</option>
            <option :value="1000">1000 cd/m²</option>
            <option :value="4000">4000 cd/m²</option>
          </select>
        </label>
        <span class="demo-swatch" :style="{background: color}"/>
      </div>
      <table class="cam-table">
        <thead>
          <tr>
            <th/>
            <th>Jz</th>
            <th>az</th>
            <th>bz</th>
            <th>Cz</th>
            <th>hz</th>
            <th>I</th>
            <th>Ct</th>
            <th>Cp</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in [hdr, hdrWhite]" :key="i">
            <th>{{ i === 0 ? '所选颜色' : '白色' }}</th>
            <td>{{ row.jz.jz.toFixed(4) }}</td>
            <td>{{ row.jz.az.toFixed(4) }}</td>
            <td>{{ row.jz.bz.toFixed(4) }}</td>
            <td>{{ row.jz.cz.toFixed(4) }}</td>
            <td>{{ row.jz.hz.toFixed(1) }}°</td>
            <td>{{ row.ictcp.i.toFixed(4) }}</td>
            <td>{{ row.ictcp.ct.toFixed(4) }}</td>
            <td>{{ row.ictcp.cp.toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="cam-note">
        峰值亮度升高时，同一个 sRGB 颜色对应的绝对亮度升高，Jz 和 I 随之增大。Ct、Cp 是 ICtCp 的蓝黄、红绿色差分量，白色接近 0。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cam-note {
  max-width: 900px;
  margin: 6px 0 8px;
  font-size: 13px;
  line-height: 21px;
  color: #444;
}
.cam-table {
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 4px 12px;
    border: 1px solid #DDDEE4;
    background: #FFF;
    font-family: Consolas, menlo, monaco, monospace;
  }
  td {
    text-align: right;
  }
  th {
    text-align: left;
  }
  .cam-current {
    th,
    td {
      background: #EDF4FE;
    }
  }
}
</style>
