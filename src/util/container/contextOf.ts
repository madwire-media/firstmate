import { Injectable } from './injectable';

export type ContextOf<I extends Injectable<{}>> = I extends Injectable<infer C> ? C : never;
