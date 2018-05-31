
const gutil = require('gulp-util');
const semver = require('semver');
const chalk = require('chalk');
const Pool = require('./connection/pool');
const constants = require('../constants');

module.exports = class Commander {
  constructor(env, config, opts) {
    if (constants.envs.indexOf(env) < 0) {
      throw new gutil.PluginError('base', '指定的环境不存在');
    }

    this.env = env;
    this.pwd = process.env.PWD;
    this.opts = opts;
    this.name = config.name;

    this.config = JSON.parse(JSON.stringify(config));
    this.config.deploy = this.config.deploy[env];
    this.config.build = this.config.build[env];
    this.package = this.config.package;
    this.version = `v${semver.clean(config.package.version)}`;

    this.pool = Pool.getInstance().init(this.config.deploy.host, this.config.deploy);

    return this;
  }
};