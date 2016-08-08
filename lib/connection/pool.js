'use strict';

const Promise = require('bluebird');
const os = require('os');
const debug = require('debug')('conn-pool');

const gutil = require('gulp-util');
const _ = require('lodash');

const Connection = require('./connection');
const Local = require('./local');
const Remote = require('./remote');

class Pool {
    constructor() {}

    init(connections, options) {
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
        return this.copy('upload', src, dist, options);
    }

    download(src, dist, options) {
        return this.copy('download', src, dist, options);
    }

    copy(action, src, dist, options) {
        gutil.log(`${action}: ${src}`);

        debug('%o from %o to %o, optioins: %o', action, src, dist, options);

        return Promise.all(this.connections.map(conn => {
            return conn[action](src, dist, options);
        }));
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