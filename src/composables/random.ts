/**
 * 初始化一个数组，每一项为1~max
 * @param max 最大值
 * @returns 
 */
const progress = (max: number) => {
  const list = [];
  for (let i = 1; i <= max; i++) {
    list.push(i);
  }
  return list;
};

/**
 * 按照1 ~ N 渐进式的方式，从长度为length的数组中获取随机数，N的最大值为max
 * @param length 数组长度
 * @param max 每次最多的个数
 * @returns 二维数组，值为每次获取的随机索引
 */
const stupid = (length: number, max: number): number[][] => {
  const start = progress(length);

  const result = [];
  let si = 1;

  while (start.length > 0) {
    const sarr = [];
    for (let i = 0; i < Math.min(si, max); i++) {
      if (start.length === 0) {
        break;
      }
      const index = Math.floor(Math.random() * start.length);
      sarr.push(start[index] - 1);
      start.splice(index, 1);
    }

    result.push(sarr);
    si ++;
  }

  return result;
};

export {
  stupid
};
