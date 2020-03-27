# Command-line Interface

## `fm create project <project name>`
Initializes a new Firstmate project

## `fm import project <project name>`
Imports an existing Git repository as a Firstmate project

## `fm augment <module|service> <augmentation>`
Modifies a module to inject a feature

## `fm add source <module path> <source module type>`
Adds a module into a Firstmate project, optionally from a template

## `fm add step <module path> <step module type>`
Adds a module into a Firstmate project, optionally from a template

## `fm add service <service path>`
Adds a service into a Firstmate project, optionally from a template

## `fm add template <name>`
Adds a template into a Firstmate project

## `fm add from <template name>`
Imports and executes a template

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
Programmatically modifies a service or module's version

## `fm checkout <service>:<profile> @<version>`
Uses the history file to check out a previous version of a service or module

## `fm status <service>:<profile>`
List the status of a service

## `fm show versions <module|service>:<profile>`
List the historical versions of a service or module

## `fm show dependencies <module|service>:<profile>`
List the dependency tree of a service or module

## `fm repair lockfiles`
Traverses the Git history to try and find where the service lock files went, and updates the history files and root lock file

## `fm rum`
Serves you some ascii rum and a snarky drunken message, suggests you run `fm run` and returns error code 1
