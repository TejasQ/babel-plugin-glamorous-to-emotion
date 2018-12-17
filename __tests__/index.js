import pluginTester from "babel-plugin-tester";
import glamorousToEmotion, {MODES} from "../index.js";
import path from "path";

const sharedOptions = {
  plugin: glamorousToEmotion,
  babelOptions: {
    // taken from https://github.com/square/babel-codemod/blob/00ae5984e1b2ca2fac923011ce16157a29b12b39/src/AllSyntaxPlugin.ts
    parserOpts: {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      ranges: false,
      plugins: [
        "jsx",
        "asyncGenerators",
        "classProperties",
        "doExpressions",
        "exportExtensions",
        "functionBind",
        "functionSent",
        "objectRestSpread",
        "dynamicImport",
        "decorators",
      ],
    },
    babelrc: false,
    compact: false,
  },
};

pluginTester({
  ...sharedOptions,
  fixtures: path.join(__dirname, "__fixtures__", "shared"),
});

pluginTester({
  ...sharedOptions,
  fixtures: path.join(__dirname, "__fixtures__", "mode-withBabelPlugin"),
  pluginOptions: {
    mode: MODES.withBabelPlugin,
  },
});

pluginTester({
  ...sharedOptions,
  fixtures: path.join(__dirname, "__fixtures__", "mode-withJsxPragma"),
  pluginOptions: {
    mode: MODES.withJsxPragma,
  },
});

pluginTester({
  ...sharedOptions,
  fixtures: path.join(__dirname, "__fixtures__", "mode-className"),
  pluginOptions: {
    mode: MODES.className,
  },
});
