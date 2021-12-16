<script setup lang="ts">
import {onMounted} from 'vue';

onMounted(() => {
  console.log(123);
});

</script>

<template>
  <div class="color-wrap">
    <p>这个是什么呢！！！！</p>
  </div>
</template>

<style lang="less">
.color-wrap {
  width: 100%;
  height: 100%;
}
</style>