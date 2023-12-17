import { defineStore } from 'pinia';
import { i18n } from '@/main.js';

export const useLanguage = defineStore('languageStore', {
  state: () => ({
    languageOptions: ['russian', 'english'],
    selectedLanguage: 'english',
  }),
  actions: {
    setLanguageState(newLanguage) {

      if (this.languageOptions.includes(rewriteString(newLanguage))) {
        this.selectedLanguage = rewriteString(newLanguage);
      } else {
        console.warn('Selected language is not present. Check languageOptions. ' + this.selectedLanguage);
      }

      this.setLanguageClass();
    },
    setLanguageClass() {
      i18n.global.locale = rewriteString(this.selectedLanguage);
    },
    setupWatcher() {
      this.$watch(
        () => i18n.global.locale,
        (newLanguage) => {
          console.log('Language changed globally and rewritted in settings:', rewriteString(newLanguage));
        }
      );
    },
  },
  onInit() {
    this.setupWatcher();
  },
});

function rewriteString(string) {
  return string.toLowerCase()
}
