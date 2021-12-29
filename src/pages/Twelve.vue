<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {twelve, colors} from '../composables/twelve';
</script>

<template>
  <base-canvas class="twelve" :convert="twelve" :colors="colors"/>
</template>

<style lang="less">
.twelve {
  background-color: mintcream;
}
</style>
