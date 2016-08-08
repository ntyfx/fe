'use strict';

const Promise = require('bluebird');
const debug = require('debug')('conn-remote');

const Connection = require('./connection');

class Remote extends Connection {
    constructor(options) {
        super(options);
    }

}

module.exports = Remote;