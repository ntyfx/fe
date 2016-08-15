'use strict';
const childProcess = require('child_process');

let cmd = 'cd /data/data/node/bin.zhuxbj/fenode/latest && npm install && pm2 startOrRestart ecosystem.json --env development';

childProcess.exec(cmd, (error, stdout, stderr) => {
    console.log(error);
    console.log(stdout);
    console.log(stderr);
});