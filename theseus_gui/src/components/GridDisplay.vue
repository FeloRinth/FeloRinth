<script setup>
import Instance from '@/components/ui/Instance.vue'
import { computed, ref } from 'vue'
import { sortBy, group, filters } from '@/helpers/library.js'
import {
  ClipboardCopyIcon,
  FolderOpenIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  StopCircleIcon,
  EyeIcon,
  Card,
  DropdownSelect,
  SearchIcon,
  XIcon,
  Button,
  formatCategoryHeader,
  // ModalConfirm,
  Modal
} from 'omorphia'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import dayjs from 'dayjs'
import { useTheming } from '@/store/theme.js'
import { duplicate, remove } from '@/helpers/profile.js'
import { handleError } from '@/store/notifications.js'
import { i18n } from '@/main.js';
const t = i18n.global.t;
const props = defineProps({
  instances: {
    type: Array,
    default() {
      return []
    },
  },
  label: {
    type: String,
    default: '',
  },
})
const instanceOptions = ref(null)
const instanceComponents = ref(null)

const themeStore = useTheming()
const currentDeleteInstance = ref(null)
const confirmModal = ref(null)

async function deleteProfile(modal) {
  if (currentDeleteInstance.value) {
    modal.hide()
    instanceComponents.value = instanceComponents.value.filter(
      (x) => x.instance.path !== currentDeleteInstance.value,
    )
    await remove(currentDeleteInstance.value).catch(handleError)
  }
}

async function duplicateProfile(p) {
  await duplicate(p).catch(handleError)
}

const handleRightClick = (event, profilePathId) => {
  const item = instanceComponents.value.find((x) => x.instance.path === profilePathId)
  const baseOptions = [
    { name: 'add_content' },
    { type: 'divider' },
    { name: 'edit' },
    { name: 'duplicate' },
    { name: 'open' },
    { name: 'copy' },
    { type: 'divider' },
    {
      name: 'delete',
      color: 'danger',
    },
  ]

  instanceOptions.value.showMenu(
    event,
    item,
    item.playing
      ? [
          {
            name: 'stop',
            color: 'danger',
          },
          ...baseOptions,
        ]
      : [
          {
            name: 'play',
            color: 'primary',
          },
          ...baseOptions,
        ],
  )
}

const handleOptionsClick = async (args) => {
  switch (args.option) {
    case 'play':
      args.item.play(null, 'InstanceGridContextMenu')
      break
    case 'stop':
      args.item.stop(null, 'InstanceGridContextMenu')
      break
    case 'add_content':
      await args.item.addContent()
      break
    case 'edit':
      await args.item.seeInstance()
      break
    case 'duplicate':
      if (args.item.instance.install_stage == 'installed')
        await duplicateProfile(args.item.instance.path)
      break
    case 'open':
      await args.item.openFolder()
      break
    case 'copy':
      await navigator.clipboard.writeText(args.item.instance.path)
      break
    case 'delete':
      currentDeleteInstance.value = args.item.instance.path
      confirmModal.value.show()
      break
  }
}

const search = ref('')

