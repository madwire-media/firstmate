import { defer } from '../helpers/promise';

export type MutexCallback<D> = (
    get: () => D,
    set: (value: D) => void,
) => Promise<void>;

export class MutexLock<D> {
    private get: () => D;
    private set: (value: D) => void;

    constructor(get: () => D, set: (value: D) => void) {
        this.get = get;
        this.set = set;
    }

    get value(): D {
        return this.get();
    }
    set value(value: D) {
        this.set(value);
    }
}

export class Mutex<D = undefined> {
    private watchers: MutexCallback<D>[];
    private locked: boolean;
    private data: D;

    constructor(data: D) {
        this.data = data;
    }

    public async lock(callback: MutexCallback<D>) {
        const {promise, resolve} = defer();

        this.watchers.push(async (get, set) => {
            try {
                await callback(get, set);
            } finally {
                resolve();
            }
        });
        this.run();

        await promise;
    }

    public isLocked(): boolean {
        return this.locked;
    }

    private async run(): Promise<void> {
        if (this.locked) {
            return;
        }

        this.locked = true;

        while (this.watchers.length > 0) {
            const callback = this.watchers.shift();

            try {
                await callback(
                    () => this.data,
                    (value) => this.data = value,
                );
            } catch {
                // Ignore any errors
            }
        }

        this.locked = false;
    }
}
