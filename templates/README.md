# Read this before editing any templates
Many templates contain relative symlinks to other templates. Be
careful editing these symlinked files as your changes will apply
to every other symlink of that file. If these symlinks ever get
confusing, or if you have an editor that doesn't differentiate
symlinks, you can always look at the `.links` file at the root of
each template. (if the file doesn't exists, there aren't any
symlinks)

If you add or remove any symlinks, please run the `parseLinks.js`
script in the utils folder at the root of this repository to
regenerate all `.links` files.
