import { ref } from 'vue'
import { patch_version, version } from '../../package.json'
import { downloadBuild, getOS } from '@/helpers/utils.js'

export const blockDownload = ref(true)
export const buildInstalling = ref(false)
export const updateAvailable = ref(false)
export const latestBetaCommitTruncatedSha = ref('')
export const latestBetaCommitLink = ref('')
export const hrefAstralium = 'https://www.astralium.su/get/ar'
const os = ref('')
const releaseLink = `https://api.github.com/repos/DIDIRUS4/AstralRinth/releases/latest`
const branchesLink = `https://api.github.com/repos/DIDIRUS4/AstralRinth/branches`
const failedFetchRelease = `Failed to fetch remote releases:`
const failedFetchCommit = `Failed to fetch remote commits:`
const v = `v`
const localVersion = `${v}${version}${patch_version}`
const macExtension = `.dmg`
const windowsExtension = `.msi`
const blacklistDevBuilds = `DEV_BUILD`

export async function getBranches() {
  fetch(branchesLink)
    .then(async (response) => {
      if (response.ok) {
        response.json().then((data) => {
          const branches = data.map((branch) => branch)
          branches.forEach(branch => {
            fetch(branch.commit.url)
              .then(async (data) => {
                if (data.ok) {
                  data.json().then((data) => {
                    const truncatedSha = data.sha.slice(0, 7)
                    const commitLink = data.html_url
                    if (branch.name.toLowerCase() == "beta".toLowerCase()) {
                      latestBetaCommitTruncatedSha.value = truncatedSha
                      latestBetaCommitLink.value = commitLink
                    }
                  })
                } else {
                  throw new Error(data.status)
                }
              })
          });
        })
      } else {
        throw new Error(response.status)
      }

    })
    .catch((error) => {
      latestBetaCommitTruncatedSha.value = error.message
      latestBetaCommitLink.value = undefined
      console.error(failedFetchCommit, error)
    })
}

export async function forceRefreshRemote(disableElementId, autoUpdate) {
  fetch(releaseLink)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.status)
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
      if (os.value.toLowerCase() == 'MacOS'.toLowerCase() || os.value.toLowerCase() == 'Windows'.toLowerCase()) {
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
      } else {
        updateAvailable.value = false
        blockDownload.value = true
      }
      console.log('Update available state is', updateAvailable.value)
      console.log('Remote version is', remoteVersion)
      console.log('Operating System is', os.value)

      if (autoUpdate) {
        buildInstalling.value = true;
        let fileName = null
        const buildType = data.assets
        if (os.value.toLowerCase() == 'MacOS'.toLowerCase()) {
          for (let i of buildType) {
            if (i.name.endsWith(macExtension) && !i.name.startsWith(blacklistDevBuilds)) {
              fileName = i.name
              console.log(i.browser_download_url)
              await downloadBuild(i.browser_download_url, fileName, os.value, true)
              break
            }
          }


        } else if (os.value.toLowerCase() == 'Windows'.toLowerCase()) {
          for (let i of buildType) {
            if (i.name.endsWith(windowsExtension) && !i.name.startsWith(blacklistDevBuilds)) {
              fileName = i.name
              console.log(i.browser_download_url)
              await downloadBuild(i.browser_download_url, fileName, os.value, true)
              break
            }
          }
        }
        // else if (os.value.toLowerCase() == "Linux".toLowerCase()) {
        //   console.warn(
        //     "[AR • Warning] • Due to some circumstances, we can't fully determine the structure and condition of your Linux OS," +
        //     " so we'll download the latest build for the latest ubuntu, that we've available. Installation is done manually")
        //   for (let i of buildType) {
        //     if (i.name.endsWith(linuxExtension) && !i.name.startsWith(blacklistDevBuilds)) {
        //       fileName = i.name
        //       console.log(i.browser_download_url)
        //       await downloadBuild(i.browser_download_url, fileName, os.value, false)
        //       break
        //     }
        //   }
        // }
        buildInstalling.value = false;
      }
    })
    .catch((error) => {
      console.error(failedFetchRelease, error)
      if (!disableElementId) {
        const errorData = document.getElementById('releaseData')
        if (errorData) {
          errorData.textContent = `${error.message}`
        }
        updateAvailable.value = false
        blockDownload.value = true
        buildInstalling.value = false;
      }
    })
}