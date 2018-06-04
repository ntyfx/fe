'use strict';

const Promise = require('bluebird');
const os = require('os');
const debug = require('debug')('conn-pool');

const gutil = require('gulp-util');
const chalk = require('chalk');
const _ = require('lodash');

const Connection = require('./connection');
const Local = require('./local');
const Remote = require('./remote');

class Pool {
    constructor() { }

    init(connections, options) {
        connections = Array.from(new Set(connections)).filter(arr => arr);

        debug('connections: %o', connections);

        this.connections = connections.map(conn => {
            if (conn instanceof Connection) return conn;

            let opt = _.extend({}, options, {
                host: conn
            });

            let c = null;

            if (this.checkLocal(conn)) {
                debug('new Local %o', conn);
                c = new Local(opt);
            } else {
                debug('new Remote %o', conn);
                c = new Remote(opt);
            }

            c.init();

            return c;
        });

        return this;
    }

    remote(cmd, options) {
        return Promise.all(this.connections.map(conn => {
            return conn.remote(cmd, options);
        }));
    }

    upload(src, dist, options) {
        gutil.log(`upload from ${chalk.magenta(src)} to ${chalk.blue(dist)}`);

        return Promise.all(this.connections.map(conn => {
            return conn.upload(src, dist, options);
        }));
    }

    download(src, dist, options) {
        gutil.log(`download: ${src}`);

        debug('download from %o to %o, optioins: %o', src, dist, options);
        let conn = this.connections[0];

        return conn.download(src, dist, options);
    }

    checkLocal(ip) {
        let hosts = ['127.0.0.1', 'localhost'];

        if (~hosts.indexOf(ip)) {
            return true;
        }

        let nti = os.networkInterfaces();

        Object.keys(nti).forEach(k => {
            let ips = nti[k].map(h => {
                return h.address;
            });

            hosts = hosts.concat(ips);
        });

        return hosts.some(h => h === ip);
    }
}

const pool = new Pool();

module.exports.getInstance = () => pool;