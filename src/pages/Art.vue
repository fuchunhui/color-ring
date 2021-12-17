<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import art from '../composables/art';

</script>

<template>
  <base-canvas class="art" :convert="art"/>
</template>

<style lang="less">
.art {
  background-color: mintcream;
}
</style>