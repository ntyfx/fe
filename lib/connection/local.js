'use strict';

const Promise = require('bluebird');
const os = require('os');
const debug = require('debug')('conn-local');

const Connection = require('./connection');

class Local extends Connection {
    constructor(options) {
        super(options);

        this.options.user = os.userInfo().username;
    }

    buildSshCommand(command) {
        return command;
    }

    buildSCPCommand(from, to) {
        var scp = ['cp'];

        return scp.concat(from, to).join(' ');
    }

    generateScpPath(p) {
        return p;
    }

}

module.exports = Local;