<script setup lang="ts">
import {reactive, ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {GAMUTS} from '../utils/cie';
import {CIE_WIDTH, CIE_HEIGHT, CieState, PointInfo, drawCie, describePoint} from '../composables/cie';

interface PickEvent {
  x: number;
  y: number;
  color: string;
}

const state = reactive<CieState>({
  gamuts: {srgb: true, p3: true, rec2020: true},
  planckian: true,
  selected: null
});
const info = ref<PointInfo | null>(null);

const draw = (ctx: CanvasRenderingContext2D) => {
  drawCie(ctx, state);
};

const onPick = ({x, y}: PickEvent) => {
  const result = describePoint(x, y);
  info.value = result;
  state.selected = [result.x, result.y];
};
</script>

<template>
  <demo-page>
    <demo-section
      title="CIE 1931 色度图"
      desc="马蹄形是人眼可见的全部色度；三角形是显示器能呈现的色域（三个顶点是它的红、绿、蓝原色）；红色曲线是黑体辐射随温度变化的颜色轨迹。图中的颜色只是示意：屏幕本身无法显示色域外的颜色，所以边缘处的颜色比真实的单色光淡。点击图中任意位置查看坐标。"
    >
      <div class="demo-controls">
        <label
          v-for="g in GAMUTS"
          :key="g.key"
        >
          <input v-model="state.gamuts[g.key]" type="checkbox">
          <span :style="{color: g.color}">{{ g.label }}</span>
        </label>
        <label>
          <input v-model="state.planckian" type="checkbox">
          <span>黑体轨迹（色温）</span>
        </label>
      </div>
      <demo-canvas
        :width="CIE_WIDTH"
        :height="CIE_HEIGHT"
        :draw="draw"
        @pick="onPick"
      />
      <div v-if="info" class="cie-info">
        <span class="demo-swatch" :style="{background: info.hex}"/>
        <code class="demo-code">{{ info.hex }}</code>
        <p>x = {{ info.x.toFixed(4) }}，y = {{ info.y.toFixed(4) }}</p>
        <p>{{ info.visible ? '在人眼可见范围内' : '在马蹄形之外：不对应任何真实的颜色' }}</p>
        <p
          v-for="g in info.gamuts"
          :key="g.label"
        >
          {{ g.label }}：{{ g.inside ? '在色域内' : '在色域外' }}
        </p>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.cie-info {
  display: inline-block;
  vertical-align: top;
  width: 260px;
  font-size: 14px;
  line-height: 24px;
}
</style>
