import { ContextType } from './context';

export class ContextBuilder<C extends ContextType = {}> {
    public readonly context: C;

    constructor(context: C) {
        this.context = Object.create(context);
        Object.freeze(this.context);
    }

    public register<C2 extends ContextType>(additionalContext: C2): ContextBuilder<C & C2> {
        return new ContextBuilder({...this.context, ...additionalContext});
    }

    public finalize(): C {
        return this.context;
    }
}
