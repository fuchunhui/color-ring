<script setup lang="ts">
import {toRefs, computed} from 'vue';
import Color from '../../base/color';

const props = defineProps<{
  color: Color;
}>();

// 处理值，然后列表渲染内容
// 数据格式参见colorhexa
const color = toRefs(props).color;

const conversionList = computed(() => {
  return [
    {
      label: 'Hex triplet',
      value: color.value.toHex(),
      code: '#FF00FF'
    },
    {
      label: 'RGB Decimal',
      value: color.value.rgb(),
      code: '123'
    },
    {
      label: 'RGB Percent',
      value: 'RGB Percent',
      code: '123'
    },
    {
      label: 'CMYK',
      value: 'CMYK',
      code: '123'
    },
    {
      label: 'HSL',
      value: 'HSL',
      code: '123'
    },
    {
      label: 'HSV(or HSB)',
      value: 'HSV',
      code: '123'
    }
  ];
});
</script>

<template>
  <div class="color-detail">
    <table class="color-detail-table">
      <tbody>
        <tr
          v-for="({label, value, code}, index) in conversionList"
          :key="index"
        >
          <th class="color-detail-title">
            {{ label }}
          </th> 
          <td class="color-detail-value">
            {{ value }}
          </td> 
          <td class="color-detail-code">
            <code>
              {{ code }}
            </code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="less">
.color-detail {
  &-table {
    border-collapse: separate;
    border-spacing: 0 5px;
    table-layout: fixed;
    tr {
      border-radius: 3px;
      color: #77787a;
      font-size: 14px;
      height: 40px;
      margin-bottom: 5px;
      padding: 5px 10px;
      position: relative;
      text-shadow: 0 1px 0 #fff;
      &:nth-child(2n+1) {
        background: #f5f6fa none repeat scroll 0 0;
      }
    }
  }
  &-title {
    border-radius: 3px 0 0 3px;
    color: #5c5d5f;
    font-size: 12px;
    font-weight: bold;
    padding-left: 10px;
    white-space: nowrap;
    width: 120px;
  }
  &-code {
    border-radius: 0 3px 3px 0;
    opacity: .5;
    padding: 5px 4px;
    code {
      background: #f7f8fa;
      border-left: 5px solid #e4e5e7;
      display: block;
      font-family: Consolas,menlo,monaco,monospace;
      font-size: 12px;
      overflow: hidden;
      padding: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &:hover {
      opacity: 1;
    }
  }
}
</style>