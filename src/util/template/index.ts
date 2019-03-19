export * from './static';
export * from './stream';

export const validKeyRgx = /^[a-zA-Z0-9_. -]+$/;

export interface TemplateVars {
    [key: string]: string;
}
