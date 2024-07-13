<script setup>
// the objects should look like this
/*
 * {
 *   "title": "Just Enough Items (JEI)",
 *   "url": "https://modrinth.com/mod/jei",
 * }
 */
import { computed, ref } from 'vue'
import { ChevronRightIcon, ChevronLeftIcon } from '@modrinth/assets'
import { Button } from '@modrinth/ui'

const props = defineProps({
  logo: {
    type: Boolean,
    default: false
  },
  gallery: {
    type: Array,
    required: true
  }
})

const page = ref(1)
const image = computed(() => props.gallery[page.value - 1])
</script>

<template>
  <div class="gallery-image">
    <img
      v-if="logo"
      src="@/assets/ar_matrix.png"
      class="app-logo"
    />
    <div class="image-wrapper">
      <img :src="image.url" :alt="image.title" />
      <div class="text">
        <h3>{{ image.title }}</h3>
        <p>
          {{ image.subtitle }}
        </p>
      </div>
      <!-- <Button :disabled="page === 1" class="left-button" icon-only @click="page--">
        <ChevronLeftIcon />
      </Button>
      <Button :disabled="page === 1" class="right-button" icon-only @click="page++">
        <ChevronRightIcon />
      </Button> -->
    </div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.gallery-image {
  display: flex;
  position: relative;
  gap: var(--gap-md);
  flex-direction: column;
  align-items: center;
  padding: var(--gap-xl);
  max-height: 100vh;
  max-width: 100vh;
  margin: auto;

  .image-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    img {
      height: 100%;
      width: 100%;
      object-fit: contain;
    }

    .text {
      position: absolute;
      bottom: calc(var(--gap-md) * 3);
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      border-radius: var(--gap-lg);
      padding: var(--gap-sm) var(--gap-md);
      background-color: rgba(0, 0, 0, 0.5);
      //add blur
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      color: var(--color-base);
      transition: all 0.3s ease-in-out;
    }

    .left-button {
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      z-index: 1;
    }

    .right-button {
      position: absolute;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      z-index: 1;
    }

    .btn {
      background: none;
    }
  }
}

.page-indicator {
  width: 100%;
  margin: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);

  .circle {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.5rem;
    background-color: var(--color-base);
    transition: all 0.3s ease-in-out;
    cursor: pointer !important;

    &.active {
      background-color: var(--color-brand);
    }
  }
}

.app-logo {
  width: 50rem;
  height: auto;
  display: block;
}
</style>
