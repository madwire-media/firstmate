"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const core_1 = require("@stryker-mutator/api/core");
const ts = require("ttypescript");
const flatMap = require("lodash.flatmap");
const tsHelpers_1 = require("@stryker-mutator/typescript/src/helpers/tsHelpers");
const ScriptFile_1 = require("./ScriptFile");
const libRegex = /^lib\.(?:\w|\.)*\.?d\.ts$/;
class TranspilingLanguageService {
    constructor(compilerOptions, rootFiles, projectDirectory, produceSourceMaps, getLogger) {
        this.projectDirectory = projectDirectory;
        this.produceSourceMaps = produceSourceMaps;
        this.files = Object.create(null);
        this.compilerOptions = this.adaptCompilerOptions(compilerOptions);
        rootFiles.forEach(file => (this.files[file.name] = new ScriptFile_1.default(file.name, file.textContent)));
        const host = this.createLanguageServiceHost();
        this.languageService = ts.createLanguageService(host);
        this.logger = getLogger(TranspilingLanguageService.name);
        this.diagnosticsFormatter = {
            getCanonicalFileName: fileName => fileName,
            getCurrentDirectory: () => projectDirectory,
            getNewLine: () => os.EOL
        };
    }
    /**
     * Adapts compiler options to emit sourceMap files and disable other options for performance reasons
     *
     * @param source The unchanged compiler options
     */
    adaptCompilerOptions(source) {
        const compilerOptions = Object.assign({}, source);
        compilerOptions.sourceMap = this.produceSourceMaps;
        compilerOptions.inlineSourceMap = false;
        compilerOptions.declaration = false;
        return compilerOptions;
    }
    /**
     * Replaces the content of the given text files
     * @param mutantCandidate The mutant used to replace the original source
     */
    replace(replacements) {
        replacements.forEach(replacement => this.files[replacement.name].replace(replacement.textContent));
    }
    getSemanticDiagnostics(files) {
        const fileNames = files.map(file => file.name);
        const errors = flatMap(fileNames, fileName => this.languageService.getSemanticDiagnostics(tsHelpers_1.normalizeFileForTypescript(fileName)));
        return ts.formatDiagnostics(errors, this.diagnosticsFormatter);
    }
    /**
     * Get the output text file for given source file
     * @param sourceFile Emit output file based on this source file
     * @return  Map<TextFile> Returns a map of source file names with their output files.
     *          If all output files are bundled together, only returns the output file once using the first file as key
     */
    emit(fileName) {
        const emittedFiles = this.languageService.getEmitOutput(fileName).outputFiles;
        const jsFile = emittedFiles.find(tsHelpers_1.isJavaScriptFile);
        const mapFile = emittedFiles.find(tsHelpers_1.isMapFile);
        if (jsFile) {
            const outputFiles = [new core_1.File(tsHelpers_1.normalizeFileFromTypescript(jsFile.name), jsFile.text)];
            if (mapFile) {
                outputFiles.push(new core_1.File(tsHelpers_1.normalizeFileFromTypescript(mapFile.name), mapFile.text));
            }
            return { singleResult: !!this.compilerOptions.outFile, outputFiles };
        }
        else {
            throw new Error(`Emit error! Could not emit file ${fileName}`);
        }
    }
    createLanguageServiceHost() {
        return {
            directoryExists: ts.sys.directoryExists,
            fileExists: ts.sys.fileExists,
            getCompilationSettings: () => this.compilerOptions,
            getCurrentDirectory: () => path.resolve(this.projectDirectory),
            getDefaultLibFileName: ts.getDefaultLibFileName,
            getDirectories: ts.sys.getDirectories,
            getScriptFileNames: () => Object.keys(this.files),
            getScriptSnapshot: fileName => {
                this.pullFileIntoMemoryIfNeeded(fileName);
                return this.files[fileName] && ts.ScriptSnapshot.fromString(this.files[fileName].content);
            },
            getScriptVersion: fileName => {
                this.pullFileIntoMemoryIfNeeded(fileName);
                return this.files[fileName] && this.files[fileName].version.toString();
            },
            readDirectory: ts.sys.readDirectory,
            readFile: ts.sys.readFile
        };
    }
    pullFileIntoMemoryIfNeeded(fileName) {
        if (!this.files[fileName]) {
            const resolvedFile = this.resolveFileName(fileName);
            if (fs.existsSync(resolvedFile)) {
                this.logger.debug('Pulling file into memory: %s', fileName);
                this.files[fileName] = new ScriptFile_1.default(fileName, fs.readFileSync(resolvedFile, 'utf8'));
            }
            else {
                this.logger.error(`File ${resolvedFile} does not exist.`);
            }
        }
    }
    resolveFileName(fileName) {
        if (libRegex.exec(fileName)) {
            const typescriptLocation = require.resolve('typescript');
            const newFileName = path.resolve(path.dirname(typescriptLocation), fileName);
            this.logger.debug(`Resolving lib file ${fileName} to ${newFileName}`);
            return newFileName;
        }
        return fileName;
    }
}
exports.default = TranspilingLanguageService;
