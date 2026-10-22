<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {deltaE76, deltaE94, deltaE2000} from '../utils/deltae';
import {hexToLab, levelOf, DIRECTIONS, buildSteps, buildPairs} from '../composables/deltae';

const colorA = ref('#4F81BD');
const colorB = ref('#5A86B8');
const labA = computed(() => hexToLab(colorA.value));
const labB = computed(() => hexToLab(colorB.value));
const results = computed(() => [
  {name: 'ΔE76（Lab 欧氏距离）', value: deltaE76(labA.value, labB.value)},
  {name: 'ΔE94（图形艺术）', value: deltaE94(labA.value, labB.value)},
  {name: 'ΔE2000', value: deltaE2000(labA.value, labB.value)}
]);
const level = computed(() => levelOf(results.value[2].value));
const fmt = (lab: number[]) => lab.map(v => v.toFixed(1)).join(', ');

const baseColor = ref('#5B8DB8');
const direction = ref('lighter');
const steps = computed(() => buildSteps(baseColor.value, direction.value));

const pairs = buildPairs();
</script>

<template>
  <demo-page>
    <demo-section
      title="两个颜色差多少"
      desc="色差公式把两个颜色的距离换成一个数字。ΔE76 就是 Lab 空间里的直线距离；ΔE94 和 ΔE2000 在此基础上按亮度、色度、色相分别加权，并修正蓝色区域和灰色附近的偏差，更接近人眼的感受。下面的等级只按 ΔE2000 给出，属于经验说法，具体取决于观察条件。"
    >
      <div class="demo-controls">
        <label>
          颜色 A
          <input v-model="colorA" type="color">
          <span class="demo-code">{{ colorA.toUpperCase() }}</span>
        </label>
        <label>
          颜色 B
          <input v-model="colorB" type="color">
          <span class="demo-code">{{ colorB.toUpperCase() }}</span>
        </label>
      </div>
      <div class="deltae-pair">
        <div class="deltae-block" :style="{background: colorA}"/>
        <div class="deltae-block" :style="{background: colorB}"/>
        <table class="deltae-table">
          <tbody>
            <tr>
              <th>Lab A</th>
              <td class="demo-code">
                {{ fmt(labA) }}
              </td>
            </tr>
            <tr>
              <th>Lab B</th>
              <td class="demo-code">
                {{ fmt(labB) }}
              </td>
            </tr>
            <tr v-for="item in results" :key="item.name">
              <th>{{ item.name }}</th>
              <td class="demo-code">
                {{ item.value.toFixed(2) }}
              </td>
            </tr>
            <tr>
              <th>按 ΔE2000 判断</th>
              <td>{{ level }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </demo-section>

    <demo-section
      title="刚好能分辨的色差阵列"
      desc="以基色为起点，沿所选方向移动，用二分法找出 ΔE2000 恰好为 0.5、1、2、3、5、10 的颜色。ΔE 小于 1 时多数人在并排比较时也难以察觉。虚线框表示该颜色超出了 sRGB 色域，屏幕上显示的是被截断后的近似色，实际色差会比标注的小。"
    >
      <div class="demo-controls">
        <label>
          基色
          <input v-model="baseColor" type="color">
          <span class="demo-code">{{ baseColor.toUpperCase() }}</span>
        </label>
        <label>
          移动方向
          <select v-model="direction">
            <option v-for="d in DIRECTIONS" :key="d.key" :value="d.key">
              {{ d.label }}
            </option>
          </select>
        </label>
      </div>
      <div class="deltae-steps">
        <div class="deltae-step">
          <div class="deltae-swatch" :style="{background: baseColor}"/>
          <p>基色</p>
          <p class="demo-code">
            ΔE 0
          </p>
        </div>
        <div v-for="s in steps" :key="s.target" class="deltae-step">
          <div
            :class="['deltae-swatch', {'deltae-swatch-out': !s.inGamut}]"
            :style="{background: s.hex}"
          />
          <p>ΔE00 = {{ s.target }}</p>
          <p class="demo-code">
            {{ s.hex }}
          </p>
          <p v-if="!s.inGamut" class="deltae-out">
            超出 sRGB
          </p>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="ΔE76 为什么不够好"
      desc="下面每一对颜色在 Lab 里的直线距离（ΔE76）都恰好是 10，但 ΔE94、ΔE2000 给出的数字很不一样：Lab 并不是完美的感知均匀空间，高饱和区的 Lab 距离被放大了，ΔE2000 通过对色度、色相的加权把它压了下来。颜色块的 hex 经过取整，重新测量会有小的误差。"
    >
      <table class="deltae-table deltae-compare">
        <thead>
          <tr>
            <th>场景</th>
            <th>颜色对</th>
            <th>ΔE76</th>
            <th>ΔE94</th>
            <th>ΔE2000</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pairs" :key="p.name">
            <td>{{ p.name }}</td>
            <td>
              <span class="deltae-chip" :style="{background: p.hexA}"/>
              <span class="deltae-chip" :style="{background: p.hexB}"/>
            </td>
            <td class="demo-code">
              {{ p.de76.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ p.de94.toFixed(2) }}
            </td>
            <td class="demo-code">
              {{ p.de2000.toFixed(2) }}
            </td>
            <td>{{ p.note }}</td>
          </tr>
        </tbody>
      </table>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.deltae-pair {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.deltae-block {
  width: 140px;
  height: 140px;
  border: 1px solid #DDDEE4;
}
.deltae-table {
  border-collapse: collapse;
  font-size: 13px;
  background: #FFF;
  th,
  td {
    padding: 6px 12px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
  th {
    font-weight: 500;
    background: #F5F6FA;
  }
}
.deltae-compare td {
  vertical-align: middle;
}
.deltae-chip {
  display: inline-block;
  width: 36px;
  height: 36px;
  border: 1px solid #DDDEE4;
  vertical-align: middle;
}
.deltae-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.deltae-step {
  width: 104px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}
.deltae-swatch {
  height: 84px;
  border: 1px solid #DDDEE4;
  &-out {
    border: 2px dashed #E03131;
  }
}
.deltae-out {
  color: #E03131;
}
</style>
