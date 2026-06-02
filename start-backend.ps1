# Start the backend with the local cached MongoDB binary
$env:MONGOMS_VERSION = '8.2.6'
cd $PSScriptRoot\backend
node server.js
