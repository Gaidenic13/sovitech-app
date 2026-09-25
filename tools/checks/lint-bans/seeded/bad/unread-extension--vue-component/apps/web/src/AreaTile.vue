<!-- Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose. -->
<!-- No ban reads .vue files, so the zero fallback below would pass unread (phase 0 review round 2, adversarial finding 12). -->
<template><span>{{ area ?? 0 }}</span></template>
<script setup lang="ts">
defineProps<{ area?: number }>();
</script>
