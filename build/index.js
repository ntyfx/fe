const debug = require('debug')('build');

exec = require('child_process').exec;

const gutil = require('gulp-util');
const chalk = require('chalk');

const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const co = require('co');
const utils = require('../utils');
const Commander = require('../lib/commander');

module.exports = class Build extends Commander {
  constructor(...props) {
    super(...props);
  }

  run() {
    return new Promise((resolve, reject) => {
      gutil.log(`开始构建：${chalk.green(this.config.build.command)}`);

      exec(this.config.build.command, {
        cwd: this.cwd
      }, (err) => {
        if (err) {
          return reject(err);
        }

        gutil.log(`构建完成：${chalk.green(this.package.version)}`);
        return resolve('build finished');
      });
    });
  }
};