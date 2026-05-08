<template>
  <SimpleDict
    title="课程体系"
    :load-fn="dictApi.curriculums.list"
    :create-fn="dictApi.curriculums.create"
    :update-fn="dictApi.curriculums.update"
    :remove-fn="dictApi.curriculums.remove"
  />
</template>

<script setup lang="ts">
import SimpleDict from './SimpleDict.vue';
import { dictApi } from '@/api/admin';
</script>
