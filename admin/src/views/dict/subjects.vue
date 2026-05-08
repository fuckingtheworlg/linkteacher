<template>
  <SimpleDict
    title="科目"
    :load-fn="dictApi.subjects.list"
    :create-fn="dictApi.subjects.create"
    :update-fn="dictApi.subjects.update"
    :remove-fn="dictApi.subjects.remove"
  />
</template>

<script setup lang="ts">
import SimpleDict from './SimpleDict.vue';
import { dictApi } from '@/api/admin';
</script>
