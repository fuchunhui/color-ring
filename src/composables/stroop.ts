interface StroopColor {
  id: string;
  word: string;
  css: string;
  key: string;
}

interface Trial {
  word: number;
  ink: number;
  congruent: boolean;
}

interface Result {
  trial: Trial;
  rt: number;
  answer: number;
  correct: boolean;
}

interface Summary {
  trials: number;
  meanRt: number | null;
  errors: number;
}

const COLORS: StroopColor[] = [
  {id: 'red', word: '红', css: '#E53935', key: '1'},
  {id: 'green', word: '绿', css: '#2E9E4F', key: '2'},
  {id: 'blue', word: '蓝', css: '#1E63E5', key: '3'},
  {id: 'yellow', word: '黄', css: '#E5B800', key: '4'}
];

const TRIAL_COUNT = 24;

const shuffle = <T>(list: T[], rand: () => number): T[] => {
  const result = list.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** 一半一致、一半不一致；每种字色在两种条件下出现的次数相同 */
const makeTrials = (rand: () => number = Math.random, count = TRIAL_COUNT): Trial[] => {
  const trials: Trial[] = [];
  const half = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const ink = i % COLORS.length;
    if (i < half) {
      trials.push({word: ink, ink, congruent: true});
    } else {
      const word = (ink + 1 + Math.floor(rand() * (COLORS.length - 1))) % COLORS.length;
      trials.push({word, ink, congruent: false});
    }
  }
  return shuffle(trials, rand);
};

const summarize = (results: Result[], congruent: boolean): Summary => {
  const list = results.filter(r => r.trial.congruent === congruent);
  const correct = list.filter(r => r.correct);
  const meanRt = correct.length ? correct.reduce((sum, r) => sum + r.rt, 0) / correct.length : null;
  return {trials: list.length, meanRt, errors: list.length - correct.length};
};

const interference = (results: Result[]): number | null => {
  const a = summarize(results, true).meanRt;
  const b = summarize(results, false).meanRt;
  return a === null || b === null ? null : b - a;
};

export {
  StroopColor,
  Trial,
  Result,
  Summary,
  COLORS,
  TRIAL_COUNT,
  makeTrials,
  summarize,
  interference
};
