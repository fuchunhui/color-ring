<script setup lang="ts">
import {ref, watch, computed} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import Side from './components/Side.vue';
import {catalogList} from './config/constant';

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
@width: 180px;

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
    padding: 10px;
  }
}
</style>
