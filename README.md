# Tkottke Js Helpers

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/js?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/DooXLbfUbH)

## Generate a library

```sh
npx nx g @nx/js:lib packages/express-client --bundler=esbuild --unitTestRunner=vitest --linter=eslint
```

## Run tasks

To build the library use:

```sh
npx nx build pkg1
```

To run any task with Nx use:

```sh
npx nx <target> <project-name>
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

Releases are managed using Nx Release, which automates version bumping, changelog generation, and git tag creation. When you push a git tag, GitHub Actions automatically publishes the package to npm.

### Creating a Release

Use `npx nx release` to create a new release for specific packages:

```sh
# Release a specific package with interactive version selection
npx nx release --projects=logger

# Specify version bump type for a specific package
npx nx release --projects=js-errors --version=patch
npx nx release --projects=logger --version=minor
npx nx release --projects=js-date-utils --version=major

# Release multiple packages at once
npx nx release --projects=logger,js-errors --version=patch

# Create a pre-release (see below for details)
npx nx release --projects=form-field --version=prerelease --preid=alpha
```

This command will:
1. Prompt you to select which packages to release
2. Update version numbers in `package.json`
3. Update `CHANGELOG.md` files
4. Create and push git tags in the format `@scope/package-name/v1.0.0`
5. Trigger the GitHub Actions release workflow

### Release Workflow

When a git tag is pushed (format: `@scope/package-name/v*` or `package-name/v*`), GitHub Actions will:
- Extract package information from the tag
- Run validation (lint, test, build, typecheck)
- Publish to npm with the appropriate dist-tag
- Create a GitHub release with changelog
- Upload package tarball as release asset

### Stable vs Pre-release Versions

The workflow automatically determines the npm dist-tag based on your version format:

**Stable releases** (e.g., `1.0.0`, `0.5.2`):
```sh
npx nx release --projects=logger --version=patch  # or major/minor
```
- Published with `--tag latest` on npm
- Becomes the default installation version

**Named pre-releases** (e.g., `1.0.0-alpha`, `1.0.0-beta.1`):
```sh
npx nx release --projects=form-field --version=prerelease --preid=alpha
npx nx release --projects=express-client --version=prerelease --preid=beta
```
- Published with `--tag alpha` or `--tag beta` on npm
- Users must explicitly install: `npm install package-name@alpha`

**Numeric pre-releases** (e.g., `0.0.6-1`):
```sh
npx nx release --projects=js-date-utils --version=0.0.6-1
```
- Published with `--tag next` on npm
- Users must explicitly install: `npm install package-name@next`

[Learn more about Nx release &raquo;](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
