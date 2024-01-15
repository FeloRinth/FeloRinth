import { ref } from 'vue'
import { patch_version, version } from '../../package.json'

export const blockDownload = ref(true)
export const updateAvailable = ref(false)
const apiUrl = `https://api.github.com/repos/DIDIRUS4/AstralRinth/releases/latest`
export const hrefAstralium = "https://www.astralium.su/get/ar"
export const hrefGithubLatest = "https://github.com/DIDIRUS4/AstralRinth/releases/latest"
const failedPattern = `Failed to fetch remote AR releases:`
const v = `v`
const localVersion = `${v}${version}${patch_version}`

export async function forceRefreshRemote(disableElementId) {
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch releases. Status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
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