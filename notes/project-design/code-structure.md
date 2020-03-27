# Code structure
Code structure is pretty loose, but based on the following principles:
* Code is split into logical modules
* Code is mockable whenever it touches an external dependency (FS, git, etc.)
* Non-module top-level directories are allowed, but generally discouraged

## Mockable module structure
* `index.ts` at the root with common interface definitions
* `impls/` folder to contain implementations
    * For each implementation, either:
        * `[impl name]/` folder with complicated implementation
            * `index.ts` with function to create internal dependencies
            * `impl.ts` with top-level implementation
            * `[other name].ts` with lower-level implementations for separation and ease of testing
            * Optional `[other name].mock.ts` with mocks of implementation
            * Optional `[name].unit.test.ts` with unit test
            * Optional `[name].func.test.ts` with functional tests
        * `[impl name].ts` with simple implementation
* `mocks/` folder to contain fakes, mocks, and stubs
    * `[mock name].ts` with fake, mock, or stub implementation
