<template>
  <div
    v-if="mode !== 'isolated'"
    ref="button"
    v-tooltip.right="t('AccountsCard.MinecraftAccounts')"
    class="button-base avatar-button"
    :class="{ expanded: mode === 'expanded' }"
    @click="showCard = !showCard"
  >
    <Avatar
      :size="mode === 'expanded' ? 'xs' : 'sm'"
      :src="
        selectedAccount
          ? `https://mc-heads.net/avatar/${selectedAccount.username}/128`
          : 'https://launcher-files.modrinth.com/assets/steve_head.png'
      "
    />
  </div>
  <transition name="fade">
    <Card
      v-if="showCard || mode === 'isolated'"
      ref="card"
      class="account-card"
      :class="{ expanded: mode === 'expanded', isolated: mode === 'isolated' }"
    >
      <div v-if="selectedAccount" class="selected account">
        <Avatar size="xs" :src="`https://mc-heads.net/avatar/${selectedAccount.username}/128`" />
        <div>
          <h4 class="account-type">{{ selectedAccount.username }}
            <component :is="printAccountType(selectedAccount)" class="account-type" />
          </h4>
          <p>{{ t('AccountsCard.Active') }}</p>
        </div>
        <Button v-tooltip="t('AccountsCard.Logout')" class="trash-icon-selected-fix" icon-only color="raised" @click="logout(selectedAccount.id)">
          <TrashIcon/>
        </Button>
      </div>
      <div v-else class="logged-out account">
        <h4>{{ t('AccountsCard.NoAccount') }}</h4>
        <div class="trash-icon-selected-fix account-no-account-fix">
        <Button v-tooltip="t('AccountsCard.LoginLicense')" icon-only color="secondary" @click="login()">
          <MicrosoftIcon class="account-type-no-account"/>
        </Button>
        <Button v-tooltip="t('AccountsCard.LoginOffline')" icon-only color="secondary" @click="loginOffline()">
          <PirateIcon class="account-type-no-account"/>
        </Button>
        </div>
      </div>

      <div v-if="displayAccounts.length > 0" class="account-group">
        <div v-for="account in displayAccounts" :key="account.id" class="account-row">
          <Button class="option account" @click="setAccount(account)">
            <Avatar :src="`https://mc-heads.net/avatar/${account.username}/128`" class="icon" />
            <p class="account-type">{{ account.username }}
              <component :is="printAccountType(account)" class="account-type" />
            </p>
          </Button>
          <Button v-tooltip="t('AccountsCard.Logout')" class="account-buttons-fix" icon-only @click="logout(account.id)">
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div v-if="accounts.length > 0" class="logged-out account-fix account">
        <Button @click="login()">
          <MicrosoftIcon />
          {{ t('AccountsCard.License') }}
        </Button>
        <Button @click="loginOffline()">
          <PirateIcon />
          {{ t('AccountsCard.Pirate') }}
        </Button>
      </div>
    </Card>
  </transition>
  <Modal ref="loginModal" class="modal" :header="t('AccountsCard.AuthOnline')" :noblur="!themeStore.advancedRendering">
    <div class="modal-body">
      <QrcodeVue :value="loginUrl" class="qr-code" margin="3" size="160" />
      <div class="modal-text">
        <div class="label">{{ t('AccountsCard.CopyThis') }}</div>
        <div class="code-text">
          <div class="code">
            {{ loginCode }}
          </div>
          <Button
            v-tooltip="t('AccountsCard.CopyCode')"
            icon-only
            large
            color="raised"
            @click="() => clipboardWrite(loginCode)"
          >
            <ClipboardCopyIcon />
          </Button>
        </div>
        <div>{{ t('AccountsCard.PasteMS') }}</div>
        <div class="iconified-input">
          <LogInIcon />
          <input type="text" :value="loginUrl" readonly />
          <Button
            v-tooltip="t('AccountsCard.CopyLink')"
            icon-only
            color="raised"
            @click="() => clipboardWrite(loginUrl)"
          >
            <GlobeIcon />
          </Button>
        </div>
      </div>
    </div>
  </Modal>
  <Modal ref="loginOfflineModal" class="modal" :header="t('AccountsCard.AuthOffline')">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.Username') }}</div>
      <input type="text" v-model="playerName" :placeholder="t('AccountsCard.UsernamePl')" />
      <Button v-tooltip="t('AccountsCard.Add')" icon-only color="secondary" @click="tryLoginOffline()">
        <PlusIcon />
      </Button>

    </div>
  </Modal>
  <Modal ref="loginErrorModal" class="modal" :header="t('AccountsCard.InputError')">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.TryAgainError') }}</div>
      <Button color="primary" @click="tryAgainLoginOffline()">
        {{ t('AccountsCard.TryAgain') }}
      </Button>
    </div>
  </Modal>
  <Modal ref="unexpectedErrorModal" class="modal" header="Ошибка">
    <div class="modal-body">
      <div class="label">{{ t('AccountsCard.UnexpectedError') }}</div>
    </div>
  </Modal>
