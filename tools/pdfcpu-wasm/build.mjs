import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, '../..');
const publicTarget = join(repository, 'public');
const version = execFileSync('go', ['version'], { encoding: 'utf8' }).trim();

if (!/\bgo1\.27\.2\b/.test(version)) {
  throw new Error(`Build with Go 1.27.2; found ${version}.`);
}

mkdirSync(publicTarget, { recursive: true });
const build = spawnSync('go', ['build', '-mod=readonly', '-trimpath', '-ldflags=-s -w', '-o', join(publicTarget, 'pdfcpu.wasm'), '.'], {
  cwd: directory,
  env: { ...process.env, GOOS: 'js', GOARCH: 'wasm' },
  stdio: 'inherit',
});

if (build.status !== 0) process.exit(build.status ?? 1);

const goroot = execFileSync('go', ['env', 'GOROOT'], { encoding: 'utf8' }).trim();
copyFileSync(join(goroot, 'lib', 'wasm', 'wasm_exec.js'), join(publicTarget, 'pdfcpu-wasm-exec.js'));
