## AstralRinth App

The AstralRinth App is a desktop application for managing your Minecraft mods. It is built with [Tauri](https://tauri.app/) and [Vue](https://vuejs.org/).

## Development

### Pre-requisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri](https://tauri.app/v1/guides/getting-started/prerequisites/#installing)

### Setup

Follow these steps to set up your development environment:

```bash
pnpm install # Install the package according to the configuration.
pnpm update # Update your packages to the latest versions.
```


The next following steps will help you manage your fork or self-customized bundle release:

```bash
tauri dev # This command runs the AstralRinth application in development mode with hot reload functionality, which is particularly useful for files with the.vue and.js extensions.
tauri build # Build a release bundle for production use.
tauri build --debug # Build a release bundle with development-specific web features such as the inspector and debugger.
```

You should now have a development build of the app running with hot-reloading enabled. Any changes you make to the code will automatically refresh the app.
