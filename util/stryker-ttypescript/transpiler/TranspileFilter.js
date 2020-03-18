"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsHelpers_1 = require("@stryker-mutator/typescript/src/helpers/tsHelpers");
/**
 * Represents a transpile filter. This is the component that decides on which files needs to be transpiled.
 *
 * It is implemented using the composite pattern.
 * If there is a tsConfig, that will be used. If not, a default is used (transpile all TS-like files)
 */
class TranspileFilter {
    static create(options) {
        const parsedCommandLine = tsHelpers_1.getTSConfig(options);
        if (parsedCommandLine) {
            return new TSConfigFilter(parsedCommandLine);
        }
        else {
            return new DefaultFilter();
        }
    }
}
exports.default = TranspileFilter;
/**
 * A transpile filter based on ts config
 */
class TSConfigFilter extends TranspileFilter {
    constructor({ fileNames }) {
        super();
        this.fileNames = fileNames.map(tsHelpers_1.normalizeFileFromTypescript);
    }
    isIncluded(fileName) {
        return this.fileNames.includes(fileName);
    }
}
exports.TSConfigFilter = TSConfigFilter;
/**
 * A default transpile filter based on file extension
 */
class DefaultFilter extends TranspileFilter {
    isIncluded(fileName) {
        return tsHelpers_1.isTypescriptFile(fileName);
    }
}
exports.DefaultFilter = DefaultFilter;
