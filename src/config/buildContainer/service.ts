import { serviceType, ServiceType } from '../types/service';
import { branch, env } from './branch';
import { BranchType } from '../types/branch';

export const service = serviceType(
    branch.exact,
    branch.partial,
    branch.type
);
