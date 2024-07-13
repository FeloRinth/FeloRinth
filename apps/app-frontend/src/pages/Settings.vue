<script setup>
import { ref, watch } from 'vue'
import { DownloadIcon, LogOutIcon, LogInIcon, BoxIcon, FolderSearchIcon, UpdatedIcon } from '@modrinth/assets'
import { Card, Slider, DropdownSelect, Toggle, Modal, Button } from '@modrinth/ui'
import { handleError, useTheming } from '@/store/state'
import { is_dir_writeable, change_config_dir, get, set } from '@/helpers/settings'
import { get_max_memory } from '@/helpers/jre'

import { useModrinthAuth } from '@/store/mr_auth.js'

import JavaSelector from '@/components/ui/JavaSelector.vue'
import ModrinthLoginScreen from '@/components/ui/tutorial/ModrinthLoginScreen.vue'
import { mixpanel_opt_out_tracking, mixpanel_opt_in_tracking } from '@/helpers/mixpanel'
import { open } from '@tauri-apps/api/dialog'
import { getOS } from '@/helpers/utils.js'
import { version, patch_version, development_build } from '../../package.json'
import { useLanguage } from '@/store/language.js'
import { i18n } from '@/main.js';
import { PirateShip } from '@/assets/render/index.js'
import { blockDownload, buildInstalling, forceRefreshRemote, getBranches, hrefAstralium, latestBetaCommitLink, latestBetaCommitTruncatedSha } from '@/helpers/update.js'
const t = i18n.global.t;
import { storeToRefs } from 'pinia'

const pageOptions = ['Home', 'Library']

const themeStore = useTheming()
const languageStore = useLanguage()

const accessSettings = async () => {
  const settings = await get()

  settings.javaArgs = settings.custom_java_args.join(' ')
  settings.envArgs = settings.custom_env_args.map((x) => x.join('=')).join(' ')

  return settings
}

const fetchSettings = await accessSettings().catch(handleError)

const settings = ref(fetchSettings)
const settingsDir = ref(settings.value.loaded_config_dir)
const maxMemory = ref(Math.floor((await get_max_memory().catch(handleError)) / 1024))

watch(
  settings,
  async (oldSettings, newSettings) => {
    if (oldSettings.loaded_config_dir !== newSettings.loaded_config_dir) {
      return
    }

    const setSettings = JSON.parse(JSON.stringify(newSettings))

    if (setSettings.opt_out_analytics) {
      mixpanel_opt_out_tracking()
    } else {
      mixpanel_opt_in_tracking()
    }

    for (const [key, value] of Object.entries(setSettings.java_globals)) {
      if (value?.path === '') {
        value.path = undefined
      }

      if (value?.path) {
        value.path = value.path.replace('java.exe', 'javaw.exe')
      }

      console.log(`${key}: ${value}`)
    }

    setSettings.custom_java_args = setSettings.javaArgs.trim().split(/\s+/).filter(Boolean)
    setSettings.custom_env_args = setSettings.envArgs
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => x.split('=').filter(Boolean))

    if (!setSettings.hooks.pre_launch) {
      setSettings.hooks.pre_launch = null
    }
    if (!setSettings.hooks.wrapper) {
      setSettings.hooks.wrapper = null
    }
    if (!setSettings.hooks.post_exit) {
      setSettings.hooks.post_exit = null
    }

    await set(setSettings)
  },
  { deep: true },
)

const mrAuth = useModrinthAuth()
const { auth } = storeToRefs(mrAuth)
const loginScreenModal = ref()

async function signInAfter() {
  loginScreenModal.value.hide()
  await mrAuth.get()
}

async function findLauncherDir() {
  const newDir = await open({
    multiple: false,
    directory: true,
    title: t('Settings.SelectANewAppDirectory'),
  })

  const writeable = await is_dir_writeable(newDir)

  if (!writeable) {
    handleError('The selected directory does not have proper permissions for write access.')
    return
  }

  if (newDir) {
    settingsDir.value = newDir
    await refreshDir()
  }
}

