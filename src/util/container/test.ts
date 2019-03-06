import { Injectable } from './injectable';
import { context } from './symbols';

interface FS {
    read(filename: string): string;
    write(filename: string, contents: string): void;
}
interface RL {
    readline(): string;
}

interface RequiresFS {
    fs: FS;
}

interface RequiresRL {
    rl: RL;
}

interface TestDependencies {
    fs: FS;
}

interface OtherDependencies {
    fs: FS;
    rl: RL;
}

class Test extends Injectable<TestDependencies> {
    private test() {
        // require('fs').read('.fm');
        this[context].fs.read('.fm');
    }
}

class Other extends Injectable<OtherDependencies> {
    private newTest() {
        return new Test(this[context]);
    }
}
