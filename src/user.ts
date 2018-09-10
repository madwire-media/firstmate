export interface User {
    name: string;
}

// TODO: Validate raw config
export function parseUserConfig(raw: any): User {
    return raw;
}
