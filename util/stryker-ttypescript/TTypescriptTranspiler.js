"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = require("@stryker-mutator/api/plugin");
const tsHelpers_1 = require("@stryker-mutator/typescript/src/helpers/tsHelpers");
const TranspileFilter_1 = require("./transpiler/TranspileFilter");
const TranspilingLanguageService_1 = require("./transpiler/TranspilingLanguageService");
class TTypescriptTranspiler {
    constructor(options, produceSourceMaps, getLogger) {
        this.options = options;
        this.produceSourceMaps = produceSourceMaps;
        this.getLogger = getLogger;
        tsHelpers_1.guardTypescriptVersion();
        this.filter = TranspileFilter_1.default.create(this.options);
    }
    transpile(files) {
        const typescriptFiles = this.filterIsIncluded(files);
        if (this.languageService) {
            this.languageService.replace(typescriptFiles);
        }
        else {
            this.languageService = this.createLanguageService(typescriptFiles);
        }
        const error = this.languageService.getSemanticDiagnostics(typescriptFiles);
        if (error.length) {
            return Promise.reject(new Error(error));
        }
        else {
            const resultFiles = this.transpileFiles(files);
            return Promise.resolve(resultFiles);
        }
    }
    filterIsIncluded(files) {
        return files.filter(file => this.filter.isIncluded(file.name));
    }
    createLanguageService(typescriptFiles) {
        const tsConfig = tsHelpers_1.getTSConfig(this.options);
        const compilerOptions = (tsConfig && tsConfig.options) || {};
        return new TranspilingLanguageService_1.default(compilerOptions, typescriptFiles, tsHelpers_1.getProjectDirectory(this.options), this.produceSourceMaps, this.getLogger);
    }
    transpileFiles(files) {
        let isSingleOutput = false;
        const fileDictionary = {};
        files.forEach(file => (fileDictionary[file.name] = file));
        files.forEach(file => {
            if (!tsHelpers_1.isHeaderFile(file.name)) {
                if (this.filter.isIncluded(file.name)) {
                    // File is to be transpiled. Only emit if more output is expected.
                    if (!isSingleOutput) {
                        const emitOutput = this.languageService.emit(file.name);
                        isSingleOutput = emitOutput.singleResult;
                        emitOutput.outputFiles.forEach(file => (fileDictionary[file.name] = file));
                    }
                    // Remove original file
                    delete fileDictionary[file.name];
                }
            }
        });
        return Object.keys(fileDictionary).map(name => fileDictionary[name]);
    }
}
exports.default = TTypescriptTranspiler;
TTypescriptTranspiler.inject = plugin_1.tokens(plugin_1.commonTokens.options, plugin_1.commonTokens.produceSourceMaps, plugin_1.commonTokens.getLogger);
