const debug = require('debug')('deploy');

const fs = require('fs');
const path = require('path');

const Promise = require('bluebird');
const _ = require('lodash');
const co = require('co');
const gutil = require('gulp-util');
const chalk = require('chalk');
const semver = require('semver');
const utils = require('../utils');
const Commander = require('../lib/commander');
const Build = require('../build');

module.exports = class Deploy extends Commander {
    constructor(...props) {
        super(...props);

        this.build = new Build(...props);
    }

    run() {
        const { deploy } = this.config;

        const p = path.resolve(this.pwd, this.config.tar.dist.replace(/\.+/g, ''));
        const remotePath = path.resolve(deploy.dist, this.name, this.version);
        const link = path.resolve(deploy.dist, this.name, this.config.latest);
        this.build.run().then((ret) => {
            return this.pool.upload(p, remotePath, { excludes: this.config.tar.excludes });
        }).then(() => {
            let cmd = `ln -sfn ${remotePath} ${link}`;

            return this.pool.remote(cmd);
        }).then(() => {
            gutil.log(`新版发布完成，当前版本：${this.version}`);
        });
    }
};