<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {MODELS, runCamera} from '../utils/camera';
import type {ModelKey} from '../utils/camera';
import {
  SENS_W,
  SENS_H,
  PATCH_W,
  PATCH_H,
  BAR_W,
  BAR_H,
  makeSensitivityDraw,
  makePatchDraw,
  makeBarDraw
} from '../composables/cameraccm';

const t = ref(1);
const model = ref<ModelKey>('m33');
const illum = ref<'D65' | 'A'>('D65');

const result = computed(() => runCamera(t.value, illum.value));
const resultA = computed(() => runCamera(t.value, 'A'));
const evalA = (): boolean => illum.value === 'A';

const drawSens = makeSensitivityDraw(() => t.value);
const drawPatches = makePatchDraw(() => result.value, () => model.value, evalA);
const drawBars = makeBarDraw(() => result.value, evalA);

const fmt = (v: number): string => v.toFixed(2);
</script>

<template>
  <demo-page>
    <demo-section
      title="相机的颜色为什么需要一个矩阵"
      desc="相机的三个通道对波长的灵敏度和人眼的颜色匹配函数不一样。如果它们恰好是匹配函数的线性组合（Luther 条件），一个 3×3 矩阵就能把相机的原始 RGB 精确换算成真实颜色；否则不同光谱的物体会被相机判成同一个 RGB，或者反过来，这时候矩阵只能尽量逼近。下面把偏离程度做成滑块：0 表示满足 Luther 条件，1 表示接近真实传感器那种又宽又重叠的灵敏度。"
    >
      <div class="demo-controls">
        <label>
          偏离 CIE 程度
          <input v-model.number="t" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ t.toFixed(2) }}</span>
        </label>
      </div>
      <demo-canvas :width="SENS_W" :height="SENS_H" :draw="drawSens"/>
      <p class="cam-note">
        说明：24 个色块用的是常被引用的 ColorChecker 近似 sRGB 值，反射光谱是我为每个色块拟合的一条平滑的 sigmoid 曲线（使它在 D65 下的颜色与目标一致），不是实测光谱；相机灵敏度也是示意曲线。
        拟合后 24 块在 D65 下的颜色误差为 {{ fmt(result.patchFitMean) }}（平均）/ {{ fmt(result.patchFitMax) }}（最大）ΔE2000。
      </p>
    </demo-section>

    <demo-section
      title="拟合矩阵后的 24 色块"
      desc="先做白平衡（让白块三通道相等），再用最小二乘拟合一个把相机 RGB 变成线性 sRGB 的矩阵：3×3，加上偏移的 3×4，或者二阶多项式 3×10。24 个色块只有 72 个数据点，10 项多项式（30 个参数）很容易过拟合，在训练色块上的误差看起来最好，换一批物体就不一定了。"
    >
      <div class="demo-controls">
        <label>
          校正方式
          <select v-model="model">
            <option v-for="m in MODELS.filter(x => x.key !== 'wb')" :key="m.key" :value="m.key">{{ m.label }}</option>
          </select>
        </label>
        <label>
          拍摄光源
          <select v-model="illum">
            <option value="D65">D65 日光（和拟合时相同）</option>
            <option value="A">A 光源 2856K 钨丝灯（拟合时用的是 D65）</option>
          </select>
        </label>
      </div>
      <demo-canvas :width="PATCH_W" :height="PATCH_H" :draw="drawPatches"/>
      <demo-canvas :width="BAR_W" :height="BAR_H" :draw="drawBars"/>
    </demo-section>

    <demo-section
      title="换了光源，矩阵就不灵了"
      desc="矩阵是在 D65 下拟合的。换成钨丝灯再拍，如果还用同一个矩阵，误差明显更大（同色异谱失效：相机和人眼对光谱的“权重”不同，光源一变，两者对不同色块的判断就分道扬镳）。重新在 A 光源下拟合一个矩阵会好很多，所以相机里有按色温切换的多组矩阵。参考真值用 Bradford 色适应换算；白平衡增益发生在相机 RGB 空间，与 Bradford 不完全等价，所以即使 t = 0 在 A 光源下也有一点误差。"
    >
      <table class="cam-table">
        <thead>
          <tr>
            <th>方式</th>
            <th>参数个数</th>
            <th>D65 下拟合（平均 / 最大）</th>
            <th>A 光源下用 D65 矩阵（平均 / 最大）</th>
            <th>A 光源下重新拟合（平均 / 最大）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in resultA.atD65" :key="m.key">
            <td>{{ m.label }}</td>
            <td>{{ m.params }}</td>
            <td>{{ fmt(m.mean) }} / {{ fmt(m.max) }}</td>
            <td>{{ fmt(resultA.atEval[i].mean) }} / {{ fmt(resultA.atEval[i].max) }}</td>
            <td>{{ fmt(resultA.refitAtEval[i].mean) }} / {{ fmt(resultA.refitAtEval[i].max) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="cam-note">
        ΔE2000 小于 1 时多数人很难看出差别。上表固定用 A 光源比较，与上面的“拍摄光源”下拉框无关。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cam-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
.cam-table {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 6px 12px;
    border: 1px solid #E5E6EB;
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
}
</style>
