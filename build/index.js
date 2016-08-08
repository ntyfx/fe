'use strict';

const Promise = require('bluebird');
const debug = require('debug')('build-cli');

class Build{
    constructor() {
    }

    init(options) {
        console.log('init Build');
    }
}

module.exports = function(env, options) {
    var build = new Build();
    build.init(options);
};