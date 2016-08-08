'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-zip');
const childProcess = require('child_process');

module.exports = {
    pack: (src, dist) => {
        return new Promise((resolve, reject) => {
            let zip = childProcess.spawn('zip', ['-r', dist, '.'], {
                cwd: src,
                env: process.env,
                stdio: 'ignore'
            });
            debug(`cwd: ${src}`);
            debug(`sh: zip -r ${dist} .`);

            zip.on('error', reject);
            zip.on('close', resolve);
        });
    }
};