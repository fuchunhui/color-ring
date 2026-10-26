<script setup lang="ts">
import {ref} from 'vue';
import {DemoCanvas, DemoPage, DemoSection} from '../components/demo';
import {
  PLOT_W,
  PLOT_H,
  ZONE_W,
  ZONE_H,
  CAPTURE_W,
  CAPTURE_H,
  drawStopsPlot,
  drawZones,
  makeCaptureDraw
} from '../composables/logcurve';

const ev = ref(0);
const drawCapture = makeCaptureDraw(() => ev.value);
</script>

<template>
  <demo-page>
    <demo-section
      title="为什么要有 Log 曲线"
      desc="横轴是相对 18% 中灰的档数（每加一档，光量翻倍），纵轴是编码值。sRGB 和 Rec.709 把光量取 0.45 或 1/2.4 次方，高光以上直接顶到 1.0；S-Log3、LogC3 则是对数曲线：每增加一档，编码值增加几乎相同的量，所以往上留出十几档的空间。PQ 是为 HDR 显示设计的绝对亮度曲线，这里把 1.0 当作 100 cd/m² 的参考白，仅作对照。"
    >
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawStopsPlot"/>
      <p class="log-note">
        原因：对数的“乘法变加法”。光量每翻一倍（一档），log2 加 1，所以相同的光比对应相同的编码步长。人眼和胶片对亮度的响应也近似按比例，因此对数编码在把有限的码值分给各档时最公平。代价是画面看起来又平又灰，必须在后期还原。
      </p>
    </demo-section>

    <demo-section
      title="Zone System：把明暗分成 11 档"
      desc="Zone System 把从纯黑（0）到纯白（X）分成 11 个区，相邻两区差一档，Zone V 是 18% 中灰。下面把每个区的线性光值送进各条曲线，看编码值落在哪里。红字表示线性光超过 1.0，在 sRGB、Rec.709 这类以 1.0 为白的显示参考曲线里被截断，在 Log 曲线里却还有富余。"
    >
      <demo-canvas :width="ZONE_W" :height="ZONE_H" :draw="drawZones"/>
      <p class="log-note">
        S-Log3 和 LogC3 记录的是场景参考的光量，1.0 并不是上限；LogC3 的 1.0 只占编码范围的 57%，因此能容纳远超“白”的高光。
      </p>
    </demo-section>

    <demo-section
      title="同一个 HDR 场景，三种拍法"
      desc="场景里有太阳（线性值约 600）、窗外的天空、室内暗部和一排按亮度递增的灰条。左：直接按 Rec.709 记录，凡是线性光超过 1 的部分全部截断成白色。中：S-Log3 记录，高光被保住，但画面发灰。右：把 S-Log3 的码值用一条 S 曲线拉开对比，得到可看的画面。S 曲线只是示意，不是任何厂商的 LUT。拖动曝光，看 Rec.709 的高光截断怎样蔓延，而 Log 里还留着细节。"
    >
      <div class="demo-controls">
        <label>
          曝光
          <input v-model.number="ev" type="range" min="-4" max="4" step="0.5">
          <span class="demo-code">{{ ev > 0 ? '+' : '' }}{{ ev.toFixed(1) }} EV</span>
        </label>
      </div>
      <demo-canvas :width="CAPTURE_W" :height="CAPTURE_H" :draw="drawCapture"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.log-note {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 20px;
  color: #666;
}
</style>
