<template>
  <div class="breadcrumbs">
    <div
      v-if="props.afterLogo && breadcrumbContext.routeBreadcrumbs.value?.length > 0"
      class="breadcrumbs__item"
    >
      <Button class="chevron-btn" @click="$router.back()">
        <ChevronLeftIcon />
      </Button>
      <Button class="chevron-btn" @click="$router.forward()">
        <ChevronRightIcon />
      </Button>
    </div>
    <div
      v-for="breadcrumb in breadcrumbContext.routeBreadcrumbs.value"
      :key="breadcrumb.name"
      class="breadcrumbs__item"
    >
      <router-link
        v-if="breadcrumb.link"
        :to="{
          path: breadcrumb.link.replace('{id}', encodeURIComponent($route.params.id)),
          query: breadcrumb.query,
        }"
      >
        {{ breadcrumbName(breadcrumb.name) }}
      </router-link>
      <span v-else class="selected">
        {{ breadcrumbName(breadcrumb.name) }}
      </span>
      <ChevronRightIcon v-if="breadcrumb.link" class="chevron" />
    </div>
  </div>
</template>

<script setup>
import { ChevronRightIcon, ChevronLeftIcon } from 'omorphia'
import { useBreadcrumbs, useBreadcrumbContext } from '@/store/breadcrumbs'
import { useRoute } from 'vue-router'

const props = defineProps({
  afterLogo: {
    type: Boolean,
    default: false,
  },
})

const breadcrumbData = useBreadcrumbs()
const breadcrumbs = computed(() => {
  const additionalContext =
    route.meta.useContext === true
      ? breadcrumbData.context
      : route.meta.useRootContext === true
        ? breadcrumbData.rootContext
        : null
  return additionalContext ? [additionalContext, ...route.meta.breadcrumb] : route.meta.breadcrumb
})
</script>

<style scoped lang="scss">
.chevron-btn {
  color: #3e8cde;
  border-radius: var(--radius-md);
  border: var(--color-button-bg);
  //padding: var(--gap-sm) var(--gap-lg);
  padding: 0.25rem;
  background-color: rgba(0, 0, 0, 0.0);
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
  0 0 8px rgba(14, 98, 204, 0.5),
  0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0.25rem;
}

.chevron-btn:hover,
.chevron-btn:focus,
.chevron-btn:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.breadcrumbs {
  display: flex;
  flex-direction: row;

  .breadcrumbs__item {
    display: flex;
    flex-direction: row;
    vertical-align: center;
    margin: auto 0;

    .chevron {
      margin: 0.15rem;
    }
    .chevron-button {
      opacity: 0;
    }

    a {
      margin: auto 0;
    }
  }

  .breadcrumbs__back,
  .breadcrumbs__forward {
    margin: auto 0;
    color: var(--color-base);
    height: unset;
    width: unset;
  }

  .breadcrumbs__forward {
    margin-right: 1rem;
  }
}

.selected {
  color: var(--color-contrast);
}
</style>
