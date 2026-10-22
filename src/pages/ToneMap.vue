<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {makeHdrScene} from '../utils/scene';
import {DrawFn, OPERATORS, drawToneMapped, drawCurves, drawRamps} from '../composables/tonemap';

const TILE_W = 240;
const TILE_H = 180;
const hdr = makeHdrScene(TILE_W, TILE_H);

const ev = ref(0);
const byLuminance = ref(false);

const tiles = OPERATORS.map(op => {
  const draw: DrawFn = ctx => {
    drawToneMapped(ctx, hdr, op.fn, ev.value, byLuminance.value);
  };
  return {key: op.key, title: op.label, draw};
});

const curves = computed(() => drawCurves(ev.value));
const ramps = computed(() => drawRamps(ev.value));
const evTip = computed(() => `${ev.value > 0 ? '+' : ''}${ev.value} EV`);
</script>

<template>
  <demo-page>
    <demo-section
      title="同一个 HDR 场景，五种色调映射"
      desc="真实场景的亮度范围远超屏幕：这个场景里窗外的太阳达到 600，室内的阴影只有 0.002，而屏幕只能表示 0~1。直接截断会让所有大于 1 的地方变成一片死白；色调映射用一条压缩曲线，把宽广的亮度范围收进屏幕，同时尽量保留高光和暗部的层次。拖动曝光滑块（单位 EV，每加一档亮度翻倍）观察各算子在不同曝光下的表现。"
    >
      <div class="demo-controls">
        <label>
          曝光
          <input v-model.number="ev" type="range" min="-6" max="6" step="0.5">
          <span class="demo-code">{{ evTip }}</span>
        </label>
        <label>
          <input v-model="byLuminance" type="checkbox">
          只映射亮度（保持色相），否则按 R、G、B 通道分别映射
        </label>
      </div>
      <demo-canvas
        v-for="tile in tiles"
        :key="tile.key"
        :title="tile.title"
        :width="TILE_W"
        :height="TILE_H"
        :draw="tile.draw"
      />
    </demo-section>

    <demo-section
      title="色相偏移：按通道映射 vs 只映射亮度"
      desc="场景左下角的两排色块分别是橙色和蓝色，每排从左到右强度依次放大 4 倍。按通道映射时，最亮的红通道最先被压到 1，其余通道还在上升，所以越亮的橙色越往黄、白偏，蓝色则向青白偏；这是胶片和多数相机输出的“高光变白”的来源。勾选“只映射亮度”后，RGB 按亮度压缩比例同步缩放，色相保持不变，但高饱和色可能因此超出 1 被截掉，需要额外的色域处理。"
    />

    <demo-section
      title="映射曲线与亮度斜坡"
      desc="左图是各算子把场景亮度（横轴）映射到屏幕亮度（纵轴）的曲线：截断在 1 处突然拐折，Reinhard 逐渐趋近 1 但永远到不了，ACES 和 Hable 带有 S 形的肩部和趾部，暗部更深、对比更高。下图把亮度从 2^-8 到 2^8（共 16 档）排成一条斜坡，每个算子一行，截断那一行从 0 EV 起全白，说明高光信息全部丢失。"
    >
      <demo-canvas :width="700" :height="300" :draw="curves"/>
      <demo-canvas :width="700" :height="240" :draw="ramps"/>
    </demo-section>
  </demo-page>
</template>
