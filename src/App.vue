<script setup lang="ts">
import {ref, watch, computed, onMounted, provide} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import Side from './components/Side.vue';
import {catalogList} from './router';

const router = useRouter();
const route = useRoute();
const current = ref('HOME');

const routerChange = (value: string) => {
  current.value = value;
  router.push({
    name: value.toLowerCase()
  });
};

const routeName = computed(() => {
  return route.name as string || 'home';
});

watch(routeName, nv => {
  current.value = nv.toUpperCase();
});

const leftWidth = 180;
const sideWidth = `${leftWidth}px`;
const paddingNum = 10;
const padding = `${paddingNum}px`;

const setRank = () => {
  const ele = document.getElementById('app') as HTMLElement;
  const {width, height} = ele.getBoundingClientRect();

  provide('rank', {
    width: width - leftWidth - 2 * paddingNum,
    height: height - 2 * paddingNum
  });
};

onMounted(() => {
  setRank();
});
</script>

<template>
  <side
    :current="current"
    :catalog-list="catalogList"
    @change="routerChange"
  />
  <router-view class="container"/>
</template>

<style lang="less">
@import url('src/assets/css/mixins.less');
@width: v-bind(sideWidth);
@padding: v-bind(padding);

#app {
  width: 100%;
  height: 100%;
  display: flex;
  color: #2C3E50F3;
  background: #EBEDF3;
  .side {
    min-width: @width;
    width: @width;
    background: #FFFFFF;
    flex-shrink: 0;
  }
  .container {
    flex: 1;
    width: calc(100% - @width);
    height: 100%;
    padding: @padding;
  }
}
</style>
