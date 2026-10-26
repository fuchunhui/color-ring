<script setup lang="ts">
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  SENS_W,
  SENS_H,
  SCENE_W,
  SCENE_H,
  MANTIS_W,
  MANTIS_H,
  drawSensitivity,
  drawView,
  drawMantis
} from '../composables/animals';

const views = [
  {title: '人眼', draw: drawView('human')},
  {title: '狗（二色视觉）', draw: drawView('dog')},
  {title: '蜜蜂（假色）', draw: drawView('bee')},
  {title: '鸟类（假色）', draw: drawView('bird')},
  {title: '蜜蜂的紫外通道（灰度）', draw: drawView('uv')}
];
</script>

<template>
  <demo-page>
    <demo-section
      title="不同动物的感光细胞"
      desc="视觉由感光细胞的光谱灵敏度决定。人有三类视锥（S、M、L）；狗只有两类，所以是二色视觉；蜜蜂的三类感光器整体向紫外移动（UV、蓝、绿）；鸟类有四类，多出一类紫外或紫光视锥；螳螂虾有 12 类通道。曲线用 Govardovskii 等（2000）的视色素模板按峰值波长生成，人眼再乘上晶状体对紫外的吸收；螳螂虾的 12 条曲线只是等宽的示意峰，峰值位置不代表某个具体物种。"
    >
      <demo-canvas :width="SENS_W" :height="SENS_H" :draw="drawSensitivity"/>
    </demo-section>

    <demo-section
      title="同一朵花，不同眼睛"
      desc="下面这朵黄花的花瓣外圈反射紫外，内圈吸收紫外，对人眼来说两处都是同一种黄色，但蜜蜂看到的是靶心图案，这是给传粉者指路的“花蜜向导”。每个像素都由合成的反射光谱乘上日光（6500K 黑体，扣除短波紫外）算出，再用各物种的灵敏度曲线积分，并按白纸 = 1 归一化（相当于 von Kries 适应）。反射光谱都是为演示而造的，不是实测数据。"
    >
      <demo-canvas
        v-for="v in views"
        :key="v.title"
        :title="v.title"
        :width="SCENE_W"
        :height="SCENE_H"
        :draw="v.draw"
      />
      <p class="demo-section-desc">
        假色的映射方式：蜜蜂把“绿感光器 → 红、蓝感光器 → 绿、紫外感光器 → 蓝”；鸟类把“L → 红、M → 绿、S 与 UVS 的平均 → 蓝”，所以四个通道被压成了三个，会丢失信息；狗只有蓝—黄一条色轴。
        需要说明：我们无法把人眼看不见的颜色真实地显示出来。蜜蜂和鸟类的图是把多出来的通道“塞进”屏幕的红、绿、蓝里的假色；狗的图是把二色视觉映射到蓝—黄轴上的示意。它们表达的是“哪些区域可以被区分”，而不是动物真正“看到”的主观感受。
      </p>
    </demo-section>

    <demo-section
      title="螳螂虾的 12 个通道"
      desc="螳螂虾有 12 类感光通道，听上去应该能分辨极其细微的颜色差别。但 Thoen 等（2014）的行为实验发现，它们分辨相近颜色的能力反而比人差：它们很可能不是像我们这样比较通道之间的差值，而是把每个通道的响应直接当作“颜色标签”，用来快速识别。下图是同样四种材质在 12 个示意通道上的响应。"
    >
      <demo-canvas :width="MANTIS_W" :height="MANTIS_H" :draw="drawMantis"/>
    </demo-section>
  </demo-page>
</template>
