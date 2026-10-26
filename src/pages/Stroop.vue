<script setup lang="ts">
import {ref, computed, nextTick, onMounted, onBeforeUnmount} from 'vue';
import {DemoPage, DemoSection} from '../components/demo';
import {ColorButton} from '../components/common';
import {COLORS, TRIAL_COUNT, makeTrials, summarize, interference} from '../composables/stroop';
import type {Trial, Result} from '../composables/stroop';

type Stage = 'idle' | 'fixation' | 'stim' | 'blank' | 'done';

const stage = ref<Stage>('idle');
const trials = ref<Trial[]>([]);
const index = ref(0);
const results = ref<Result[]>([]);

let timer = 0;
let frame = 0;
let t0 = 0;
let ready = false;

const current = computed(() => trials.value[index.value]);
const running = computed(() => stage.value !== 'idle' && stage.value !== 'done');

const clearTimers = () => {
  window.clearTimeout(timer);
  window.cancelAnimationFrame(frame);
};

const showStimulus = async () => {
  stage.value = 'stim';
  await nextTick();
  frame = window.requestAnimationFrame(() => {
    t0 = performance.now();
    ready = true;
  });
};

const next = () => {
  index.value += 1;
  if (index.value >= trials.value.length) {
    stage.value = 'done';
    return;
  }
  stage.value = 'fixation';
  timer = window.setTimeout(showStimulus, 500);
};

const start = () => {
  clearTimers();
  trials.value = makeTrials();
  results.value = [];
  index.value = -1;
  ready = false;
  next();
};

const answer = (choice: number) => {
  if (stage.value !== 'stim' || !ready) {
    return;
  }
  const rt = performance.now() - t0;
  ready = false;
  results.value.push({
    trial: current.value,
    rt,
    answer: choice,
    correct: choice === current.value.ink
  });
  stage.value = 'blank';
  timer = window.setTimeout(next, 300);
};

const onKey = (event: KeyboardEvent) => {
  const i = COLORS.findIndex(c => c.key === event.key);
  if (i >= 0) {
    answer(i);
  }
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  clearTimers();
});

const congruent = computed(() => summarize(results.value, true));
const incongruent = computed(() => summarize(results.value, false));
const diff = computed(() => interference(results.value));
const ms = (v: number | null) => (v === null ? '—' : `${Math.round(v)} ms`);
</script>

<template>
  <demo-page>
    <demo-section
      title="Stroop 实验：说出字的墨水颜色，而不是字的意思"
      desc="屏幕上会依次出现“红、绿、蓝、黄”四个字之一，墨水颜色有时和字义一致（红字用红墨水），有时不一致（红字用蓝墨水）。请尽快、尽量准确地选出墨水的颜色：点击下面的按钮，或按键盘 1 / 2 / 3 / 4。共 24 题，一半一致、一半不一致，每题先出现 + 号。"
    >
      <div class="demo-controls">
        <color-button u="primary" :label="stage === 'idle' ? '开始' : '重新开始'" @click="start"/>
        <span v-if="running" class="demo-code">第 {{ index + 1 }} / {{ TRIAL_COUNT }} 题</span>
      </div>
      <div class="stroop-stage">
        <span
          v-if="stage === 'stim' && current"
          class="stroop-word"
          :style="{color: COLORS[current.ink].css}"
        >{{ COLORS[current.word].word }}</span>
        <span v-else-if="stage === 'fixation'" class="stroop-fix">+</span>
        <span v-else-if="stage === 'idle'" class="stroop-hint">点击“开始”</span>
        <span v-else-if="stage === 'done'" class="stroop-hint">做完了，结果见下方</span>
      </div>
      <div class="demo-controls">
        <color-button
          v-for="(c, i) in COLORS"
          :key="c.id"
          :label="`${c.key}  ${c.word}`"
          :disabled="stage !== 'stim'"
          @click="answer(i)"
        />
      </div>
    </demo-section>

    <demo-section v-if="stage === 'done'" title="你的结果">
      <table class="stroop-table demo-code">
        <thead>
          <tr>
            <th>条件</th>
            <th>题数</th>
            <th>平均反应时（仅统计答对的）</th>
            <th>答错</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>一致（字义 = 墨水色）</td>
            <td>{{ congruent.trials }}</td>
            <td>{{ ms(congruent.meanRt) }}</td>
            <td>{{ congruent.errors }}</td>
          </tr>
          <tr>
            <td>不一致</td>
            <td>{{ incongruent.trials }}</td>
            <td>{{ ms(incongruent.meanRt) }}</td>
            <td>{{ incongruent.errors }}</td>
          </tr>
        </tbody>
      </table>
      <p class="demo-section-desc">
        Stroop 干扰量（不一致 − 一致）：<strong>{{ ms(diff) }}</strong>。多数人为正值，通常在几十到一百多毫秒之间；这里的数字受设备、键盘和你当时的状态影响，只作参考。
      </p>
    </demo-section>

    <demo-section
      title="为什么会变慢"
      desc="1935 年，John Ridley Stroop 发表了这个后来以他命名的实验。阅读对成年人来说几乎是自动的，看到“红”字就会不由自主地激活“红”这个词；而说出墨水颜色则需要有意识地去做。两者冲突时，大脑必须抑制自动反应，于是反应变慢、错误变多。这个实验常被用来研究注意力和认知控制。"
    />
  </demo-page>
</template>

<style lang="less">
.stroop-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 420px;
  height: 180px;
  background: #FFF;
  border: 1px solid #DDDEE4;
  user-select: none;
  .stroop-word {
    font-size: 100px;
    font-weight: 700;
  }
  .stroop-fix {
    font-size: 64px;
    color: #666;
  }
  .stroop-hint {
    font-size: 16px;
    color: #999;
  }
}

.stroop-table {
  border-collapse: collapse;
  background: #FFF;
  th,
  td {
    padding: 6px 14px;
    border: 1px solid #DDDEE4;
    text-align: left;
  }
}
</style>
