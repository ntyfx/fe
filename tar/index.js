const debug = require('debug')('build');

const fs = require('fs');
const path = require('path');

exec = require('child_process').exec;

const gutil = require('gulp-util');
const chalk = require('chalk');

const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const co = require('co');
const utils = require('../utils');
const Commander = require('../lib/commander');

module.exports = class Tar extends Commander {
  constructor(...props) {
    super(...props);
  }

  run() {
    const p = path.resolve(this.pwd, this.config.tar.dist.replace(/\.+/g, ''));
    const cmd = `if [ -f 'a' ]; then echo "FAIL"; else exit 0; fi`;
    return new Promise((resolve, reject) => {
      gutil.log(`开始运行远程命令：${chalk.green(cmd)}`);
      this.pool.remote(cmd).then(ret => {
        console.log(ret);
        resolve();
      }).catch(reject);
    });
  }
};