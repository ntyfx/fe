'use strict';

const Promise = require('bluebird');
const debug = require('debug')('server-cli');

class Server{
    constructor() {
    }

    init(options) {
        console.log('init server');
    }
}

module.exports = function(env, options) {
    var server = new Server();
    server.init(options);
};