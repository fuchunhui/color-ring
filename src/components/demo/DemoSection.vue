<script setup lang="ts">
defineProps<{
  title: string;
  desc?: string;
}>();
</script>

<template>
  <section class="demo-section">
    <h3 class="demo-section-title">
      {{ title }}
    </h3>
    <p v-if="desc" class="demo-section-desc">
      {{ desc }}
    </p>
    <slot/>
  </section>
</template>

<style lang="less">
.demo-section {
  margin-bottom: 12px;
  &-title {
    padding-top: 10px;
    height: 30px;
  }
  &-desc {
    max-width: 900px;
    margin: 4px 0 8px;
    font-size: 13px;
    line-height: 20px;
    color: #666;
  }
}
</style>