</template>


<script setup>
import { i18n } from '@/main.js'
import { Avatar, Button, Card, ClipboardCopyIcon, GlobeIcon, LogInIcon, Modal, PlusIcon, TrashIcon } from 'omorphia'

import MicrosoftIcon from './render/Microsoft.vue'
import PirateIcon from './render/Pirate.vue'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import {
  authenticate_await_completion,
  authenticate_begin_flow,
  offline_authenticate_await_completion,
  remove_user,
  users
} from '@/helpers/auth'
import { get, set } from '@/helpers/settings'
import { handleError } from '@/store/state.js'
import { useTheming } from '@/store/theme.js'
import { mixpanel_track } from '@/helpers/mixpanel'
import QrcodeVue from 'qrcode.vue'
import { process_listener } from '@/helpers/events'

const t = i18n.global.t

defineProps({
  mode: {
    type: String,
    required: true,
    default: 'normal'
  }
})


const emit = defineEmits(['change'])

const loginCode = ref(null)

const themeStore = useTheming()
const settings = ref({})
const accounts = ref([])
const loginUrl = ref('')
const loginModal = ref(null)
const loginOfflineModal = ref(null)
const loginErrorModal = ref(null)
const unexpectedErrorModal = ref(null)
const playerName = ref('')

async function refreshValues() {
  settings.value = await get().catch(handleError)
  accounts.value = await users().catch(handleError)
}

defineExpose({
  refreshValues
})
await refreshValues()

const displayAccounts = computed(() =>
  accounts.value.filter((account) => settings.value.default_user !== account.id)
)

const selectedAccount = computed(() =>
  accounts.value.find((account) => account.id === settings.value.default_user)
)

async function setAccount(account) {
  settings.value.default_user = account.id
  await set(settings.value).catch(handleError)
  emit('change')
}

function printAccountType(account) {
  if (account.access_token == 'null') {
    return PirateIcon
  } else {
    return MicrosoftIcon
  }
}

const clipboardWrite = async (a) => {
  navigator.clipboard.writeText(a)
}

async function login() {
  const loginSuccess = await authenticate_begin_flow().catch(handleError)

  loginModal.value.show()
  loginCode.value = loginSuccess.user_code
  loginUrl.value = loginSuccess.verification_uri
  await window.__TAURI_INVOKE__('tauri', {
    __tauriModule: 'Shell',
    message: {
      cmd: 'open',
      path: loginSuccess.verification_uri
    }
  })

  const loggedIn = await authenticate_await_completion().catch(handleError)
  loginModal.value.hide()

  if (loggedIn) {
    await setAccount(loggedIn)
    await refreshValues()
  }

  loginModal.value.hide()
  mixpanel_track('AccountLogIn')
}


async function loginOffline() {
  loginOfflineModal.value.show()
}


async function tryLoginOffline() { // By AstralRinth
  let name = playerName.value
  if (name.length > 1 && name.length < 20 && name !== '') {
    const loggedIn = await offline_authenticate_await_completion(name).catch(handleError)
    loginOfflineModal.value.hide()
    if (loggedIn) {
      await setAccount(loggedIn)
      await refreshValues()
    } else {
      unexpectedErrorModal.value.show()
    }
    playerName.value = ''
    mixpanel_track('AccountLogIn')
  } else {
    playerName.value = ''
    loginOfflineModal.value.hide()
    loginErrorModal.value.show()
  }
}

function tryAgainLoginOffline() {
  loginErrorModal.value.hide()
  loginOffline()
}


const logout = async (id) => {
  await remove_user(id).catch(handleError)
  await refreshValues()
  if (!selectedAccount.value && accounts.value.length > 0) {
    await setAccount(accounts.value[0])
    await refreshValues()
  } else {
    emit('change')
  }
  mixpanel_track('AccountLogOut')
}

