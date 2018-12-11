import { PartialContext } from './serviceDefaults';

export interface ParsingContext extends PartialContext {
    branch: string;
    env: string;
}
