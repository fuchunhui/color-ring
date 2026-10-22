<script setup lang="ts">
import {shallowRef, watch} from 'vue';
import ColorDetail from './ColorDetail.vue';
import Color from '../../base/color';

const props = defineProps<{
  colors: Color[];
  color: Color;
}>();

const localColor = shallowRef(props.color);

const showCell = (color: Color) => {
  localColor.value = color;
};

watch(() => props.color, nv => {
  localColor.value = nv;
});

</script>

<template>
  <div class="color-list">
    <div class="color-list-main">
      <color-detail :color="localColor"/>
      <slot/>
    </div>
    <div class="color-list-wrap">
      <div
        v-for="(item, index) in colors"
        :key="index"
        :class="{
          'color-cell': true,
          'color-cell-active': color.toHex() === item.toHex()
        }"
        :style="{
          backgroundColor: item.toRGB()
        }"
        @click="showCell(item)"
      >
        {{ item.toRGB().toUpperCase() }}
      </div>
    </div>
  </div>
</template>

<style lang="less">
.color-list {
  display: flex;
  &-main {
    flex: 1;
    min-width: 0;
  }
  &-wrap {
    width: 90px;
    overflow: auto;
    padding-top: 5px;
    padding-left: 5px;
  }
  .color-cell {
    width: 100%;
    height: 40px;
    line-height: 40px;
    padding-left: 10px;
    color: gray;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &-active,
    &:hover {
      background: #edf4fe;
      color: #4B98F8;
      font-weight: 500;
    }
  }
}
</style>
