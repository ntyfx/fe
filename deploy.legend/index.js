'use strict';

const Promise = require('bluebird');
const debug = require('debug')('deploy-cli');
const gutil = require('gulp-util');
const chalk = require('chalk');
const _ = require('lodash');
const co = require('co');
const Deploy = require('./deploy');
const defaults = require('./defaults');
const utils = require('../utils');

module.exports = function(config, env, command) {
    let deploy = new Deploy();
    let opts = command.opts();

    config = _.defaultsDeep(opts, config, defaults, {});

    return co(() => deploy.init(env, config).run()).catch(utils.error);
};