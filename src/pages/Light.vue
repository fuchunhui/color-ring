<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {light, colors} from '../composables/light';

</script>

<template>
  <base-canvas class="light" :convert="light" :colors="colors"/>
</template>

<style lang="less">
.light {
  // background-color: mintcream;
}
</style>