# Dependency license inventory

Inventory date: 2026-10-13. The table covers 56 packages physically installed in this Windows checkout and records license metadata from their package manifests. Versions come from the lockfile.

Packages are separated by npm lockfile runtime/development classification. Uninstalled platform-specific optional packages are not listed; they remain in the lockfile but are not installed in this checkout. Re-run the inventory when dependencies change. License metadata is an inventory aid, not legal advice.

The public web bundle keeps upstream license files for the runtime PDF.js, pdf-lib, React, their production dependency trees, the pdfcpu WebAssembly dependency graph, and Go's `wasm_exec.js` runtime in [`public/THIRD_PARTY_NOTICES.txt`](../public/THIRD_PARTY_NOTICES.txt). PDF.js ships several bundled data and font notices there as well. Build/test/lint packages are development-only and do not ship in the browser bundle.

The browser WASM build uses Go 1.27.2 and pdfcpu v0.16.2. This inventory lists the non-standard modules linked by the `js/wasm` dependency graph; module versions and checksums are pinned in `tools/pdfcpu-wasm/go.mod` and `go.sum`. The full upstream notices are included in `public/THIRD_PARTY_NOTICES.txt`.

| Scope | Module | Version | Declared license |
|---|---|---:|---|
| WASM runtime | `github.com/pdfcpu/pdfcpu` | 0.16.2 | Apache-2.0 |
| WASM dependency | `github.com/clipperhouse/uax29/v2` | 2.7.0 | MIT |
| WASM dependency | `github.com/hhrutter/tiff` | 1.0.7 | BSD-3-Clause |
| WASM dependency | `github.com/mattn/go-runewidth` | 0.0.30 | MIT |
| WASM dependency | `github.com/xdg-go/stringprep` | 1.0.4 | Apache-2.0 |
| WASM dependency | `go.yaml.in/yaml/v3` | 3.0.5 | MIT AND Apache-2.0 |
| WASM dependency | `golang.org/x/crypto` | 0.57.0 | BSD-3-Clause |
| WASM dependency | `golang.org/x/image` | 0.46.0 | BSD-3-Clause |
| WASM dependency | `golang.org/x/text` | 0.42.0 | BSD-3-Clause |
| WASM runtime | Go `wasm_exec.js` | 1.27.2 | BSD-3-Clause |

| Scope | Package | Version | Declared license |
|---|---|---:|---|
| Development | `@jridgewell/resolve-uri` | 3.1.2 | MIT |
| Development | `@jridgewell/sourcemap-codec` | 1.6.0 | MIT |
| Development | `@jridgewell/trace-mapping` | 0.3.31 | MIT |
| Development | `@oxc-project/types` | 0.153.0 | MIT |
| Development | `@oxlint/binding-win32-x64-msvc` | 1.88.0 | MIT |
| Development | `@rolldown/binding-win32-x64-msvc` | 1.2.13 | MIT |
| Development | `@rolldown/pluginutils` | 1.0.1 | MIT |
| Development | `@types/chai` | 5.2.3 | MIT |
| Development | `@types/deep-eql` | 4.0.2 | MIT |
| Development | `@types/estree` | 1.0.9 | MIT |
| Development | `@types/node` | 24.19.2 | MIT |
| Development | `@types/react` | 19.3.0 | MIT |
| Development | `@types/react-dom` | 19.3.0 | MIT |
| Development | `@typescript/typescript-win32-x64` | 7.0.2 | Apache-2.0 |
| Development | `@vitejs/plugin-react` | 6.1.2 | MIT |
| Development | `@vitest/mocker` | 5.0.4 | MIT |
| Development | `@vitest/spy` | 5.0.4 | MIT |
| Development | `assertion-error` | 2.0.1 | MIT |
| Development | `chai` | 6.3.0 | MIT |
| Development | `csstype` | 3.2.3 | MIT |
| Development | `detect-libc` | 2.1.2 | Apache-2.0 |
| Development | `es-module-lexer` | 2.3.2 | MIT |
| Development | `estree-walker` | 3.0.3 | MIT |
| Development | `expect-type` | 1.4.0 | Apache-2.0 |
| Development | `fdir` | 6.5.0 | MIT |
| Development | `lightningcss` | 1.33.0 | MPL-2.0 |
| Development | `lightningcss-win32-x64-msvc` | 1.33.0 | MPL-2.0 |
| Development | `magic-string` | 1.4.3 | MIT |
| Development | `nanoid` | 3.3.20 | MIT |
| Development | `obug` | 3.0.0 | MIT |
| Development | `oxlint` | 1.88.0 | MIT |
| Development | `picocolors` | 1.1.1 | ISC |
| Development | `picomatch` | 4.0.7 | MIT |
| Development | `postcss` | 8.5.30 | MIT |
| Development | `rolldown` | 1.2.13 | MIT |
| Development | `source-map-js` | 1.2.2 | BSD-3-Clause |
| Development | `std-env` | 4.3.0 | MIT |
| Development | `tinybench` | 6.2.2 | MIT |
| Development | `tinyexec` | 1.3.1 | MIT |
| Development | `tinyglobby` | 0.2.17 | MIT |
| Development | `typescript` | 7.0.2 | Apache-2.0 |
| Development | `undici-types` | 7.24.6 | MIT |
| Development | `vite` | 8.3.4 | MIT |
| Development | `vitest` | 5.0.4 | MIT |
| Development | `why-is-node-running` | 3.2.1 | MIT |
| Runtime | `@napi-rs/canvas` | 1.0.11 | MIT |
| Runtime | `@napi-rs/canvas-win32-x64-msvc` | 1.0.11 | MIT |
| Runtime | `@pdf-lib/standard-fonts` | 1.0.0 | MIT |
| Runtime | `@pdf-lib/upng` | 1.0.1 | MIT |
| Runtime | `pako` | 1.0.11 | (MIT AND Zlib) |
| Runtime | `pdf-lib` | 1.17.1 | MIT |
| Runtime | `pdfjs-dist` | 6.4.299 | Apache-2.0 |
| Runtime | `react` | 19.3.0 | MIT |
| Runtime | `react-dom` | 19.3.0 | MIT |
| Runtime | `scheduler` | 0.28.0 | MIT |
| Runtime | `tslib` | 1.14.1 | 0BSD |
