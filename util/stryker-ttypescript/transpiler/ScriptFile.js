"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ScriptFile {
    constructor(name, content, version = 0) {
        this.name = name;
        this.content = content;
        this.version = version;
    }
    replace(newContent) {
        this.content = newContent;
        this.version++;
    }
}
exports.default = ScriptFile;
