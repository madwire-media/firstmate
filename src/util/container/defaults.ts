import { ContextType } from './context';
import { defaults } from './symbols';

interface HasDefaults<C extends ContextType, P extends Partial<C>> {
    [defaults](context: C): P;
}

export function getDefaultContext<T extends object, C extends ContextType>(
    type: T extends HasDefaults<C, {}> ?
            T :
        T extends {[defaults]: any} ?
            never :
            T,
    context: C,
): T extends HasDefaults<C, infer P> ? P & C : C {
    if (defaults in type) {
        return {
            ...context,
            ...(type as HasDefaults<C, any>)[defaults](context),
        };
    } else {
        return {} as any;
    }
}
