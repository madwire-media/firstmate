# Command-line Interface

## `fm create project <project name>`
Initializes a new Firstmate project

## `fm import project <project name>`
Imports an existing Git repository as a Firstmate project

## `fm add module <module path> <module type> [module template]`
Adds a module into a Firstmate project, optionally from a template

## `fm add service <service path> <service type> [service template]`
Adds a service into a Firstmate project, optionally from a template

## `fm add template <"module"|"service"> <name>`
Adds a template into a Firstmate project

## `fm augment <module> <augmentation>`
Modifies a module to inject a feature

## `fm publish <service>:<profile> [version change]`
Publishes a service to a registry

(some services can't be published)

## `fm run <service>:<profile>`
Runs a service

(some services will need to be published first, some can't even run)

## `fm revert <service>:<profile> [@version]`
Revert a running service to its previous version if possible

## `fm destroy <service>:<profile>`
Destroys a running service

## `fm version <module|service> (@<version>|<change>)`
Modifies a service's version

## `fm checkout <service>:<profile> @<version>`
Uses the lock file to check out a previous version of a service

## `fm status <service>:<profile>`
List the status of a service

## `fm show versions <service>:<profile>`
List the historical versions of a service

## `fm show dependencies <service>:<profile> [--as-branch <branch>]`
List the dependency tree of a service

## `fm rum`
Serves you some ascii rum, and returns error code 1
