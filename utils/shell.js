'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-shell');

const childProcess = require('child_process');
const gutil = require('gulp-util');

module.exports = (command, options) => {
    return new Promise((resolve, reject) => {
        childProcess.exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                return reject(new Error(`执行命令失败： ${command}\n${stderr}`));
            }

            resolve(stdout);
        });
    });
};