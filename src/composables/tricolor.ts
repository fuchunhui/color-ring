const edge = 120;
const r = 100;

const _makePoint = (top: string, left: string, right: string) => {
  return [
    {
      x: r + edge / 2,
      y: r,
      color: top
    },
    {
      x: r,
      y: r + Math.sqrt(3) * edge / 2,
      color: left
    },
    {
      x: r + edge,
      y: r + Math.sqrt(3) * edge / 2,
      color: right
    }
  ];
};

const tricolor = (top: string, left: string, right: string, ctx: CanvasRenderingContext2D): void => {
  const pointers = _makePoint(top, left, right);
  pointers.forEach(({x, y, color}) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  });
};

export default tricolor;
