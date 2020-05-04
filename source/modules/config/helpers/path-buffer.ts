export class PathBuffer {
    public static fromString(path: string) {
        return new PathBuffer(path.split('/'));
    }

    public readonly segments: string[];

    constructor(segments: string[]) {
        this.segments = segments;
    }

    public toString() {
        return this.segments.join('/');
    }
}
