<script setup>
import { onUnmounted, ref } from 'vue'
import GridDisplay from '@/components/GridDisplay.vue'
import { useRoute } from 'vue-router'
import { useBreadcrumbs } from '@/store/breadcrumbs'
import { offline_listener, profile_listener } from '@/helpers/events.js'
import { Button, PlusIcon } from 'omorphia'
import InstanceCreationModal from '@/components/ui/InstanceCreationModal.vue'
import { NewInstanceImage } from '@/assets/icons'
import { isOffline } from '@/helpers/utils'
import { i18n } from '@/main.js'
import { useInstances } from '@/store/instances'
import { storeToRefs } from 'pinia'

const t = i18n.global.t
const route = useRoute()
const breadcrumbs = useBreadcrumbs()

breadcrumbs.setRootContext({ name: 'Library', link: route.path })

const instancesStore = useInstances()
const { instanceList } = storeToRefs(instancesStore)

const offline = ref(await isOffline())
const unlistenOffline = await offline_listener((b) => {
  offline.value = b
})

const unlistenProfile = await profile_listener(async () => {
  await instancesStore.refreshInstances()
})

onUnmounted(() => {
  unlistenProfile()
  unlistenOffline()
})

// TODO: Marked Library exception (issue) from forum discussions.
/*
This can help fix a rare exception with the active AR launcher window hanging.

Reproducing the problem personally comes out using different paths, but this will most likely solve the problem,
since it always requests an update of the list of instances every time you enter the Library section,
as if it were a Reload function in debug or just a Route module in normal use, or the Library start page in Settings after next launcher boot or reload.
*/
await instancesStore.refreshInstances() 

</script>

<template>
  <GridDisplay v-if="instanceList.length > 0" label="Instances" :instances="instanceList" />
  <div v-else class="no-instance">
    <div class="icon">
      <NewInstanceImage />
    </div>
    <h3>{{ t('Library.NoInstances') }}</h3>
    <Button color="primary" :disabled="offline" @click="$refs.installationModal.show()">
      <PlusIcon />
      {{ t('Library.CreateInstance') }}
    </Button>
    <InstanceCreationModal ref="installationModal" />
  </div>
</template>

<style lang="scss" scoped>
.no-instance {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--gap-md);

  p,
  h3 {
    margin: 0;
  }

  .icon {
    svg {
      width: 10rem;
      height: 10rem;
    }
  }
}
</style>
