<template>
  <div class="account-dropdown">
    <Modal
      ref="modrinthLoginModal"
      class="login-screen-modal"
      :noblur="!themeStore.advancedRendering"
    >
      <ModrinthLoginScreen :modal="true" :prev-page="signInAfter" :next-page="signInAfter" />
    </Modal>
    <PopoutMenu class="btn btn-transparent collapsed-button" direction="up" position="right">
      <Avatar class="collapsed-button__icon" circle size="sm" :src="accountImage" />
      <span class="collapsed-button__label">
        <template v-if="auth?.user">
          {{ getAvatarImage(auth) }}
          {{ auth.user.username }}
        </template>
        <template v-else>
          {{ getAvatarImage(auth) }}
          {{ t('Application.ModrinthAccount') }} </template>
      </span>
      <template #menu>
        <div class="selection-menu">
          <template v-if="auth?.user">
            <Button color="danger" transparent hover-filled-only @click="() => mrAuth.logout()">
              <LogOutIcon /> {{ t('Settings.SignOut') }}
            </Button>
          </template>
          <template v-else>
            <Button
              color="primary"
              transparent
              hover-filled-only
              @click="() => $refs.modrinthLoginModal.show()"
            >
              <LogInIcon /> {{ t('Settings.SignIn') }}
            </Button>
          </template>
        </div>
      </template>
    </PopoutMenu>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Avatar, Button, PopoutMenu, LogOutIcon, LogInIcon, Modal } from 'omorphia'

import { useTheming } from '@/store/state'
import { useModrinthAuth } from '@/store/mr_auth.js'

import ModrinthLoginScreen from '@/components/ui/tutorial/ModrinthLoginScreen.vue'
import { storeToRefs } from 'pinia'
import { i18n } from '@/main.js';
const t = i18n.global.t;
const themeStore = useTheming()
const mrAuth = useModrinthAuth()
const { auth } = storeToRefs(mrAuth)
const accountImage = ref(null)

const modrinthLoginModal = ref(null)

const signInAfter = async () => {
  modrinthLoginModal.value?.hide()
  await mrAuth.get()
}

const getAvatarImage = (auth) => {
  if (auth?.user) {
    accountImage.value = auth?.user?.avatar_url;
  } else {
    accountImage.value = `https://cdn.discordapp.com/attachments/1006329469428043846/1200633903506018434/qzJ1vLioGvxrXAL8.png`
  }
}
</script>

<style scoped lang="scss">
.account-dropdown {
  width: 100%;
}

.selection-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;

  width: max-content;

  .btn {
    width: 100%;
    justify-content: start;
  }
}

:deep {
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
