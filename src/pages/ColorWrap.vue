<script setup lang="ts">
import {ref, watch, Ref, onMounted, provide, computed} from 'vue';
// import Side from '../components/Side.vue';

onMounted(() => {
  // getConfig();
});

</script>

<template>
  <div class="image-wrap">
    <!-- <side
      :current="current"
      :catalog-list="catalogList"
      @change="imageChange"
    /> -->
    <p>这个是什么呢！！！！</p>
  </div>
</template>

<style lang="less">
@import url('src/assets/css/mixins.less');
@width: 180px;

.image-wrap {
  width: 100%;
  height: 100%;
  display: flex;

  .side {
    min-width: @width;
    width: @width;
    background: #FFFFFF;
    flex-shrink: 0;
  }
  .container {
    flex: 1;
    width: calc(100% - @width);
    padding: 0 6px;
  }
}
</style>