<template>
  <div class="demo-page">
    <slot/>
  </div>
</template>

<style lang="less">
.demo-page {
  height: 100%;
  overflow: auto;
  padding-bottom: 20px;

  .demo-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 20px;
    margin: 8px 0 12px;
    font-size: 14px;
    label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    input[type="range"] {
      width: 160px;
    }
    select {
      height: 28px;
    }
  }

  .demo-swatch {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 1px solid #DDDEE4;
    vertical-align: middle;
  }

  .demo-code {
    font-family: Consolas, menlo, monaco, monospace;
    font-size: 13px;
  }
}
</style>
