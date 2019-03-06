import { Process } from '..';

export class NodeProcess implements Process {
    public cwd(): string {
        return process.cwd();
    }
}