async function refreshDir() {
  await change_config_dir(settingsDir.value)
  settings.value = await accessSettings().catch(handleError)
  settingsDir.value = settings.value.loaded_config_dir
}

const confirmUpdate = ref(null)

await forceRefreshRemote(false, false)
await getBranches()
const confirmUpdating = async () => {
  confirmUpdate.value.show()
}
const approvedUpdating = async () => {
  confirmUpdate.value.hide()
  await forceRefreshRemote(true, true)
}
</script>

<template>
  <div class="settings-page">
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.GeneralSettings') }}</span>
        </h3>
      </div>
      <Modal ref="loginScreenModal" class="login-screen-modal" :noblur="!themeStore.advancedRendering">
        <ModrinthLoginScreen :modal="true" :prev-page="signInAfter" :next-page="signInAfter" />
      </Modal>
      <div class="adjacent-input">
        <label for="theme">
          <span class="label__title">{{ t('Settings.ManageAccount') }}</span>
          <span v-if="auth" class="label__description">
            {{ t('Settings.YouAreCurrentlyLoggedInAs') }} {{ auth?.user.username }}.
          </span>
          <span v-else> {{ t('Settings.SignInToYourModrinthAccount') }} </span>
        </label>
        <button v-if="auth" class="btn" @click="mrAuth.logout()">
          <LogOutIcon />
          {{ t('Settings.SignOut') }}
        </button>
        <button v-else class="btn" @click="$refs.loginScreenModal.show()">
          <LogInIcon />
          {{ t('Settings.SignIn') }}
        </button>
      </div>
      <label for="theme">
        <span class="label__title">{{ t('Settings.AppDirectory') }}</span>
        <span class="label__description">
          {{ t('Settings.TheDirectoryWhereTheLauncherStoresAllOfItsFiles') }}

        </span>
      </label>
      <div class="app-directory">
        <div class="iconified-input">
          <BoxIcon />
          <input id="appDir" v-model="settingsDir" type="text" class="input" />
          <Button class="r-btn" @click="findLauncherDir">
            <FolderSearchIcon />
          </Button>
        </div>
        <Button large @click="refreshDir">
          <UpdatedIcon />
          {{ t('Settings.Refresh') }}
        </Button>
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Display') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="theme">
          <span class="label__title">{{ t('Settings.ColorTheme') }}</span>
          <span class="label__description">{{ t('Settings.ChangeColor') }}</span>
        </label>
        <DropdownSelect id="theme" name="Theme dropdown" :options="themeStore.themeOptions"
          :default-value="settings.theme" :model-value="settings.theme" class="theme-dropdown" @change="(e) => {
            themeStore.setThemeState(e.option.toLowerCase())
            settings.theme = themeStore.selectedTheme
          }
            " />
      </div>

      <div class="adjacent-input">
        <label for="language">
          <span class="label__title">{{ t('Settings.Language') }}</span>
          <span class="label__description">{{ t('Settings.ChangeTheGlobalLauncherLanguages') }}</span>
        </label>
        <DropdownSelect id="language" name="Language dropdown" :options="languageStore.languageOptions"
          :default-value="settings.language" :model-value="settings.language" class="language-dropdown" @change="(e) => {
            languageStore.setLanguageState(e.option.toLowerCase())
            settings.language = languageStore.selectedLanguage
          }
            " />
      </div>

      <div class="adjacent-input">
        <label for="advanced-rendering">
          <span class="label__title">{{ t('Settings.AdvancedRendering') }}</span>
          <span class="label__description">
            {{ t('Settings.EnablesAdvancedRendering') }}
          </span>
        </label>
        <Toggle id="advanced-rendering" :model-value="themeStore.advancedRendering"
          :checked="themeStore.advancedRendering" @update:model-value="(e) => {
            themeStore.advancedRendering = e
            settings.advanced_rendering = themeStore.advancedRendering
          }
            " />
      </div>
      <div class="adjacent-input">
        <label for="minimize-launcher">
          <span class="label__title">{{ t('Settings.MinimizeLauncher') }}</span>
          <span class="label__description">{{ t('Settings.MinimizeTheLauncher') }}</span>
        </label>
        <Toggle id="minimize-launcher" :model-value="settings.hide_on_process" :checked="settings.hide_on_process"
          @update:model-value="(e) => {
            settings.hide_on_process = e
          }
            " />
      </div>
      <div v-if="getOS() != 'MacOS'" class="adjacent-input">
        <label for="native-decorations">
          <span class="label__title">{{ t('Settings.NativeDecorations') }}</span>
          <span class="label__description">{{ t('Settings.UseSystemWindowFrame') }}</span>
        </label>
        <Toggle id="native-decorations" :model-value="settings.native_decorations"
          :checked="settings.native_decorations" @update:model-value="(e) => {
            settings.native_decorations = e
          }
            " />
      </div>
      <div class="adjacent-input">
        <label for="opening-page">
          <span class="label__title">{{ t('Settings.DefaultLandingPage') }}</span>
          <span class="label__description">{{ t('Settings.ChangeThePageToWhichTheLauncherOpensOn') }}</span>
        </label>
        <DropdownSelect id="opening-page" name="Opening page dropdown" :options="pageOptions"
          :default-value="settings.default_page" :model-value="settings.default_page" class="opening-page" @change="(e) => {
            settings.default_page = e.option
          }
            " />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.ResourceManagement') }}</span>
        </h3>
      </div>

      <div class="adjacent-input">
        <label for="max-downloads">
          <span class="label__title">{{ t('Settings.Mcd') }}</span>
          <span class="label__description">{{ t('Settings.McdDesc') }}</span>
        </label>
        <Slider id="max-downloads" v-model="settings.max_concurrent_downloads" :min="1" :max="10" :step="1" />
      </div>

      <div class="adjacent-input">
        <label for="max-writes">
          <span class="label__title">{{ t('Settings.Mcw') }}</span>
          <span class="label__description">{{ t('Settings.McwDesc') }}</span>
        </label>
        <Slider id="max-writes" v-model="settings.max_concurrent_writes" :min="1" :max="50" :step="1" />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Privacy') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="opt-out-analytics">
          <span class="label__title">{{ t('Settings.DisableAnalytics') }}</span>
          <span class="label__description">
            {{ t('Settings.AnalyticsDesc') }}
          </span>
        </label>
        <Toggle id="opt-out-analytics" :disabled="settings.opt_out_analytics" :model-value="settings.opt_out_analytics"
          :checked="settings.opt_out_analytics" @update:model-value="(e) => {
            settings.opt_out_analytics = e
          }
            " />
      </div>
      <div class="adjacent-input">
        <label for="disable-discord-rpc">
          <span class="label__title">{{ t('Settings.DisableRPC') }}</span>
          <span class="label__description">
            {{ t('Settings.DisableRPCDesc') }}
          </span>
        </label>
        <Toggle id="disable-discord-rpc" v-model="settings.disable_discord_rpc"
          :checked="settings.disable_discord_rpc" />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.JavaSet') }}</span>
        </h3>
      </div>
      <label for="java-21">
        <span class="label__title">{{ t('Settings.Java21Location') }}</span>
      </label>
      <JavaSelector id="java-17" v-model="settings.java_globals.JAVA_21" :version="21" />
      <label for="java-17">
        <span class="label__title">{{ t('Settings.Java17Location') }}</span>
      </label>
      <JavaSelector id="java-17" v-model="settings.java_globals.JAVA_17" :version="17" />
      <label for="java-8">
        <span class="label__title">{{ t('Settings.Java8Location') }}</span>
      </label>
      <JavaSelector id="java-8" v-model="settings.java_globals.JAVA_8" :version="8" />
      <hr class="card-divider" />
      <label for="java-args">
        <span class="label__title">{{ t('Settings.JavaArgs') }}</span>
      </label>
      <input id="java-args" v-model="settings.javaArgs" autocomplete="off" type="text" class="installation-input"
        :placeholder="t('Settings.EnterJavaArgs')" />
      <label for="env-vars">
        <span class="label__title">{{ t('Settings.EnvVars') }}</span>
      </label>
      <input id="env-vars" v-model="settings.envArgs" autocomplete="off" type="text" class="installation-input"
        :placeholder="t('Settings.EnterEnvVars')" />
      <hr class="card-divider" />
      <div class="adjacent-input">
        <label for="max-memory">
          <span class="label__title">{{ t('Settings.JavaMem') }}</span>
          <span class="label__description">
            {{ t('Settings.JavaMemDesc') }}
          </span>
        </label>
        <Slider id="max-memory" v-model="settings.memory.maximum" :min="8" :max="maxMemory" :step="64" unit="mb" />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.Hooks') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="pre-launch">
          <span class="label__title">{{ t('Settings.PreLaunch') }}</span>
          <span class="label__description">{{ t('Settings.PreLaunchDesc') }}</span>
        </label>
        <input id="pre-launch" v-model="settings.hooks.pre_launch" autocomplete="off" type="text"
          :placeholder="t('Settings.EnterPreLaunch')" />
      </div>
      <div class="adjacent-input">
        <label for="wrapper">
          <span class="label__title">{{ t('Settings.Wrapper') }}</span>
          <span class="label__description">{{ t('Settings.WrapperDesc') }}</span>
        </label>
        <input id="wrapper" v-model="settings.hooks.wrapper" autocomplete="off" type="text"
          :placeholder="t('Settings.EnterWrapper')" />
      </div>
      <div class="adjacent-input">
        <label for="post-exit">
          <span class="label__title">{{ t('Settings.PostExit') }}</span>
          <span class="label__description">{{ t('Settings.PostExitDesc') }}</span>
        </label>
        <input id="post-exit" v-model="settings.hooks.post_exit" autocomplete="off" type="text"
          :placeholder="t('Settings.EnterPostExit')" />
      </div>
    </Card>
    <Card>
      <div class="label">
        <h3>
          <span class="label__title size-card-header">{{ t('Settings.WindowSize') }}</span>
        </h3>
      </div>
      <div class="adjacent-input">
        <label for="fullscreen">
          <span class="label__title">{{ t('Settings.FullScreen') }}</span>
          <span class="label__description">
            {{ t('Settings.FullScreenDesc') }}
          </span>
        </label>
        <Toggle id="fullscreen" :model-value="settings.force_fullscreen" :checked="settings.force_fullscreen"
          @update:model-value="(e) => {
            settings.force_fullscreen = e
          }
            " />
      </div>
      <div class="adjacent-input">
        <label for="width">
          <span class="label__title">{{ t('Settings.Width') }}</span>
          <span class="label__description">{{ t('Settings.WidthDesc') }}</span>
        </label>
        <input id="width" v-model="settings.game_resolution[0]" :disabled="settings.force_fullscreen" autocomplete="off"
          type="number" :placeholder="t('Settings.EnterWidth')" />
      </div>
      <div class="adjacent-input">
        <label for="height">
          <span class="label__title">{{ t('Settings.Height') }}</span>
          <span class="label__description">{{ t('Settings.HeightDesc') }}</span>
        </label>
        <input id="height" v-model="settings.game_resolution[1]" :disabled="settings.force_fullscreen"
          autocomplete="off" type="number" class="input" :placeholder="t('Settings.EnterHeight')" />
      </div>
    </Card>
    <Card>
      <div class="label inline-fix">
        <h3>
          <span class="label__title size-card-header in">{{ t('Settings.About') }}
            <p v-if="development_build" class="development option">{{ t('Settings.DevelopmentBuild') }}</p>
          </span>
        </h3>
      </div>
      <div>
        <label>
          <span class="label__title inl">AstralRinth
            <PirateShip /> Version
          </span>
          <span class="label__description">Modrinth/Theseus version: v{{ version }}. Patch version: v{{ patch_version }}
          </span>

          <span class="label__description">{{ t('Settings.LatestBetaCommit') }} <a class="github"
              :href="latestBetaCommitLink">{{
                latestBetaCommitTruncatedSha }}</a></span>
          <span class="label__description">{{ t('Settings.LatestAvailable') }} <a class="github"
              :href="hrefAstralium">{{ t('Settings.OurGithub') }}</a></span>

          <span class="label__title">Update Checker</span>

          <span class="label__description">{{ t('Settings.Remote') }} <p id="releaseData" class="cosmic inline-fix"></p>
          </span>
          <span class="label__description">{{ t('Settings.Local') }} <p class="cosmic inline-fix">v{{ version }}{{
            patch_version }}</p></span>
        </label>
        <div class="inline-item-group">
          <Button :disabled="blockDownload || buildInstalling" class="download"
            @click="confirmUpdating()">
            <DownloadIcon />{{ buildInstalling ? t('RunningAppBar.UpdateDownloading') : t('Settings.DownloadButton') }}
          </Button>
          <Button icon-only @click="forceRefreshRemote(false, false), getBranches()">
            <UpdatedIcon />
          </Button>
        </div>
      </div>
      <Modal ref="confirmUpdate" :has-to-type="false" :header="t('RunningAppBar.UpdatingHeader')">
        <div class="modal-body">
          <div class="markdown-body">
            <p>
              {{ t('RunningAppBar.UpdatingDesc') }}
            </p>
          </div>
          <div class="button-group push-right">
            <Button class="download-modal" @click="confirmUpdate.hide()"> {{ t('RunningAppBar.RejectUpdating')
              }}</Button>
            <Button class="download-modal" @click="approvedUpdating()">
              {{ t('RunningAppBar.AcceptUpdating') }}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.markdown-body {
  :deep(table) {
    width: auto;
  }

  :deep(hr),
  :deep(h1),
  :deep(h2) {
    max-width: max(60rem, 90%);
  }

  :deep(ul),
  :deep(ol) {
    margin-left: 2rem;
  }
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: var(--gap-lg);
  text-align: left;

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  strong {
    color: var(--color-contrast);
  }
}

