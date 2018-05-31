'use strict';

const gutil = require('gulp-util');
const chalk = require('chalk');

const co = require('co');
const utils = require('../utils');

module.exports = Commander => {
  return (config, env, command) => {
    let opts = command.opts();
    let commander = new Commander(env, config, opts);

    gutil.log(`应用名称：${chalk.green(config.name)}`);
    gutil.log(`待发布版本：${chalk.green(config.package.version)}`);
    gutil.log(`当前环境：${chalk.green(env)}`);

    return co(() => commander.run()).catch(utils.error);
  };
};