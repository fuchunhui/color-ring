const r = Math.sqrt(3) * 60;
const R = Math.sqrt(1) * 60;

const light = (ctx: CanvasRenderingContext2D): void => {
  ctx.beginPath();
  ctx.arc(r, 2 * r, R, 0, 2 * Math.PI);
  ctx.fillStyle = '#FF0000';
  // ctx.fillStyle = "rgba(255,0,0,1)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(r + 60 * 2, 2 * r, R, 0, 2 * Math.PI);
  ctx.fillStyle = '#0000FF';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(r + 60, r, R, 0, 2 * Math.PI);
  ctx.fillStyle = '#00FF00';
  ctx.fill();
};

export default light;