.download-modal {
  color: #3e8cde;
  padding: var(--gap-sm) var(--gap-lg);
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.download-modal:hover,
.download-modal:focus,
.download-modal:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.option {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  width: auto;
  display: inline-flex;
  align-items: center;
  margin-top: auto;
  margin-left: 0.5rem;
  font-size: 1rem;
  padding: 0.5rem;
}

.development {
  color: #ff6a00;
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 1.5s ease;
}

.development:hover,
.development:focus,
.development:active {
  color: #4800d3;
  text-shadow: #801313;
}

.cosmic {
  color: #3e8cde;
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.cosmic:hover,
.cosmic:focus,
.cosmic:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.download {
  color: #3e8cde;
  border: none;
  padding: var(--gap-sm) var(--gap-lg);
  //background-color: rgba(0, 0, 0, 0.0);
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

.download:hover,
.download:focus,
.download:active {
  color: #10fae5;
  text-shadow: #26065e;
}

a.github {
  color: #3e8cde;
  text-decoration: none;
  text-shadow: 0 0 4px rgba(79, 173, 255, 0.5),
    0 0 8px rgba(14, 98, 204, 0.5),
    0 0 12px rgba(122, 31, 199, 0.5);
  transition: color 0.35s ease;
}

a.github:hover,
a.github:focus,
a.github:active {
  color: #10fae5;
  text-shadow: #26065e;
}

.inline-item-group {
  display: inline-flex;
  gap: 0.25rem;
}

.inline-fix {
  display: inline-flex;
  margin-top: -2rem;
  margin-bottom: -2rem;
  //margin-left: 0.3rem;
}

// .remote-update-fix {
//   display: inline-flex;

//   //width: ;
//   //margin-left: -0.2rem;
//   .iconified-input {
//     flex-grow: 1;

//     input {
//       flex-basis: auto;
//     }
//   }
// }

.settings-page {
  margin: 1rem;
}

.installation-input {
  width: 100% !important;
  flex-grow: 1;
}

.theme-dropdown {
  text-transform: capitalize;
}

.language-dropdown {
  text-transform: capitalize;
}

.card-divider {
  margin: 1rem 0;
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

.app-directory {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--gap-sm);

  .iconified-input {
    flex-grow: 1;

    input {
      flex-basis: auto;
    }
  }
}
</style>
