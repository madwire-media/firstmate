import * as t from 'io-ts';
import { refineRgx } from '../../util/io-util';

// --------------------------------- Common --------------------------------- //
export const rgxProjectName = /^[a-z0-9/-]+$/;
export type ProjectName = string;
export const ProjectName = refineRgx(
    rgxProjectName,
    'ProjectName',
);

export const rgxBranchName = /^~?[^/\000-\037\117 ~^:]+$/;
export type BranchName = string;
export const BranchName = refineRgx(
    rgxBranchName,
    'BranchName',
);

export const rgxUsedBranchName = /^[^~].+|~default$/;
export type UsedBranchName = string;
export const UsedBranchName = refineRgx(
    rgxUsedBranchName,
    'UsedBranchName',
    BranchName,
);

export const rgxServiceName = /^[a-z0-9-]+$/;
export type ServiceName = string;
export const ServiceName = refineRgx(
    rgxServiceName,
    'ServiceName',
);

export const rgxLocalFilePath = /^([^.]|\.(?!\.))+$/;
export type LocalFilePath = string;
export const LocalFilePath = refineRgx(
    rgxLocalFilePath,
    'LocalFilePath',
);

export const rgxAbsoluteFilePath = /^\/.+$/;
export type AbsoluteFilePath = string;
export const AbsoluteFilePath = refineRgx(
    rgxAbsoluteFilePath,
    'AbsoluteFilePath',
);

// --------------------------------- Docker --------------------------------- //
export const rgxImageName = /^\w[\w.-]+$/;
export type ImageName = string;
export const ImageName = refineRgx(
    rgxImageName,
    'ImageName',
);

export const rgxRegistry = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+$/;
export type Registry = string;
export const Registry = refineRgx(
    rgxRegistry,
    'Registry',
);

// Artificially limited
export const rgxDockerArg = /^\w+$/;
export type DockerArg = string;
export const DockerArg = refineRgx(
    rgxDockerArg,
    'DockerArg',
);

// -------------------------------- k8s/Helm -------------------------------- //
// Couldn't find any limitations in kubectl
export const rgxClusterName = /.+/;
export type ClusterName = string;
export const ClusterName = refineRgx(
    rgxClusterName,
    'ClusterName',
);

// Pulled from Kubernetes source code (DNS 1123 label)
export const rgxNamespace = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
export type Namespace = string;
export const Namespace = refineRgx(
    rgxNamespace,
    'Namespace',
);

export const rgxChartMuseum = /^.+/;
export type ChartMuseum = string;
export const ChartMuseum = refineRgx(
    rgxChartMuseum,
    'ChartMuseum',
);

// Pulled from Kubernetes source code (DNS 1123 label)
export const rgxContainerName = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
export type ContainerName = string;
export const ContainerName = refineRgx(
    rgxContainerName,
    'ContainerName',
);

// Pulled from Helm source code and simplified
export const rgxReleaseName = /^[A-Za-z0-9]([A-Za-z0-9_.-]*[A-Za-z0-9])?$/;
export type ReleaseName = string;
export const ReleaseName = refineRgx(
    rgxReleaseName,
    'ReleaseName',
);

export const rgxHelmArg = /^.+$/;
export type HelmStringArg = string;
export const HelmStringArg = refineRgx(
    rgxHelmArg,
    'HelmArg',
);
