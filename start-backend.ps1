# Start the backend with the local cached MongoDB binary
# - MONGOMS_VERSION pins the in-memory MongoDB binary version when the
#   Atlas cluster is unreachable.
# - NODE_OPTIONS=--no-deprecation silences the noisy `punycode` warning
#   that Node 21+ emits for the built-in module (we ship the userland
#   `punycode` package as a dependency).
$env:MONGOMS_VERSION = '8.2.6'
$env:NODE_OPTIONS   = '--no-deprecation'
cd $PSScriptRoot\backend
node server.js
