<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/twenty-fourth';

</script>

<template>
  <base-canvas class="twenty-fourth" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.twenty-fourth {
  background-color: mintcream;
}
</style>
