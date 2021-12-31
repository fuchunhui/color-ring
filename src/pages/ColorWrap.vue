<script setup lang="ts">
</script>

<template>
  <div class="color-wrap">
    <div class="logo">
      <a href="/favicon.ico">Color Ring</a>
    </div>
    <div class="color-wrap-content">
      <p>这是什么？</p>
      <p>我想用自己的方式，讲讲色彩的世界，见识下神奇的颜色，把那些让人着迷的数学模型，结合丰富的色彩展示出来。</p>
      <p>仅作为个人兴趣的实验品，不具有任何学术性，如果有任何瑕疵，请一定帮忙指出，非常感谢。</p>
    </div>
    <div class="color-wrap-footer">
      本文的博客地址：<a href="https://juejin.cn/post/7047529302140649486">水鳜鱼肥</a>
    </div>
  </div>
</template>

<style lang="less">
.color-wrap {
  width: 100%;
  height: 100%;

  &-content {
    padding-top: 10px;
    font-size: 16px;
    margin: 0 auto;
    p {
      line-height: 32px;
    }
  }
  &-footer {
    margin-top: 10px;
    font-size: 16px;
  }

  .logo {
    position: relative;
    height: 48px;
    line-height: 48px;
    padding: 0 15px;
    background-image: url(../../favicon.ico), none;
    background-attachment: scroll;
    background-color: transparent;
    background-position: 0 6px;
    background-repeat: no-repeat;
    a {
      width: 220px;
      padding-left: 24px;
      font-size: 30px;
      background-image: linear-gradient(135deg, red, yellow, green, blue, magenta);
      background-clip:text;
      -webkit-background-clip:text;
      color: transparent;
    }
  }
}
</style>