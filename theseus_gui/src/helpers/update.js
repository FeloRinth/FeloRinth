import { ref } from 'vue'
import { patch_version, version } from '../../package.json'
import { downloadBuild, getOS } from '@/helpers/utils.js'

export const blockDownload = ref(true)
export const buildInstalling = ref(false)
export const updateAvailable = ref(false)
export const hrefAstralium = 'https://www.astralium.su/get/ar'
// export const hrefGithubLatest = 'https://github.com/DIDIRUS4/AstralRinth/releases/latest'
const os = ref('')
const apiUrl = `https://api.github.com/repos/DIDIRUS4/AstralRinth/releases/latest`
const failedPattern = `Failed to fetch remote AR releases:`
const v = `v`
const localVersion = `${v}${version}${patch_version}`
const macExtension = `.dmg`
const windowsExtension = `.msi`
const linuxExtension = `.deb`

export async function forceRefreshRemote(disableElementId, autoUpdate) {
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch releases. Status: ${response.status}`)
      }
      return response.json()
    })
    .then(async (data) => {
      os.value = await getOS()
      const latestRelease = data.name
      let remoteVersion = undefined

      if (!disableElementId) {
        const releaseData = document.getElementById('releaseData')
        if (!releaseData) {
          console.error('Release data element not found.')
          return
        }
        releaseData.textContent = latestRelease
        remoteVersion = `${releaseData.textContent}`
      } else {
        remoteVersion = latestRelease
      }
      if (remoteVersion && remoteVersion.startsWith(localVersion)) {
        updateAvailable.value = false
        blockDownload.value = true
      } else if (remoteVersion && remoteVersion.startsWith(v)) {
        updateAvailable.value = true
        blockDownload.value = false
      } else {
        updateAvailable.value = false
        blockDownload.value = true
      }
      console.log('Update available state is', updateAvailable.value)
      console.log('Remote version is', remoteVersion)
      console.log('Operating System is', os.value)
      if (autoUpdate) {
        buildInstalling.value = true;
        let downloadUrl = undefined
        let fileName = undefined
        const buildType = data.assets
        if (os.value.toLowerCase() === 'MacOS'.toLowerCase()) {
          for (let i of buildType) {
            if (i.name.endsWith(macExtension)) {
              downloadUrl = i.browser_download_url
              fileName = i.name
              console.log(i.browser_download_url)
            }
          }

          await downloadBuild(downloadUrl, fileName, true)
        } else if (os.value.toLowerCase() === 'Windows'.toLowerCase()) {
          for (let i of buildType) {
            if (i.name.endsWith(windowsExtension)) {
              downloadUrl = i.browser_download_url
              fileName = i.name
              console.log(i.browser_download_url)
            }
          }

          await downloadBuild(downloadUrl, fileName, true)
        } else if (os.value.toLowerCase() === "Linux".toLowerCase()) {
          console.warn(
            "[AR Warning] • Due to some circumstances, we can't fully determine the structure and condition of your Linux OS," +
            " so we'll download the latest build for the latest ubuntu, that we've available. Installation is done manually")
          for (let i of buildType) {
            if (i.name.endsWith(linuxExtension)) {
              downloadUrl = i.browser_download_url
              fileName = i.name
              console.log(i.browser_download_url)
            }
          }
          await downloadBuild(downloadUrl, fileName, false)
        }
        buildInstalling.value = false;
        console.log(fileName)
        console.log(downloadUrl)
      }
    })
    .catch((error) => {
      console.error(failedPattern, error)
      if (!disableElementId) {
        const errorData = document.getElementById('releaseData')
        if (errorData) {
          errorData.textContent = `${error.message}`
        }
        updateAvailable.value = false
        blockDownload.value = true
      }
    })
}