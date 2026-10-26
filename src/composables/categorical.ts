type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const CHART_W = 300;
const CHART_H = 200;

const SERIES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '子', '丑'];

const value = (series: number, x: number): number => {
  return 50 + 30 * Math.sin(x * 0.9 + series * 1.7) + 8 * Math.cos(x * 0.4 * (series + 1));
};

/** 多折线图 + 堆叠柱状图 + 图例 */
const drawChart = (colors: () => string[]): DrawFn => (ctx, w, h) => {
  const list = colors();
  const n = list.length;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, w, h);

  const left = 8;
  const top = 8;
  const plotW = w - 16;
  const lineH = 82;
  ctx.strokeStyle = '#E4E5E7';
  ctx.strokeRect(left + 0.5, top + 0.5, plotW, lineH);
  list.forEach((color, s) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 8; x++) {
      const px = left + 4 + (x / 8) * (plotW - 8);
      const py = top + lineH - (value(s, x) / 100) * (lineH - 6) - 3;
      if (x === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  });

  const barTop = top + lineH + 12;
  const barH = 56;
  const bars = 6;
  const bw = plotW / bars - 6;
  for (let b = 0; b < bars; b++) {
    const total = list.reduce((sum, _, s) => sum + 10 + (value(s, b) % 10), 0);
    let y = barTop + barH;
    list.forEach((color, s) => {
      const hh = ((10 + (value(s, b) % 10)) / total) * barH;
      ctx.fillStyle = color;
      ctx.fillRect(left + b * (bw + 6) + 3, y - hh, bw, hh);
      y -= hh;
    });
  }

  const legendTop = barTop + barH + 10;
  const perRow = 6;
  ctx.font = '11px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  list.forEach((color, s) => {
    const x = left + (s % perRow) * (plotW / perRow);
    const y = legendTop + Math.floor(s / perRow) * 16;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 5, 10, 10);
    ctx.fillStyle = '#555';
    ctx.fillText(SERIES[s % SERIES.length], x + 14, y);
  });
  if (!n) {
    ctx.fillStyle = '#999';
    ctx.fillText('无颜色', left, legendTop);
  }
};

export {
  CHART_W,
  CHART_H,
  drawChart
};
