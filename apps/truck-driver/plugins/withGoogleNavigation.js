/**
 * Expo config plugin for @googlemaps/react-native-navigation-sdk.
 *
 * The package ships no config plugin, so this applies its native setup
 * during `expo prebuild` / EAS Build:
 *  - Android: Maps API key meta-data (via Expo's android.config.googleMaps),
 *    core library desugaring, Jetifier, minSdk 24 (via expo-build-properties)
 *  - iOS: GMSServices.provideAPIKey in AppDelegate, background location +
 *    audio modes so guidance keeps talking with the screen off
 */
const {
  withAppBuildGradle,
  withAppDelegate,
  withGradleProperties,
  withInfoPlist,
  createRunOncePlugin,
  WarningAggregator,
} = require('expo/config-plugins')
// Not re-exported by expo/config-plugins; resolved through expo's own dependency
const { mergeContents } = require(require.resolve('@expo/config-plugins/build/utils/generateCode', { paths: [require.resolve('expo/package.json')] }))

const DESUGAR_LIB = "com.android.tools:desugar_jdk_libs_nio:2.0.4"

function withAndroidDesugaring(config) {
  return withAppBuildGradle(config, cfg => {
    let src = cfg.modResults.contents
    if (!src.includes('coreLibraryDesugaringEnabled')) {
      src = mergeContents({
        tag: 'nav-sdk-desugaring',
        src,
        newSrc: '    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }',
        anchor: /^android\s*\{/m,
        offset: 1,
        comment: '//',
      }).contents
    }
    if (!src.includes(DESUGAR_LIB)) {
      src = mergeContents({
        tag: 'nav-sdk-desugar-lib',
        src,
        newSrc: `    coreLibraryDesugaring '${DESUGAR_LIB}'`,
        anchor: /^dependencies\s*\{/m,
        offset: 1,
        comment: '//',
      }).contents
    }
    cfg.modResults.contents = src
    return cfg
  })
}

function withJetifier(config) {
  return withGradleProperties(config, cfg => {
    const props = cfg.modResults
    const existing = props.find(p => p.type === 'property' && p.key === 'android.enableJetifier')
    if (existing) existing.value = 'true'
    else props.push({ type: 'property', key: 'android.enableJetifier', value: 'true' })
    return cfg
  })
}

function withIosApiKey(config, apiKey) {
  return withAppDelegate(config, cfg => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withGoogleNavigation expects a Swift AppDelegate (Expo SDK 53+)')
    }
    let src = cfg.modResults.contents
    src = mergeContents({
      tag: 'nav-sdk-import',
      src,
      newSrc: 'import GoogleMaps',
      anchor: /(@main|@UIApplicationMain)/,
      offset: 0,
      comment: '//',
    }).contents
    src = mergeContents({
      tag: 'nav-sdk-api-key',
      src,
      newSrc: `    GMSServices.provideAPIKey("${apiKey}")`,
      anchor: /\bsuper\.application\(\w+?, didFinishLaunchingWithOptions: \w+?\)/,
      offset: 0,
      comment: '//',
    }).contents
    cfg.modResults.contents = src
    return cfg
  })
}

function withBackgroundModes(config) {
  return withInfoPlist(config, cfg => {
    const modes = new Set(cfg.modResults.UIBackgroundModes ?? [])
    modes.add('location')
    modes.add('audio')
    cfg.modResults.UIBackgroundModes = [...modes]
    return cfg
  })
}

function withGoogleNavigation(config, { apiKey } = {}) {
  config = withAndroidDesugaring(config)
  config = withJetifier(config)
  config = withBackgroundModes(config)

  if (!apiKey) {
    // Still builds, but navigationController.init() returns NOT_AUTHORIZED
    WarningAggregator.addWarningForPlatform(
      'android', 'with-google-navigation',
      'GOOGLE_NAVIGATION_API_KEY is not set — turn-by-turn navigation will not work in this build',
    )
    return config
  }
  config.android = config.android ?? {}
  config.android.config = { ...config.android.config, googleMaps: { apiKey } }
  return withIosApiKey(config, apiKey)
}

module.exports = createRunOncePlugin(withGoogleNavigation, 'with-google-navigation', '1.0.0')
