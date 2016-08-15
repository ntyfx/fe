'use strict';

const path = require('path');
const Promise = require('bluebird');
const debug = require('debug')('connection');
const _ = require('lodash');

const gutil = require('gulp-util');
const chalk = require('chalk');
const utils = require('../../utils');

class Connection {
    constructor(opts) {
        this.options = _.defaults(opts || {}, {
            maxBuffer: 1000 * 1024
        });
    }

    init() {
        let opts = this.options;

        this.ssh = {
            remote: utils.remote.format(opts),
            args: this.buildSSHArgs(opts)
        };

        this.scp = {
            remote: utils.remote.format(opts),
            args: this.buildSCPArgs(opts)
        };

        this.label = `[${chalk.yellow(this.ssh.remote)}]`;

        debug('this.options: %o', opts);
        debug('this.ssh: %o', this.ssh);
        debug('this.scp: %o', this.scp);

        return this;
    }

    upload(src, dist, options) {
        let opt = Object.assign({}, options);
        opt.direction = 'localToRemote';

        return this.copy(src, dist, opt);
    }

    download(src, dist, options) {
        let opt = Object.assign({}, options);
        opt.direction = 'remoteToLocal';

        return this.copy(src, dist, opt);
    }

    copy(src, dist, options) {
        if (!options || !options.direction) {
            throw new Error('connection.copy: 请提供正确的方向，options.direction = "remoteToLocal" | "localToRemote"');
        }

        let commands = this.generateScpCopyCommands(options, src, dist);

        options = _.omit(options, 'direction');

        return Promise.reduce(commands, (result, command) => {
            gutil.log(`${command.desc}`);
            return this.run(command.cmd, options);
        }, {});
    }

    remote(command, options) {
        command.split(' && ').forEach(c => {
            gutil.log(`${this.label} 运行命令 ${c}`);
        });

        command = this.buildSshCommand(command);

        return this.run(command, options);
    }

    run(command, options) {
        debug('run: %o %o', command, options);
        return utils.shell(command, options);
    }

    generateScpCopyCommands(options, src, dest) {
        let formatExcludes = excludes => {
            let arr = [];

            if (excludes) {
                arr = excludes.reduce((prev, current) => {
                    return prev.concat(['--exclude', '"' + current + '"']);
                }, []);
            }

            return arr;
        };

        let excludes = formatExcludes(options.excludes);

        let packageFile = `${path.basename(src)}.${_.now()}.tar.gz`;

        let fromPath = path.join(path.dirname(src), packageFile);
        let toPath = dest;

        let mkdir = ['mkdir', '-p', dest].join(' ');

        let cdSource = ['cd', path.dirname(src)].join(' ');
        let cdDest = ['cd', dest].join(' ');

        let tar = [cdSource, ['tar'].concat(excludes).concat('-czf', packageFile, path.basename(src)).join(' ')].join(' && ');

        // The command to untar the destination package
        let untar = [cdDest, ['tar'].concat('--strip-components', '1', '-xzmf', packageFile).join(' ')].join(' && ');

        let rm = ['rm', packageFile, '||', 'echo', '$?'].join(' ');
        let rmSource = [cdSource, rm].join(' && ');
        let rmDest = [cdDest, rm].join(' && ');

        if (options.direction == 'localToRemote') {
            toPath = this.generateScpPath(toPath);
            cdDest = this.buildSshCommand(cdDest);
            untar = this.buildSshCommand(untar);
            rmDest = this.buildSshCommand(rmDest);
            mkdir = this.buildSshCommand(mkdir);
        } else {
            fromPath = this.generateScpPath(fromPath);
            cdSource = this.buildSshCommand(cdSource);
            tar = this.buildSshCommand(tar);
            rmSource = this.buildSshCommand(rmSource);
        }

        let scp = this.buildSCPCommand(fromPath, toPath);

        /*
            1. local:   tar src
            2. remote:  创建目标目录
            3. local:   scp 上传文件
            4. remote:  untar
            5. local:   删除本地 tar
            6. remote:  删除目标 tar
         */
        return [{
            desc: `${this.label} 创建远程目录 ${dest}`,
            cmd: mkdir
        }, {
            desc: `${this.label} 打包文件 ${packageFile}`,
            cmd: tar
        }, {
            desc: `${this.label} 上传文件 ${packageFile}`,
            cmd: scp
        }, {
            desc: `${this.label} 远程解压 ${packageFile}`,
            cmd: untar
        }, {
            desc: `${this.label} 删除远程临时文件 ${packageFile}`,
            cmd: rmDest
        }, {
            desc: `${this.label} 删除本地临时文件 ${packageFile}`,
            cmd: rmSource
        }];
    }

    buildSshCommand(command) {
        // In sudo mode, we use a TTY channel.
        let args = /^sudo/.exec(command) ? ['-tt'] : [];
        args.push.apply(args, this.ssh.args);
        args.push(this.ssh.remote);
        debug('buildSshCommand: %o', command);
        // Escape double quotes in command.
        command = command.replace(/"/g, '\\"');

        // Complete arguments.
        args = ['ssh'].concat(args).concat(['"' + command + '"']);

        return args.join(' ');
    }

    buildSCPCommand(from, to) {
        var scp = ['scp'];

        scp = scp.concat(this.scp.args);

        return scp.concat(from, to).join(' ');
    }

    buildSSHArgs(options) {
        let args = [];

        if (options.port) {
            args = args.concat(['-p', options.port]);
        }

        if (options.forward_agent) {
            args.push('-A');
        }

        if (options.key) {
            args = args.concat(['-i', options.key]);
        }

        if (options.strict) {
            args = args.concat(['-o', 'StrictHostKeyChecking=' + options.strict]);
        }

        if (options.proxy) {
            let p = options.proxy;
            let proxyArgs = this.buildSSHArgs(p);
            let proxyRemote = utils.remote.format(p);

            args = args.concat(['-o', `ProxyCommand="ssh -q -W %h:%p ${proxyRemote} ${proxyArgs.join(' ')}"`]);
        }

        if (Array.isArray(options.ssh_options)) {
            args = args.concat(options.ssh_options);
        }

        return args;
    }

    buildSCPArgs(options) {
        let args = [];

        if (options.port) {
            args = args.concat(['-P', options.port]);
        }

        if (options.key) {
            args = args.concat(['-i', options.key]);
        }

        if (options.proxy) {
            let p = options.proxy;
            args = args.concat(['-o', `ProxyCommand="ssh -q -W %h:%p ${p.user}@${p.host} -p ${p.port}"`]);
        }

        return args;
    }

    generateScpPath(p) {
        return `${this.scp.remote}:${p}`;
    }
}

module.exports = Connection;