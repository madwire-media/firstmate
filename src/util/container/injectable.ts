import { ContextType } from './context';
import { context } from './symbols';

export abstract class Injectable<C extends ContextType> {
    public [context]: Readonly<C>;

    constructor(dependencies: Readonly<C>) {
        this[context] = Object.create(dependencies);
        Object.freeze(this[context]);
    }
}
