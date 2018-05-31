'use strict';

const Promise = require('bluebird');
const debug = require('debug')('fe');

const program = require('commander');
const gutil = require('gulp-util');
const semver = require('semver');

const pkg = require('./package');
const commanders = require('./commanders');
const {
    optionParser
} = require('./utils');
const { Config } = require('./config');
const config = Config.parse();

program.version(pkg.version);

if (!semver.valid(config.package.version)) {
    throw new gutil.PluginError('base', '版本格式错误');
}

// register sub commands
Object.keys(commanders).forEach(key => {
    let commander = commanders[key];
    let subProgram = program.command(commander.command);

    if (commander.options && commander.options.length) {
        commander.options.forEach(option => subProgram.option(option[0], option[1], optionParser[option[2]]));
    }

    subProgram.alias(commander.alias).action(commander.action.bind(null, config));
});

program.parse(process.argv);

module.exports = program;