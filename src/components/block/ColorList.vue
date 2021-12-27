<script setup lang="ts">
import {ref, watch} from 'vue';
import ColorDetail from './ColorDetail.vue';
import Color from '../../base/color';

const props = defineProps<{
  colors: Color[];
  color: Color;
}>();

const localColor = ref(props.color);

const showCell = (color: Color) => {
  localColor.value = color;
};

watch(() => props.color, nv => {
  localColor.value = nv;
}, {
  deep: true
});

</script>

<template>
  <div class="color-list">
    <color-detail :color="localColor as Color"/>
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
      font-weight: 500;
    }
  }
}
</style>