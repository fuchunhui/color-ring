<script setup lang="ts">
import {toRefs, computed} from 'vue';
import Color from '../../base/color';

const props = defineProps<{
  color: Color;
}>();

const color = toRefs(props).color;

const hex = computed(() => {
  return color.value.toHex().toUpperCase();
});

const rgb = computed(() => {
  return color.value.rgb().join(', ');
});

const percent = computed(() => {
  const result: string[] = [];
  color.value.rgb().forEach(item => {
    const cell = item * 100 / 255;
    result.push(`${cell}%`);
  });
  return result.join(', ');
});

const hsl = computed(() => {
  const {h, s, l} = color.value.toHSL();
  return [h, `${s * 100}%`, `${l * 100}`].join(', ');
});

const hsv = computed(() => {
  const {h, s, v} = color.value.toHSV();
  return [`${h}°`, `${s * 100}`, `${v * 100}`].join(', ');
});

const conversionList = computed(() => {
  return [
    {
      label: 'Hex triplet',
      code: hex.value
    },
    {
      label: 'RGB Decimal',
      code: `rgb(${rgb.value})`
    },
    {
      label: 'RGB Percent',
      code: `rgb(${percent.value})`
    },
    {
      label: 'CMYK',
      code: 'TODO!!!'
    },
    {
      label: 'HSL',
      code: `hsl(${hsl.value})`
    },
    {
      label: 'HSV(or HSB)',
      code: hsv.value
    }
  ];
});
</script>

<template>
  <div class="color-detail">
    <table class="color-detail-table">
      <tbody>
        <tr
          v-for="({label, code}, index) in conversionList"
          :key="index"
        >
          <th class="color-detail-title">
            {{ label }}
          </th> 
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
    width: 115px;
  }
  &-code {
    width: 185px;
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