<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/forty-eight';

</script>

<template>
  <base-canvas class="forty-eight" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.forty-eight {
  background-color: mintcream;
}
</style>
