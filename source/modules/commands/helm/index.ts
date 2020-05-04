import { chart } from './chart';
import { HelmFetchOptions, HelmFetchCommand } from './fetch';
import { HelmInstallOptions, HelmInstallCommand } from './install';
import { HelmPackageOptions, HelmPackageCommand } from './package';
import { HelmStatusOptions, HelmStatusCommand } from './status';
import { HelmUninstallOptions, HelmUninstallCommand } from './uninstall';
import { HelmUpgradeOptions, HelmUpgradeCommand } from './upgrade';

export const Helm = {
    chart,

    fetch: (options: HelmFetchOptions) => new HelmFetchCommand(options),
    install: (options: HelmInstallOptions) => new HelmInstallCommand(options),
    package: (options: HelmPackageOptions) => new HelmPackageCommand(options),
    status: (options: HelmStatusOptions) => new HelmStatusCommand(options),
    uninstall: (options: HelmUninstallOptions) => new HelmUninstallCommand(options),
    upgrade: (options: HelmUpgradeOptions) => new HelmUpgradeCommand(options),
};
