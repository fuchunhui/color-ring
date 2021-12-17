const edge = 120;
const r = 100;

// 颜色或者使用rgba表示 rgba(255,0,0,1)
const red = '#FF0000';
const green = '#00FF00'; // lime
const blue = '#0000FF';

const pointers = [
  {
    x: r + edge / 2,
    y: r,
    color: red
  },
  {
    x: r,
    y: r + Math.sqrt(3) * edge / 2,
    color: green
  },
  {
    x: r + edge,
    y: r + Math.sqrt(3) * edge / 2,
    color: blue
  }
];

const light = (ctx: CanvasRenderingContext2D): void => {
  pointers.forEach(({x, y, color}) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  });
};

export default light;
