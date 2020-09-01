process.env.VUE_APP_VERSION = process.env.npm_package_version;

module.exports = {
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: false
    },
    electronBuilder: {
      builderOptions: {
        appId: "com.webtools.webtools-ng",        
        "extraResources": [
          {
            "from": "./public/locales",
            "to": "locales"
          }
        ],
        linux: {
          category: "Utility",
          icon: 'src/assets/WebTools-512.png'
        },
        win: {
          icon: 'src/assets/WebTools-512.png'
        }        
      }
    }
  }
}
