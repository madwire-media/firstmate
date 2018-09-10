# File Structure
Required files have a `*` next to their name, and are only requried if their parent directory exists.
```
my-project/
  * .git/
  * fm/
        dockerImage/
          * Dockerfile
            bootstrap.sh, etc.
        pureHelm/
            charts/
                helmDep1/
                helmDep2/
          * templates/
                .note
                _helpers.tpl, etc.
                deployment.yaml, etc.
            .helmignore
          * Chart.yaml
          * values.yaml
        dockerDeployment/
            charts/
                helmDep1/
                helmDep2/
            docker/
                container1/
                  * Dockerfile
                    bootstrap.sh, etc.
                container2/
                  * Dockerfile
                    bootstrap.sh, etc.
          * templates/
                .note
                _helpers.tpl, etc.
                deployment.yaml, etc.
            .helmignore
          * Chart.yaml
          * values.yaml
        buildContainer/
          * Dockerfile
            bootstrap.sh, etc.
            output/
    source/
        dockerImage/
        dockerDeployment/
    .gitignore
  * firstmate.hjson (or firstmate.json, if you prefer)
```
