'use strict';

const path = require('path');
const fs = require('fs');
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
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const vfs = require('vinyl-fs');
const through2 = require('through2');

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

        this.deployDate = new Date();
        this.tmpRoot = this.tmpdir = os.tmpdir();
    }

    init(env, config) {
        this.envName = env || 'dev';
        this.config = config;

        if (this.envName == settings.alias.envs.test) {
            this.tasks = ['download', 'initConfig', 'preDeploy', 'upload', 'limitVersions', 'createLinks', 'postDeploy', 'clean'];
        } else {
            this.tasks = ['download', 'initConfig', 'fetchMeta', 'preDeploy', 'upload', 'limitVersions', 'uploadMeta', 'uploadVersion', 'createLinks', 'postDeploy', 'clean'];
        }

        debug('this.config: %o', this.config);

        this.type = config.type || settings.defaultType;
        this.typeOpts = this.config[this.type] || {};

        this.repository = this.parsePackage();

        debug('this.repository: %o', this.repository);

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
            let tmp = crypto.createHash("md5").update(String(this.deployDate)).digest('hex');
            this.filename = this.config.package.replace(/[\/@]/g, '-') + '-' + tmp;
        } else {
            this.filename = filename.replace(/\.zip|\.tgz|\.tar\.gz|\.tar$/g, '');
        }

        this.tmpdir = path.join(this.tmpdir, this.filename, 'src');
        this.tmpMeta = path.join(this.tmpRoot, this.filename, '.metadata');
        this.tmpVersions = path.join(this.tmpRoot, this.filename, '.versions');

        debug('this.filename: %o', this.filename);
        debug('this.tmpdir: %o', this.tmpdir);
        debug('this.tmpMeta: %o', this.tmpMeta);
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

        gutil.log(`下载文件 ${chalk.green(repository.url)}`);

        return urllib.request(repository.url, options).then(req => {
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

                req.res.on('data', () => {
                    process.stdout.write('.');
                }).on('end', () => {
                    process.stdout.write('\n');
                }).on('error', err => reject(new Error(`文件下载失败，${repository.url}`)));

                gunzip.on('error', err => reject(new Error('文件gzip解压失败')));
                extracter.on('error', err => reject(new Error('文件tar解压失败'))).on('end', resolve);

                req.res.pipe(gunzip).pipe(extracter);
            });
        }).then(() => {
            gutil.log(`文件解压到 ${chalk.green(this.tmpdir)}`);
        }).catch(utils.error);
    }

    parseProjectConfig(config) {
        let projectDefault = {};

        switch (config.projectType) {
            case 'node':
                projectDefault = require('./node');
                break;
            default:
                projectDefault = require('./static');
                break;
        }

        this.config = _.defaultsDeep(config.deploy, projectDefault, this.config);

        debug('this.config with %o project config: %o', config.projectType, this.config);
    }

    initConfig(next) {
        let src = path.join(this.tmpdir, this.config.base.replace(/\.+/g, '.'));

        let projectConfig = {};

        if (~settings.saferepos.indexOf(this.type)) {
            try {
                projectConfig = require(path.resolve(src, 'fe'));
            } catch (err) {}
        }

        this.parseProjectConfig(projectConfig);

        this.uploadDir = src;

        debug('this.uploadDir: %o', this.uploadDir);

        this.env = this.config.envs[this.envName];

        debug('this.env: %o', this.env);

        this.remote = {
            root: path.join(this.env.dist, (this.type !== settings.defaultType ? 'public' : ''), this.repository.name)
        };
        this.remote.dist = path.join(this.remote.root, this.repository.version);
        this.remote.meta = path.join(this.remote.root, '.metadata');
        this.remote.versions = path.join(this.remote.root, '.versions');

        this.hook = this.config.hook;
        this.pool = Pool.getInstance().init(this.env.hosts, this.env);
        debug('this.remote: %o', this.remote);

        if (this.env.dist.replace(/\/+/g, '/').split('/').length < 3) {
            throw new Error(`目标路径 ${this.env.dist} 不符合要求`);
        }

        next();
    }

    get symlinks() {
        let symlinks = [];

        if (!this.config.disableLatest) {
            symlinks.push('major');
        }

        if (!this.config.disableMajor) {
            symlinks.push('minor');
        }

        if (!this.config.disableMinor) {
            symlinks.push('patch');
        }

        return symlinks;
    }

    fetchMeta(next) {
        let meta = this.remote.meta;

        this.metadata = {
            versions: [],
            list: {}
        };

        // 判断文件是否存在
        let cmd = ['test', '-e', meta, '||', 'echo $?'].join(' ');
        return this.pool.remote(cmd).then(results => {
            let exist = results.every(r => {
                return !r.trim();
            });

            if (!exist) {
                return false;
            }

            debug('download metadata to %o', this.tmpMeta);

            return this.pool.download(meta, this.tmpMeta);
        }).then(() => {

            return new Promise((resolve, reject) => {
                let meta = path.join(this.tmpMeta, settings.deploy.meta);

                debug('read local metadata: %o', meta);

                if (fs.existsSync(meta)) {
                    fs.readFile(meta, (err, data) => {
                        if (err) return resolve(err);
                        this.metadata = JSON.parse(data);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }).catch(utils.error);
    }

    preDeploy(next) {
        let preDeployCmd = this.hook['pre-deploy'];

        return new Promise((resolve, reject) => {
            if (preDeployCmd) {
                this.pool.remote(preDeployCmd.replace(/sudo/g, '')).then(resolve).catch(reject);
            } else {
                resolve();
            }
        }).then(() => {
            debug('inited this.metadata: %o', this.metadata);
        }).catch(utils.error);
    }

    upload(next) {
        return this.pool.upload(this.uploadDir, this.remote.dist).then(() => {
            // DO SOMETHING
        }).catch(utils.error);
    }

    limitVersions(next) {
        let metadata = this.metadata;
        let max = parseInt(this.config.max, 10);
        let shift = (versions) => {
            let version = versions.shift();
            if (version == versions[0]) {
                return shift(versions);
            } else {
                return version;
            }
        };

        if (!max || max < 3 || !metadata || !metadata.versions || metadata.versions.length < max) {
            return next();
        }

        let version = shift(metadata.versions);

        delete metadata.list[version];

        let target = path.join(path.dirname(this.remote.dist), version);
        let cmd = `rm -rf ${target} || echo $?`;
        gutil.log(`删除最旧的备份： ${target}`);
        return this.pool.remote(cmd).catch(utils.error);
    }

    uploadMeta(next) {
        let time = this.deployDate.toString();
        let metadata = this.metadata;

        let meta = path.join(this.tmpMeta, settings.deploy.meta);
        let versions = metadata.versions || [];
        let list = metadata.list || {};
        let version = list[this.repository.version] || {};

        // 更新某版本的最后发布时间
        if (version.time) {
            if (Array.isArray(version.time)) {
                version.time.push(time);
            } else {
                version.time = [version.time].concat(time);
            }
        } else {
            version.time = time;
        }

        this.symlinks.forEach(s => {
            metadata[this.repository.links[s]] = this.repository.version;
        });

        if (versions.indexOf(this.repository.version) > -1) {
            versions.splice(versions.indexOf(this.repository.version), 1);
        }

        versions.push(this.repository.version);
        list[this.repository.version] = version;
        metadata.list = list;
        metadata.versions = versions;

        gutil.log(`上传元数据： ${meta}`);

        return new Promise((resolve, reject) => {
            mkdirp(path.dirname(meta), err => {
                if (err) {
                    return reject(err);
                }

                debug('updated metadata: %o', metadata);

                fs.writeFile(meta, JSON.stringify(metadata), err => {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        }).then(() => this.pool.upload(this.tmpMeta, this.remote.meta)).catch(utils.error);
    }

    uploadVersion(next) {
        let data = {
            files: []
        };

        gutil.log(`检索 package 中所有的文件 ...`);

        return new Promise((resolve, reject) => {
            vfs.src('**/*', {
                read: false,
                cwd: this.uploadDir,
                cwdbase: true
            }).pipe(through2.obj(function(file, enc, cb) {
                this.resume();
                data.files.push(file.relative);
                cb(null, data);
            })).on('end', resolve.bind(null, data)).on('error', reject);
        }).then(data => {
            gutil.log(`上传描述文件: ${this.tmpVersions}`);

            return new Promise((resolve, reject) => {
                let filePath = path.join(this.tmpVersions, `${this.repository.version}.json`);

                debug('local version files: %o', filePath);

                mkdirp(this.tmpVersions, err => {
                    if (err) {
                        return reject(err);
                    }

                    debug('write local version files: %o', data);

                    fs.writeFile(filePath, JSON.stringify(data), err => {
                        if (err) {
                            return reject(err);
                        }

                        return resolve();
                    });
                });
            });
        }).then(() => this.pool.upload(this.tmpVersions, this.remote.versions));
    }

    createLinks(next) {
        let cmd = [];

        this.symlinks.forEach(s => {
            let link = path.join(this.remote.root, this.repository.links[s]);
            cmd.push(`ln -sfn ${this.remote.dist} ${link}`);
        });

        if (this.config.alias) {
            let alias = path.join(this.env.dist, this.config.alias);
            cmd.push(`ln -sfn ${this.remote.dist} ${alias}`);
        }

        return this.pool.remote(cmd.join(' && ')).catch(utils.error);
    }

    postDeploy(next) {
        let postDeployCmd = this.hook['post-deploy'];
        let cwd = '';

        if (postDeployCmd) {
            postDeployCmd = _.template(postDeployCmd)({
                env: this.envName == settings.alias.envs.production ? 'production' : 'development'
            });

            // nodejs 应用不创建minor和patch软链，启动应用需要进入到 latest 目录
            if (this.symlinks.length === 1) {
                cwd = `cd ${path.join(this.remote.root, this.repository.links[this.symlinks[0]])}`;
            } else {
                cwd = `cd ${this.remote.dist}`;
            }

            postDeployCmd = [cwd, postDeployCmd].join(' && ');

            debug('post-deploy, %o', postDeployCmd);

            return this.pool.remote(postDeployCmd.replace(/sudo/g, '')).catch(utils.error);
        } else {
            next();
        }
    }

    clean(next) {
        let tmp = path.dirname(this.tmpdir);
        let cmd = `rm -rf ${tmp} || echo $?`;
        return utils.shell(cmd).then(() => {
            gutil.log('删除临时目录: ' + tmp);
        }).catch(utils.error);
    }

}

module.exports = Deploy;