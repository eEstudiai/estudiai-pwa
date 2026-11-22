const { withAppBuildGradle } = require("@expo/config-plugins");

function transformGradle(contents) {
  const oldPattern =
    /getDefaultProguardFile\(\s*(["'])proguard-android\.txt\1\s*\)/g;

  const optimizedPattern =
    /getDefaultProguardFile\(\s*(["'])proguard-android-optimize\.txt\1\s*\)/g;

  const oldMatches = [...contents.matchAll(oldPattern)];
  const optimizedMatches = [...contents.matchAll(optimizedPattern)];

  if (oldMatches.length > 1) {
    throw new Error(
      "[R8 preset] Mais de uma referência ao preset antigo. Build interrompido."
    );
  }

  if (oldMatches.length === 1) {
    return contents.replace(
      oldPattern,
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
  }

  if (optimizedMatches.length >= 1) {
    return contents;
  }

  throw new Error(
    "[R8 preset] Nenhum dos presets esperados foi encontrado em app/build.gradle. " +
    "Build interrompido para evitar alteração incorreta."
  );
}

function withR8OptimizePreset(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = transformGradle(
      config.modResults.contents
    );
    return config;
  });
}

module.exports = withR8OptimizePreset;
module.exports.transformGradle = transformGradle;