let showCard = ref(false)
let card = ref(null)
let button = ref(null)
const handleClickOutside = (event) => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY)
  if (
    card.value &&
    card.value.$el !== event.target &&
    !elements.includes(card.value.$el) &&
    !button.value.contains(event.target)
  ) {
    showCard.value = false
  }
}

const unlisten = await process_listener(async (e) => {
  if (e.event === 'launched') {
    await refreshValues()
  }
})

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  unlisten()
})
</script>

<style scoped lang="scss">
.selected {
  background: var(--color-brand-highlight);
  border-radius: var(--radius-lg);
  color: var(--color-contrast);
  margin-right: 0.5rem;
  gap: 1rem;
}

.logged-out {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  gap: 0.5rem;
}

.account {
  width: auto;
  display: flex;
  align-items: center;
  text-align: left;
  padding: 0.5rem 0.5rem;

  h4,
  p {
    margin: 0;
  }
}

.account-type {
  display: inline-flex;
  margin-left: 0.3rem;
}

.account-type-no-account {
  display: inline-flex;
  margin-left: 0.7rem;
}

.account-fix {
  width: auto;
  margin: auto;
}

.account-no-account-fix {
  width: auto;
  margin-left: auto;
  gap: 0.5rem;
}

.account-buttons-fix {
  margin: auto;
  display: flex;
}

.trash-icon-selected-fix {
  display: flex;
  margin-left: auto;
}

.trash-icon-selected-fix {
  display: flex;
  margin-left: auto;
}

.account-card {
  width: 32%; // Change this percent value for rescale AccountsCard.vue window
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 0.5rem;
  left: 5.5rem;
  z-index: 11;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--color-button-bg);
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  max-height: 98vh;
  overflow-y: auto;

  &::-webkit-scrollbar-track {
    border-top-right-radius: 1rem;
    border-bottom-right-radius: 1rem;
  }

  &::-webkit-scrollbar {
    border-top-right-radius: 1rem;
    border-bottom-right-radius: 1rem;
  }

  &.hidden {
    display: none;
  }

  &.expanded {
    left: 13.5rem;
  }

  &.isolated {
    position: relative;
    left: 0;
    top: 0;
  }
}

.accounts-title {
  font-size: 1.2rem;
  font-weight: bolder;
}

.account-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option {
  width: calc(100% - 2.25rem);
  background: var(--color-raised-bg);
  color: var(--color-base);
  box-shadow: none;

  img {
    margin-right: 0.5rem;
  }
}

.icon {
  --size: 1.5rem !important;
}

.account-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  vertical-align: center;
  justify-content: space-between;
  padding-right: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.avatar-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-base);
  background-color: var(--color-raised-bg);
  border-radius: var(--radius-md);
  width: 100%;
  text-align: left;

  &.expanded {
    border: 1px solid var(--color-button-bg);
    padding: 1rem;
  }
}

.avatar-text {
  margin: auto 0 auto 0.25rem;
  display: flex;
  flex-direction: column;
}

.text {
  width: 6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.accounts-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
}

.qr-code {
  background-color: white !important;
  border-radius: var(--radius-md);
}

.modal-body {
  display: flex;
  flex-direction: row;
  gap: var(--gap-lg);
  align-items: center;
  padding: var(--gap-xl);

  .modal-text {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);
    width: 100%;

    h2,
    p {
      margin: 0;
    }

    .code-text {
      display: flex;
      flex-direction: row;
      gap: var(--gap-xs);
      align-items: center;

      .code {
        background-color: var(--color-bg);
        border-radius: var(--radius-md);
        border: solid 1px var(--color-button-bg);
        font-family: var(--mono-font);
        letter-spacing: var(--gap-md);
        color: var(--color-contrast);
        font-size: 2rem;
        font-weight: bold;
        padding: var(--gap-sm) 0 var(--gap-sm) var(--gap-md);
      }

      .btn {
        width: 2.5rem;
        height: 2.5rem;
      }
    }
  }
}

.button-row {
  display: flex;
  flex-direction: row;
}

.modal {
  position: absolute;
}

.code {
  color: var(--color-brand);
  padding: 0.05rem 0.1rem;
  // row not column
  display: flex;

  .card {
    background: var(--color-base);
    color: var(--color-contrast);
    padding: 0.5rem 1rem;
  }
}
</style>
