<script setup lang="ts">
import {Ref, toRefs} from 'vue';
import {OPTION} from '../types';

const props = defineProps<{
  catalogList: OPTION[];
  current: string;
}>();

const emit = defineEmits(['change']);

const catalogList: Ref<OPTION[]> = toRefs(props).catalogList;

const showCell = (value: string) => {
  emit('change', value);
};
</script>

<template>
  <div class="side">
    <div
      v-for="({label, value}) in catalogList"
      :key="value"
      :class="{
        'side-content': true,
        'side-content-active': current === value
      }"
      @click="showCell(value)"
    >
      {{ label }}
    </div>
  </div>
</template>

<style lang="less">
.side {
  width: 100%;
  height: 100%;
  border-right: 1px solid #dddee4;
  overflow-y: auto;
  user-select: none;

  &-content {
    border-top: 1px solid #dddee4;
    width: 100%;
    height: 40px;
    line-height: 40px;
    padding-left: 10px;
    background: #fff;
    color: #3f3f3f;
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
    &:last-child {
      border-bottom: 1px solid #dddee4;
    }
  }
}
</style>