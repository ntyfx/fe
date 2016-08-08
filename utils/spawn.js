'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-spawn');

const childProcess = require('child_process');
const gutil = require('gulp-util');

module.exports = (command, data, args) => {
    if (!args) {
        args = [];
    }

    if (!data) {
        data = '';
    }

    return new Promise((resolve, reject) => {
        let shellSyntaxCommand = "echo '" + data + "' | \"" + command + "\" " + args.join(' ');
        let proc = childProcess.spawn('sh', ['-c', shellSyntaxCommand], {
            stdio: 'inherit'
        });

        proc.on('error', reject);

        proc.on('close', resolve);
    });
};