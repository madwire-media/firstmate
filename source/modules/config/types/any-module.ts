import { MainServiceTypes } from './services/main';
import { ChildServiceTypes } from './services/child';
import { DockerImageSourceTypes } from './sources/docker-image';
import { HelmChartSourceTypes } from './sources/helm-chart';
import { ContainerStepTypes } from './steps/container';
import { DeferredContainerStepTypes } from './steps/deferred-container';
import { DockerPushStepTypes } from './steps/docker-push';
import { EmptyStepTypes } from './steps/empty';
import { HelmPushStepTypes } from './steps/helm-push';
import { HelmReleaseStepTypes } from './steps/helm-release';
import { ModuleTypes, BaseModule, BaseModuleProfile } from './common/config';

export type AnyNonTemplateModuleTypes =
    | MainServiceTypes
    | ChildServiceTypes
    | DockerImageSourceTypes
    | HelmChartSourceTypes
    | ContainerStepTypes
    | DeferredContainerStepTypes
    | DockerPushStepTypes
    | EmptyStepTypes
    | HelmPushStepTypes
    | HelmReleaseStepTypes;

export type AnyModuleTypes = ModuleTypes<BaseModule, BaseModuleProfile, boolean>;
