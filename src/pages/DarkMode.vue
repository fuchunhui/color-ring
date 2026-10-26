<script setup lang="ts">
import {DemoPage, DemoSection} from '../components/demo';
import {PAIRS, buildPalette, ratio} from '../utils/darkmode';
import type {Method} from '../utils/darkmode';

interface Panel {
  key: Method;
  label: string;
  note: string;
  colors: Record<string, string>;
}

const METHODS: {key: Method; label: string; note: string}[] = [
  {key: 'light', label: '原始浅色', note: '设计稿的浅色主题'},
  {key: 'invert', label: 'a. RGB 反色', note: '255 − x'},
  {key: 'invertHue', label: 'b. 反色 + 色相旋转 180°', note: '等价于 filter: invert(1) hue-rotate(180deg)'},
  {key: 'oklch', label: 'c. OKLCH 亮度取反', note: 'L′ = 1 − L，色相不变'},
  {key: 'designed', label: 'd. 设计过的映射', note: '深灰底、强调色抬亮度，并按对比度校正'}
];

const panels: Panel[] = METHODS.map(m => ({...m, colors: buildPalette(m.key)}));

const vars = (colors: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  Object.keys(colors).forEach(key => {
    out[`--dm-${key}`] = colors[key];
  });
  return out;
};

const cell = (panel: Panel, fg: string, bg: string) => ratio(panel.colors[fg], panel.colors[bg]);

const BARS = [
  [60, 40, 75, 50],
  [80, 55, 45, 70],
  [50, 90, 60, 35]
];
</script>

