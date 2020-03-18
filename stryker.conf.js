module.exports = function(config) {
  config.set({
    plugins: [
      '@stryker-mutator/*',
      __dirname + '/util/stryker-ttypescript/index.js',
    ],

    mutator: "typescript",
    packageManager: "npm",
    reporters: ["clear-text", "progress"],
    testRunner: "mocha",
    transpilers: ["ttypescript"],
    testFramework: "mocha",
    coverageAnalysis: "perTest",
    tsconfigFile: "tsconfig.json",
    mutate: [
      "modules/**/*.ts",
      "!modules/**/*.test.ts",
      "!modules/**/*.mock.ts",
      "!modules/**/mock.ts",
      "!modules/**/index.ts",
    ],

    mochaOptions: {
      // After transpilation
      spec: ['dist/modules/**/*.test.js'],
    },
  });
};
