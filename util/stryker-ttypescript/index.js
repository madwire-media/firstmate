"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("@stryker-mutator/api/plugin");
const TTypescriptTranspiler_1 = require("./TTypescriptTranspiler");
exports.strykerPlugins = [
    plugin_1.declareClassPlugin(plugin_1.PluginKind.Transpiler, 'ttypescript', TTypescriptTranspiler_1.default),
];