<template>
  <demo-page>
    <demo-section
      title="深色模式转换：反色为什么不行"
      desc="同一套界面，用四种办法生成深色主题。a 直接 RGB 取反，黑白对调了，但所有彩色都变成了补色（蓝按钮变橙色）；b 在反色后再把色相转 180°，色相大致回来了，但整体明暗关系仍被机械翻转；c 在 OKLCH 里只翻转感知亮度、保持色相，颜色对了，但深色和浅色的对比度并不对称，文字与背景的对比度常常掉下来；d 是设计出来的映射：背景用很暗的灰，强调色保持色相、抬高亮度并略微降饱和，最后对每一对前景 / 背景用二分法调整亮度，直到达到 WCAG 的对比度目标（文字 4.5，图表和控件 3）。"
    >
      <div class="dm-panels">
        <div v-for="p in panels" :key="p.key" class="dm-panel">
          <div class="dm-panel-title">
            {{ p.label }}
          </div>
          <div class="dm-panel-note">
            {{ p.note }}
          </div>
          <div class="dm-ui" :style="vars(p.colors)">
            <div class="dm-card">
              <div class="dm-title">
                本月概览
              </div>
              <p class="dm-text">
                新增用户 128 人，同比增长 12%。
              </p>
              <p class="dm-muted">
                数据更新于 10 分钟前
              </p>
              <a class="dm-link">查看详细报表</a>
              <div class="dm-buttons">
                <span class="dm-primary">确认</span>
                <span class="dm-secondary">取消</span>
              </div>
              <div class="dm-alert">
                库存不足，请尽快补货。
              </div>
              <div class="dm-chart">
                <div v-for="(group, gi) in BARS" :key="gi" class="dm-group">
                  <i v-for="(v, si) in group" :key="si" :class="`dm-s${si + 1}`" :style="{height: `${v}%`}"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="对比度检查表"
      desc="每个格子是该方法下前景与背景的 WCAG 对比度。绿色表示达到目标（正文类 4.5，图表系列 3），红色表示不达标。设计过的映射一列后面的括号里，是原来浅色主题的对比度。可以看到，机械的反色在不少配对上并没有保证可读性，而设计映射因为是“按目标反推亮度”，每一项都达标。"
    >
      <table class="dm-table">
        <thead>
          <tr>
            <th>配对</th>
            <th>目标</th>
            <th v-for="p in panels" :key="p.key">
              {{ p.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pair in PAIRS" :key="pair.key">
            <td>{{ pair.label }}</td>
            <td class="demo-code">
              {{ pair.target }}
            </td>
            <td
              v-for="p in panels"
              :key="p.key"
              class="demo-code"
              :class="cell(p, pair.fg, pair.bg) >= pair.target ? 'dm-pass' : 'dm-fail'"
            >
              {{ cell(p, pair.fg, pair.bg).toFixed(2) }}<template v-if="p.key === 'designed'">（原 {{ cell(panels[0], pair.fg, pair.bg).toFixed(2) }}）</template>
            </td>
          </tr>
        </tbody>
      </table>
    </demo-section>

    <demo-section title="设计上的几点经验（指导性建议，不是标准）">
      <p class="dm-guide">
        纯黑（#000）背景在 OLED 屏上最省电，但滚动时亮的文字拖出“拖影”（黑色像素从关到开响应慢），而且黑底配纯白字对比度过高、容易产生光晕（halation），长时间阅读更累。很多设计体系因此用很深的灰（亮度约 10% 到 20%）做页面底色，文字用略低于纯白的灰白。
      </p>
      <p class="dm-guide">
        深色界面里常用“越靠近用户的层越亮”表示层级（elevation）：页面底最暗，卡片更亮一点，浮层再亮一点，而不是浅色主题里用阴影。本页的卡片比页面背景亮一档，边框和次按钮再亮一档，就是这个思路。强调色在深色背景上要抬高亮度、降低一点饱和度，否则会显得刺眼并产生视觉振动。
      </p>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.dm-panels {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.dm-panel {
  width: 250px;
  &-title {
    font-size: 13px;
    font-weight: bold;
  }
  &-note {
    height: 32px;
    font-size: 12px;
    line-height: 16px;
    color: #888;
  }
}
.dm-ui {
  padding: 12px;
  background: var(--dm-bg);
  border: 1px solid #DDDEE4;
  .dm-card {
    padding: 12px;
    background: var(--dm-surface);
    border: 1px solid var(--dm-border);
    border-radius: 6px;
  }
  .dm-title {
    margin-bottom: 6px;
    font-size: 15px;
    font-weight: bold;
    color: var(--dm-text);
  }
  .dm-text {
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--dm-text);
  }
  .dm-muted {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--dm-muted);
  }
  .dm-link {
    font-size: 13px;
    color: var(--dm-link);
    text-decoration: underline;
  }
  .dm-buttons {
    display: flex;
    gap: 8px;
    margin: 10px 0;
  }
  .dm-primary,
  .dm-secondary {
    padding: 5px 14px;
    font-size: 13px;
    border-radius: 4px;
  }
  .dm-primary {
    background: var(--dm-primary);
    color: var(--dm-primaryText);
  }
  .dm-secondary {
    background: var(--dm-secondary);
    color: var(--dm-secondaryText);
  }
  .dm-alert {
    padding: 6px 8px;
    font-size: 12px;
    background: var(--dm-alertBg);
    color: var(--dm-alertText);
    border-radius: 4px;
  }
  .dm-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 70px;
    margin-top: 10px;
  }
  .dm-group {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 100%;
    i {
      display: block;
      width: 14px;
    }
  }
  .dm-s1 {
    background: var(--dm-s1);
  }
  .dm-s2 {
    background: var(--dm-s2);
  }
  .dm-s3 {
    background: var(--dm-s3);
  }
  .dm-s4 {
    background: var(--dm-s4);
  }
}
.dm-table {
  border-collapse: collapse;
  font-size: 12px;
  th, td {
    border: 1px solid #DDDEE4;
    padding: 5px 10px;
    text-align: left;
    background: #FFF;
  }
  .dm-pass {
    color: #188038;
  }
  .dm-fail {
    color: #C5221F;
    background: #FCE8E6;
  }
}
.dm-guide {
  max-width: 900px;
  margin: 4px 0 8px;
  font-size: 13px;
  line-height: 21px;
  color: #666;
}
</style>
