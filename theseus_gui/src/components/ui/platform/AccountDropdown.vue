<template>
  <div class="account-dropdown">
    <Modal
      ref="modrinthLoginModal"
      class="login-screen-modal"
      :noblur="!themeStore.advancedRendering"
    >
      <ModrinthLoginScreen :modal="true" :prev-page="signInAfter" :next-page="signInAfter" />
    </Modal>
    <OverflowMenu
      v-if="auth?.user"
      class="btn btn-transparent headless-button"
      :options="[
        {
          id: 'sign-out',
          color: 'danger',
          action: async () => {
            await mrAuth.logout()
          },
          hoverFilledOnly: true,
        },
      ]"
      direction="up"
      position="right"
    >
      <Avatar circle size="sm" :src="auth?.user?.avatar_url" />
      <template #sign-out> <LogOutIcon /> {{ t('Settings.SignOut') }} </template>
    </OverflowMenu>
    <OverflowMenu
      v-else
      class="btn btn-transparent headless-button"
      :options="[
        {
          id: 'sign-in',
          color: 'primary',
          action: () => {
            modrinthLoginModal?.show()
          },
        },
      ]"
      direction="up"
      position="right"
    >
      <Avatar circle size="sm" src="https://cdn.discordapp.com/attachments/1006329469428043846/1200633903506018434/qzJ1vLioGvxrXAL8.png" />
      <template #sign-in> <LogInIcon /> {{ t('Settings.SignIn') }} </template>
    </OverflowMenu>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Avatar, OverflowMenu, LogOutIcon, LogInIcon, Modal } from 'omorphia'

import { useTheming } from '@/store/state'
import { useModrinthAuth } from '@/store/mr_auth.js'

import ModrinthLoginScreen from '@/components/ui/tutorial/ModrinthLoginScreen.vue'
import { storeToRefs } from 'pinia'
import { i18n } from '@/main.js';
const t = i18n.global.t;
const themeStore = useTheming()
const mrAuth = useModrinthAuth()
const { auth } = storeToRefs(mrAuth)

const modrinthLoginModal = ref(null)

const signInAfter = async () => {
  modrinthLoginModal.value?.hide()
  await mrAuth.get()
}
</script>

<style scoped lang="scss">
:deep {
  .headless-button {
    padding: 0 !important;
    border-radius: 99999px;
  }

  .login-screen-modal {
    .modal-container .modal-body {
      width: auto;

      .content {
        background: none;
      }
    }
  }
}
</style>