const filteredResults = computed(() => {
  let instances = props.instances.filter((instance) => {
    return instance.metadata.name.toLowerCase().includes(search.value.toLowerCase())
  })

  if (sortBy.value === t('GridDisplay.Name')) {
    instances.sort((a, b) => {
      sortBy.value = t('GridDisplay.Name')
      return a.metadata.name.localeCompare(b.metadata.name)
    })
  }

  if (sortBy.value === t('GridDisplay.GameVer')) {
    instances.sort((a, b) => {
      sortBy.value = t('GridDisplay.GameVer')
      return a.metadata.game_version.localeCompare(b.metadata.game_version)
    })
  }

  if (sortBy.value === t('GridDisplay.LastPlayed')) {
    instances.sort((a, b) => {
      sortBy.value = t('GridDisplay.LastPlayed')
      return dayjs(b.metadata.last_played ?? 0).diff(dayjs(a.metadata.last_played ?? 0))
    })
  }

  if (sortBy.value === t('GridDisplay.DateCreated')) {
    instances.sort((a, b) => {
      sortBy.value = t('GridDisplay.DateCreated')
      return dayjs(b.metadata.date_created).diff(dayjs(a.metadata.date_created))
    })
  }

  if (sortBy.value === t('GridDisplay.DateModify')) {
    instances.sort((a, b) => {
      sortBy.value = t('GridDisplay.DateModify')
      return dayjs(b.metadata.date_modified).diff(dayjs(a.metadata.date_modified))
    })
  }

  if (filters.value === t('GridDisplay.CustomInstances')) {
    instances = instances.filter((instance) => {
      filters.value = t('GridDisplay.CustomInstances')
      return !instance.metadata?.linked_data
    })
  } else if (filters.value === t('GridDisplay.DownloadedModpacks')) {
    instances = instances.filter((instance) => {
      filters.value = t('GridDisplay.DownloadedModpacks')
      return instance.metadata?.linked_data
    })
  }

  const instanceMap = new Map()

  if (group.value === t('GridDisplay.Loader')) {
    instances.forEach((instance) => {
      group.value = t('GridDisplay.Loader')
      const loader = formatCategoryHeader(instance.metadata.loader)
      if (!instanceMap.has(loader)) {
        instanceMap.set(loader, [])
      }

      instanceMap.get(loader).push(instance)
    })
  } else if (group.value === t('GridDisplay.GameVer')) {
    instances.forEach((instance) => {
      group.value = t('GridDisplay.GameVer')
      if (!instanceMap.has(instance.metadata.game_version)) {
        instanceMap.set(instance.metadata.game_version, [])
      }

      instanceMap.get(instance.metadata.game_version).push(instance)
    })
  } else if (group.value === t('GridDisplay.Category')) {
    instances.forEach((instance) => {
      group.value = t('GridDisplay.Category')
      if (instance.metadata.groups.length === 0) {
        instance.metadata.groups.push(t('GridDisplay.None'))
      }

      for (const category of instance.metadata.groups) {
        if (!instanceMap.has(category)) {
          instanceMap.set(category, [])
        }

        instanceMap.get(category).push(instance)
      }
    })
  } else {
    return instanceMap.set(t('GridDisplay.None'), instances)
  }

  // For 'name', we intuitively expect the sorting to apply to the name of the group first, not just the name of the instance
  // ie: Category A should come before B, even if the first instance in B comes before the first instance in A
  if (sortBy.value === t('GridDisplay.Name')) {
    const sortedEntries = [...instanceMap.entries()].sort((a, b) => {
      // None should always be first
      if (a[0] === t('GridDisplay.None') && b[0] !== t('GridDisplay.None')) {
        return -1
      }
      if (a[0] !== t('GridDisplay.None') && b[0] === t('GridDisplay.None')) {
        return 1
      }
      return a[0].localeCompare(b[0])
    })
    instanceMap.clear()
    sortedEntries.forEach((entry) => {
      instanceMap.set(entry[0], entry[1])
    })
  }

  return instanceMap
})
</script>
<template>
<!--  <ModalConfirm-->
<!--    ref="confirmModal"-->
<!--    :title=""-->
<!--    :description=""-->
<!--    :has-to-type="false"-->
<!--    proceed-label="Delete"-->
<!--    :noblur="!themeStore.advancedRendering"-->
<!--    @proceed="deleteProfile"-->
<!--  />-->
  <Modal ref="confirmModal" :has-to-type="false" :noblur="!themeStore.advancedRendering" :header="t('Instance.Options.DeleteQuestion')">
    <div class="modal-body">
      <div class="markdown-body">
        <p>
          {{ t('Instance.Options.DeleteQuestionDesc') }}
        </p>
      </div>
      <div class="button-group push-right">
        <Button @click="confirmModal.hide()"> {{ t('GridDisplay.Cancel') }} </Button>
        <Button color="danger" @click="deleteProfile(confirmModal)">
          <TrashIcon />
          {{ t('GridDisplay.Delete') }}
        </Button>
      </div>
    </div>
  </Modal>
  <Card class="header">
    <div class="iconified-input">
      <SearchIcon />
      <input v-model="search" type="text" :placeholder="t('GridDisplay.Search')" class="search-input" />
      <Button class="r-btn" @click="() => (search = '')">
        <XIcon />
      </Button>
    </div>
    <div class="labeled_button">
      <span>{{t('GridDisplay.Sort')}}</span>
      <DropdownSelect
        v-model="sortBy"
        class="sort-dropdown"
        name="Sort Dropdown"
        :options="[t('GridDisplay.Name'), t('GridDisplay.LastPlayed'), t('GridDisplay.DateCreated'), t('GridDisplay.DateModify'), t('GridDisplay.GameVer')]"
        :placeholder="t('GridDisplay.Selection')"
      />
    </div>
    <div class="labeled_button">
      <span>{{t('GridDisplay.Filter')}}</span>
      <DropdownSelect
        v-model="filters"
        class="filter-dropdown"
        name="Filter Dropdown"
        :options="[t('GridDisplay.AllProf'), t('GridDisplay.CustomInstances'), t('GridDisplay.DownloadedModpacks')]"
        :placeholder="t('GridDisplay.Selection')"
      />
    </div>
    <div class="labeled_button">
      <span>{{ t('GridDisplay.Group')}}</span>
      <DropdownSelect
        v-model="group"
        class="group-dropdown"
        name="Group Dropdown"
        :options="[t('GridDisplay.Category'), t('GridDisplay.Loader'), t('GridDisplay.GameVer'), t('GridDisplay.None')]"
        :placeholder="t('GridDisplay.Selection')"
      />
    </div>
  </Card>
  <div
    v-for="instanceSection in Array.from(filteredResults, ([key, value]) => ({
      key,
      value,
    }))"
    :key="instanceSection.key"
    class="row"
  >
    <div v-if="instanceSection.key !== 'None'" class="divider">
      <p>{{ instanceSection.key }}</p>
      <hr aria-hidden="true" />
    </div>
    <section class="instances">
      <Instance
        v-for="instance in instanceSection.value"
        ref="instanceComponents"
        :key="instance.path + instance.install_stage"
        :instance="instance"
        @contextmenu.prevent.stop="(event) => handleRightClick(event, instance.path)"
      />
    </section>
  </div>
  <ContextMenu ref="instanceOptions" @option-clicked="handleOptionsClick">
    <template #play> <PlayIcon /> {{t('RowDisplay.Play')}} </template>
    <template #stop> <StopCircleIcon /> {{t('RowDisplay.Stop')}} </template>
    <template #add_content> <PlusIcon /> {{t('RowDisplay.AddContent')}} </template>
    <template #edit> <EyeIcon /> {{t('RowDisplay.ViewInstance')}} </template>
    <template #duplicate> <ClipboardCopyIcon /> {{t('RowDisplay.DuplicateInstance')}}</template>
    <template #delete> <TrashIcon /> {{t('RowDisplay.Delete')}} </template>
    <template #open> <FolderOpenIcon /> {{t('RowDisplay.OpenFolder')}} </template>
    <template #copy> <ClipboardCopyIcon /> {{t('RowDisplay.CopyPath')}} </template>
  </ContextMenu>
</template>
<style lang="scss" scoped>
.row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 1rem;

  .divider {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 1rem;
    margin-bottom: 1rem;

    p {
      margin: 0;
      font-size: 1rem;
      white-space: nowrap;
      color: var(--color-contrast);
    }

    hr {
      background-color: var(--color-gray);
      height: 1px;
      width: 100%;
      border: none;
    }
  }
}

.header {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: inherit;
  margin: 1rem 1rem 0 !important;
  padding: 1rem;
  width: calc(100% - 2rem);

  .iconified-input {
    flex-grow: 1;

    input {
      min-width: 100%;
    }
  }

  .sort-dropdown {
    width: 10rem;
  }

  .filter-dropdown {
    width: 15rem;
  }

  .group-dropdown {
    width: 10rem;
  }

  .labeled_button {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }
}

.instances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  width: 100%;
  gap: 1rem;
  margin-right: auto;
  scroll-behavior: smooth;
  overflow-y: auto;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--gap-lg);

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  strong {
    color: var(--color-contrast);
  }
}
</style>
