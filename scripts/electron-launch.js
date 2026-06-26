// Wrapper that strips Trae's ELECTRON_RUN_AS_NODE=1 before spawning electron.
// Without this, require('electron') in main.js returns a path string, not the API.
const { execFileSync } = require('child_process')
const electron = require('electron') // returns path string when ELECTRON_RUN_AS_NODE=1 — that's fine here

const env = Object.assign({}, process.env)
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_FORCE_IS_PACKAGED
delete env.VSCODE_RUN_IN_ELECTRON

execFileSync(electron, process.argv.slice(2), { stdio: 'inherit', env })
