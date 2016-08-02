'use strict';

const path = require('path');
const fs = require('fs');
const semver = require('semver');
const gitUrlParse = require("git-url-parse");
const co = require('co');
const request = require('request');

const gutil = require('gulp-util');
const defaults = require('../config/deploy');
const {
    spawn
} = require('../utils');

class Deploy {
    constructor(env, command) {
        this.env = env;
        this.command = command;
        this.pwd = process.env.PWD;
        this.package = null;
        this.fe = {};
        this.options = null;
        this.args = [];
    }

    init() {
        let promise = null;

        if (!this.env) {
            this.env = 'test';
        }

        this.options = defaults.deploy[this.env];

        if (this.command.type == 'npm') {
            promise = this.initNpm();
        } else {
            promise = this.initGit();
        }

        return promise.then(() => this);
    }

    initNpm() {
        let command = this.command;
        let info = command.name.split('@');
        let name = info[0];
        let version = info[1];

        this.options.ref = this.options.version = version;
        this.options.group = defaults.public.root;

        this.package = this.options;

        this.parseOptions(command);
        this.options.name = name;

        return this.spawnSync();
    }

    initGit() {
        return new Promise((resolve, reject) => {
                try {
                    this.package = require(path.resolve(this.pwd, 'package'));
                } catch (err) {
                    return reject(new gutil.PluginError('Deploy: 读取 package.json 失败', err));
                }

                try {
                    this.fe = require(path.resolve(this.pwd, '.fe'));
                } catch (err) {}

                if (this.package.repository && this.package.repository.url) {
                    this.options.repo = this.package.repository.url;
                } else if (typeof this.package.repository == 'string') {
                    this.options.repo = this.package.repository;
                }

                return resolve(this.command);
            })
            .then(this.parseOptions.bind(this))
            .then(this.parseRepository.bind(this))
            .then(this.spawnSync.bind(this));
    }

    parseOptions(command) {
        let options = command.options;

        options.forEach(opt => {
            let param = opt.long.slice(2);
            if (command[param] !== undefined) {
                this.options[param] = command[param];
            }
        });

        let version = this.options.version = this.package.version;

        if (!this.options.ref) {
            throw new gutil.PluginError('Deploy: 请提供一个有效的tag', new Error('例如： fe deploy -r v1.0.0'));
        }

        if (semver.valid(this.options.ref)) {
            version = this.options.version = this.options.ref;
        }

        if (version.indexOf('v') == 0) {
            version = this.options.version = version.slice(1);
        }

        if (!semver.valid(this.options.version)) {
            return reject(new gutil.PluginError(`Deploy: version = "${this.options.version}"`, new Error('版本号解析失败')));
        }

        ['major', 'minor', 'patch'].forEach(s => (this.options[s] = String(semver[s](version))));

        return options;
    }

    parseRepository() {
        let repo = this.options.repo;

        if (!repo) {
            throw new gutil.PluginError(`Deploy: repository`, new Error('提供有效的版本库'));
        }

        let git = gitUrlParse(repo);

        if (git.protocol === 'file') { // "repository": "madrobby/zepto"
            git.resource = "github.com";
            git.full_name = `${git.source}/${git.name}`;
            repo = this.options.repo = git.toString('ssh');
        }

        if (defaults.public.resources.indexOf(git.resource) >= 0) {
            git.owner = defaults.public.root;
        }

        this.options.group = git.owner;
        this.options.name = git.name;
    }

    spawnSync() {
        let that = this;
        let options = this.options;
        let hosts = this.options.host;
        let ssh_opt = '';

        if (!Array.isArray(hosts)) {
            hosts = [hosts];
        }

        if (options.ssh_options) {
            if (Array.isArray(options.ssh_options)) {
                ssh_opt = '-o ' + options.ssh_options.join(' -o ');
            } else {
                ssh_opt = '-o ' + options.ssh_options;
            }

            options.ssh_options = ssh_opt;
        }

        gutil.log('发布配置信息：');
        Object.keys(this.options).forEach(k => {
            gutil.log(`${k}: ${this.options[k]}`);
        });

        return co(function*() {
            for (let i = 0; i < hosts.length; i++) {
                let status = yield that.spawn(hosts[i]);
                if (status === 1) {
                    throw new gutil.PluginError('Deploy: 失败', new Error('原因在上面'));
                }
            }
        });
    }

    spawn(host) {
        let options = JSON.parse(JSON.stringify(this.options));

        options.host = host;

        return spawn(path.resolve(__dirname, 'deploy'), JSON.stringify(options), this.args);
    }
}

module.exports = function(env, command) {
    return new Deploy(env, command).init().catch(err => {
        gutil.log(`${err}`);
    });
};