import Color from '../base/color';

const ring = (colors: Color[], deep: number, ctx: CanvasRenderingContext2D): void => {
  const x = 25 + 2 * 50;
  const y = 25 + 2 * 50;
  const r = 100;
  const r2 = 80;

  ctx.lineWidth = 20;

  ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.arc(x, y, r, 0, Math.PI / 2);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.strokeStyle = 'blue';
  ctx.arc(x, y, r, Math.PI / 2, Math.PI);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.strokeStyle = 'yellow';
  ctx.arc(x, y, r2, 0, Math.PI / 2);
  ctx.stroke();
  ctx.closePath();
};

export default ring;
