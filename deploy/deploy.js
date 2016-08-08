'use strict';

const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require("crypto");
const Promise = require('bluebird');

const debug = require('debug')('deploy');
const gutil = require('gulp-util');
const co = require('co');
const npa = require("npm-package-arg");
const semver = require('semver');
const _ = require('lodash');
const request = require('request');
const chalk = require('chalk');
const ProgressBar = require('progress');
const vfs = require('vinyl-fs');

const tar = require('tar');
const urllib = require('urllib');
const HttpAgent = require('http').Agent;
const HttpsAgent = require('https').Agent;

const httpsKeepaliveAgent = new HttpsAgent({
    keepAlive: true,
    keepAliveMsecs: 30000,
});

const utils = require('../utils');
const settings = require('../settings');
const SeriesTaskCommand = require('../lib/serise-task-command');
const Pool = require('../lib/connection/pool');

class Deploy extends SeriesTaskCommand {
    constructor() {
        super();

        this.tasks = ['download', 'check', 'upload', 'createLinks', 'clean'];
    }

    init(env, config) {
        this.emit('pre-init');

        this.envName = env || 'dev';
        this.env = config.envs[this.envName];
        this.config = config;

        debug('this.config: %o', this.config);

        this.type = config.type || settings.defaultType;
        this.typeOpts = this.config[this.type] || {};

        this.repository = this.parsePackage();

        debug('this.repository: %o', this.repository);

        this.remote = {
            root: path.join(this.env.dist, (this.type !== settings.defaultType ? 'public' : ''), this.repository.name)
        };
        this.remote.dist = path.join(this.remote.root, this.repository.version);

        debug('this.remote: %o', this.remote);

        this.tmpdir = os.tmpdir();

        this.emit('post-init');

        this.pool = Pool.getInstance().init(this.env.hosts, this.env);

        return this;
    }

    parsePackage() {
        let pkg = {};

        switch (this.type) {
            case 'npm':
                pkg = npa(this.config.package);

                if (pkg.type !== 'version') {
                    throw new Error(`请输入一个确定的版本号，暂不支持 ${pkg.type} ${pkg.spec}`);
                }

                if (!pkg.name) {
                    throw new Error(`请输入一个确定的包名，暂不支持 ${pkg.raw}`);
                }

                pkg.version = `v${semver.clean(pkg.spec)}`;
                pkg.registry = this.config.registry;

                break;
            case settings.defaultType:
                let arr = this.config.package.split('@');

                pkg.name = arr[0];
                pkg.spec = arr[1];

                if (!pkg.name || pkg.name.split('/').length !== 2) {
                    throw new Error(`正确的格式为 'group/name@version'`);
                }

                pkg.registry = this.typeOpts.url;

                break;
            default:
                throw new Error(`// TODO 暂未实现 type ${this.type}`);
        }

        pkg.links = {
            major: settings.alias.links.major
        };

        if (!semver.valid(pkg.spec)) {
            if (this.envName == settings.alias.envs.production) {
                throw new Error(`请输入一个确定的版本号，暂不支持 ${pkg.spec}`);
            }

            pkg.version = pkg.spec;
            pkg.links.minor = pkg.links.patch = pkg.links.major;
        } else {
            pkg.version = `v${semver.clean(pkg.spec)}`;
            pkg.links.minor = `v${semver.major(pkg.spec)}`;
            pkg.links.patch = `v${semver.major(pkg.spec)}.${semver.minor(pkg.spec)}`;
        }

        pkg.url = this.generateUrl(this.type, pkg);

        return pkg;
    }

    generateUrl(type, pkg) {
        let urlTmpl = settings.repositories[type];

        if (!urlTmpl) {
            throw new Error(`类型type是不是写错了 ${type}`);
        }

        return _.template(urlTmpl)(pkg);
    }

    initTmpDir(filename) {
        if (!filename) {
            let tmp = crypto.createHash("md5").update(String(new Date())).digest('hex');
            this.filename = this.config.package.replace(/[\/@]/g, '-') + '-' + tmp;
        } else {
            this.filename = filename.replace(/\.zip|\.tgz|\.tar\.gz|\.tar$/g, '');
        }

        this.tmpdir = path.join(this.tmpdir, this.filename);

        debug('this.filename: %o', this.filename);
        debug('this.tmpdir: %o', this.tmpdir);
    }

    download(next) {
        let repository = this.repository;
        const extracter = tar.Extract({
            path: '',
            strip: 1
        });

        let options = {
            timeout: 5 * 60 * 1000,
            headers: this.typeOpts.headers,
            httpsAgent: httpsKeepaliveAgent,
            rejectUnauthorized: false,
            followRedirect: true,
            streaming: true
        };

        gutil.log(`start download ${chalk.green(repository.url)}`);

        urllib.request(repository.url, options).then(req => {
            if (req.status !== 200) {
                throw new Error(`文件下载失败，请检查 package 信息是否正确：${this.config.package}`);
            }

            let contentDispositioin = utils.contentDispositioin.parse(req.headers['content-disposition']);
            let filename = '';

            if (contentDispositioin && contentDispositioin.parameters) {
                filename = contentDispositioin.parameters.filename;
            }

            this.initTmpDir(filename);

            return new Promise((resolve, reject) => {
                let gunzip = zlib.createGunzip();
                let extracter = tar.Extract({
                    path: this.tmpdir,
                    strip: 1
                });

                req.res.on('error', err => reject(new Error(`文件下载失败，${repository.url}`)));

                gunzip.on('error', err => reject(new Error('文件gzip解压失败')));
                extracter.on('error', err => reject(new Error('文件tar解压失败'))).on('end', resolve);

                req.res.pipe(gunzip).pipe(extracter);
            });
        }).then(() => {
            gutil.log(`文件解压到 ${chalk.green(this.tmpdir)}`);
        }).then(next).catch(utils.error);
    }

    check(next) {
        let src = path.join(this.tmpdir, this.config.base.replace(/\.+/g, '.'));

        new Promise((resolve, reject) => {
            if (this.env.dist.replace(/\/+/g, '/').split('/').length < 3) {
                return reject(new Error(`目标路径 ${this.env.dist} 不符合要求`));
            }

            this.uploadDir = src;

            resolve();
        }).then(next).catch(utils.error);
    }

    upload(next) {
        this.pool.upload(this.uploadDir, this.remote.dist).then(() => {}).then(next).catch(utils.error);
    }

    createLinks(next) {
        let cmd = [];

        Object.keys(this.repository.links).forEach(l => {
            let link = path.join(path.dirname(this.remote.dist), this.repository.links[l]);

            gutil.log(`ln -sfn ${this.remote.dist} ${link}`);
            cmd.push(`ln -sfn ${this.remote.dist} ${link}`);
        });

        this.pool.remote(cmd.join(' && ')).then(() => {}).then(next).catch(utils.error);
    }

    clean(next) {

        next();
    }

}

module.exports = Deploy;