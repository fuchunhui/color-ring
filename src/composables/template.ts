const template = (ctx: CanvasRenderingContext2D): void => {
  ctx.beginPath();
  ctx.arc(200, 200, 100, 0, 2 * Math.PI);
  ctx.fillStyle = '#FF0000';
  ctx.fill();
};

export default template;
