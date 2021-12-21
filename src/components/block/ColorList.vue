<script setup lang="ts">
import ColorDetail from './ColorDetail.vue';
import Color from '../../base/color';

const props = defineProps<{
  colors: Color[];
  current: string;
}>();

console.log('list------>', props.colors);

const showCell = (color: Color) => {
  console.log('click', color);
};

</script>

<template>
  <div class="color-list">
    <color-detail/>
    <div class="color-list-wrap">
      <div
        v-for="(item, index) in colors"
        :key="index"
        :class="{
          'color-cell': true,
          'color-cell-active': current === item.toHex()
        }"
        :style="{
          backgroundColor: item.toRGB()
        }"
        @click="showCell(item)"
      >
        {{ item.toRGB() }}
      </div>
    </div>
  </div>
</template>

<style lang="less">
.color-list {
  display: flex;
  .color-detail {
    flex: 1;
  }
  &-wrap {
    width: 120px;
    overflow: auto;
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
    }
  }
}
</style>