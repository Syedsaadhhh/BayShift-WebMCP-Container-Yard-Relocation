import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const command = isWindows ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/d', '/s', '/c', 'npm test -- --reporter=verbose']
  : ['test', '--', '--reporter=verbose'];
const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('BayShift shared-state, planner, stale-state, rewind, and WebMCP contract checks passed.');
