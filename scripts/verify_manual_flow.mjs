import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(command, ['test', '--', '--reporter=verbose'], { cwd: process.cwd(), stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('BayShift shared-state, planner, stale-state, rewind, and WebMCP contract checks passed.');
