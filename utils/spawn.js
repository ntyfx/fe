'use strict';
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
        var shellSyntaxCommand = "echo '" + data + "' | \"" + command + "\" " + args.join(' ');
        var proc = childProcess.spawn('sh', ['-c', shellSyntaxCommand], {
            stdio: 'inherit'
        });

        proc.on('error', e => reject(new gutil.PluginError('util.spawn', e, {
            showStack: true
        })));

        proc.on('close', code => resolve(code, args));
    });
};