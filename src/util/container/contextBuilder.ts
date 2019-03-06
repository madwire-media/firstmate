import { Dependencies } from './dependencies';

export class ContextBuilder<D extends Dependencies = {}> {
    public readonly context: D;

    constructor(dependencies: D) {
        this.context = Object.create(dependencies);
        Object.freeze(this.context);
    }

    public register<D2 extends Dependencies>(newDependencies: D2): ContextBuilder<D & D2> {
        return new ContextBuilder({...this.context, ...newDependencies});
    }

    public finalize(): D {
        return this.context;
    }
}
