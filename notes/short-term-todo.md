# Short-term TODO (aka yesterday)

* [X] Config loader
* [X] File mounting in private area
    * [X] Temp file implementation
    * [X] Copy module files to private area
    * [X] Temp files for modules
    * [X] CopyFiles for modules
* [X] Command runner
* [ ] Config runner
    * [X] Base
    * [X] Handle
    * [ ] Deferred Handle
    * [ ] Deferred runner
* [ ] Module Engine
    * [X] Services
        * [X] Main
        * [X] Child (probably can leave for later)
    * [X] Sources
        * [X] Docker Image
        * [X] Helm Chart
    * [X] Steps
        * [X] Container
        * [ ] Deferred Container (probably can leave for later)
        * [X] Docker Push
        * [X] Empty
        * [X] Helm Push
        * [X] Helm Release
* [ ] Root API
    * [X] `fm run`
    * [X] `fm destroy`
    * [ ] `fm status` (not the most important)
    * [ ] `fm show dependencies` (not the most important)
    * [X] `fm rum` ('cause why not? :D)
* [X] Basic CLI

Notes
* Session is an entire run or publish command

## For later (aka today)

* [ ] Templates
* [ ] Git integration
    * [ ] `fm revert`
* [ ] Lockfiles
    * [ ] `fm publish`
    * [ ] `fm checkout`
    * [ ] `fm show versions`
* [ ] Bases
    * [ ] `fm add source`
    * [ ] `fm add step`
    * [ ] `fm add service`
    * [ ] `fm add template`
    * [ ] `fm add from`
* [ ] Live development
    * [ ] Watch and copy files?
    * [ ] Network proxy to local?

## Much later
* Streaming logging
* Prevent FS operations from escaping the project
* Overhauled CLI engine?
* Overhauled errors with better logging capability
* Real API capability
* `fm convert project`
* Augmentations
* `fm repair lockfiles`
