<template>
  <view class="status">
    <text id="current">{{ route.fullPath }}</text>
    <text id="global-route">{{ $Route.fullPath }}</text>
    <text id="result">{{ state.result }}</text>
    <text id="load-route">{{ state.onLoadRoute }}</text>
    <text id="sync-route">{{ state.afterSyncRoute }}</text>
    <text id="trace">{{ state.trace.join('\n') }}</text>
  </view>
</template>

<script setup lang="ts">
import { useRoute } from '@wot-ui/router/x'
import { state } from '../router'

const route = useRoute()
</script>
