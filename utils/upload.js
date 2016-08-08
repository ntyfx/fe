'use strict';

const path = require('path');
const Promise = require('bluebird');
const debug = require('debug')('utils-upload');
const childProcess = require('child_process');

module.exports = (file, options) => {
    return new Promise((resolve, reject) => {
        let p = path.parse(file);
        let src = p.dir;

        let upload = childProcess.spawn('zip', ['-r', '/tmp/a', '.'], {
            cwd: src,
            env: process.env,
            stdio: 'ignore'
        });
        
        debug(`cwd: ${src}`);

        upload.on('error', reject);
        upload.on('close', resolve);
    });
};