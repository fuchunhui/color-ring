<script setup lang="ts">
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  CARD_W,
  CARD_H,
  TIMELINE_W,
  TIMELINE_H,
  drawNewton,
  drawGoethe,
  drawRunge,
  drawChevreul,
  drawMunsell,
  drawOstwald,
  drawItten,
  drawModern,
  drawTimeline
} from '../composables/wheelhistory';

const cards = [
  {
    key: 'newton',
    title: '牛顿 · 1704',
    idea: '白光经棱镜分成红橙黄绿蓝靛紫七色，首次把光谱首尾相接成环。各扇形大小不相等，依据多利亚调式的音程比例。混色用“重心”法：按各色的量求重心，重心的位置给出混合色的色相，离圆心越近越白。',
    draw: drawNewton
  },
  {
    key: 'goethe',
    title: '歌德 · 1810',
    idea: '歌德从观察颜色的心理效应出发，画出对称的六色环：红紫在上，黄与蓝居两侧，橙、紫、绿居于其间。正对面的颜色互相唤起，这个思路后来被赫林的对立色理论所呼应。',
    draw: drawGoethe
  },
  {
    key: 'runge',
    title: '龙格色球 · 1810',
    idea: '画家龙格把颜色排成一个球：赤道上是纯色的色相，北极是白，南极是黑，从赤道向两极分别掺白、掺黑。这是后来许多色立体的原型。',
    draw: drawRunge,
    tall: true
  },
  {
    key: 'chevreul',
    title: '谢弗勒尔 · 1839',
    idea: '化学家谢弗勒尔在研究染色时总结出同时对比定律（1839 年著作）：颜色倾向于朝相邻颜色的补色方向偏移，色相和明暗都会受影响。他的色环把色相分得很细，这里用 72 等分示意。',
    draw: drawChevreul
  },
  {
    key: 'munsell',
    title: '孟塞尔 · 约 1905',
    idea: '孟塞尔用色相、明度、彩度三个独立的维度描述颜色，并以视觉上等间隔为原则。10 个主色相是 R、YR、Y、GY、G、BG、B、PB、P、RP。',
    draw: drawMunsell
  },
  {
    key: 'ostwald',
    title: '奥斯特瓦尔德 · 约 1916',
    idea: '化学家奥斯特瓦尔德把颜色排成双锥体：24 个色相环绕黑白轴，每个色相是一个由白、黑、纯色三点构成的三角形，其中任一颜色都由这三者按比例混合而成。',
    draw: drawOstwald,
    tall: true
  },
  {
    key: 'itten',
    title: '伊登 · 约 1961',
    idea: '伊登以黄、红、蓝为三原色，建立 12 色环，并围绕它讲授对比与和谐的七种对比。这也是本站“伊登十二色环”页的内容。',
    draw: drawItten
  },
  {
    key: 'modern',
    title: '今天：HSV 与 OKLCH',
    idea: '现代软件里的色环多半是 HSV / HSL 的色相环，按 RGB 的数学关系排列；感知均匀的 OKLCH 则让每个色相的亮度一致。二者的色相次序相同，但明暗分布大不一样。',
    draw: drawModern
  }
];
</script>

<template>
  <demo-page>
    <demo-section
      title="色环简史：三百年来人们怎样把颜色排成一圈"
      desc="从牛顿到今天，每一种色环或色立体背后都有不同的问题意识：光、心理、绘画、染织、测色。下面每个小图都是按文字描述重新绘制的示意，色块是近似重建，不是原作的复制，也不是历史上的色值；年份中带“约”的为大致年代。"
    >
      <demo-canvas title="时间线" :width="TIMELINE_W" :height="TIMELINE_H" :draw="drawTimeline"/>
    </demo-section>

    <demo-section title="各家色环 / 色立体">
      <div class="wh-grid">
        <div v-for="c in cards" :key="c.key" class="wh-card">
          <demo-canvas :title="c.title" :width="CARD_W" :height="CARD_H" :draw="c.draw"/>
          <p class="wh-idea">
            {{ c.idea }}
          </p>
        </div>
      </div>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.wh-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.wh-card {
  width: 260px;
  margin-bottom: 8px;
  .demo-canvas {
    margin: 0;
  }
}
.wh-idea {
  margin-top: 6px;
  font-size: 12px;
  line-height: 19px;
  color: #666;
}
</style>
