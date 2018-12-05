import { serviceType } from '../types/service';
import { branch } from './branch';

export const service = serviceType(
    branch.exact,
    branch.partial,
    branch.type
);
