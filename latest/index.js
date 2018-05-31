const debug = require('debug')('latest');

const util = require('util');
const Promise = require('bluebird');
const _ = require('lodash');
const co = require('co');
const utils = require('../utils');
const Commander = require('../lib/commander');

module.exports = class Latest extends Commander {
  constructor(...props) {
    super(...props);
  }

  run() {
    let p = `${this.config.deploy.dist}/${this.name}`;
    let cmd = `ls -l ${p}`;

    if (!this.opts.all) {
      cmd += ' | grep latest';
    }

    return this.pool.remote(cmd).then(([ret]) => {
      console.log(ret);
      return ret;
    }).catch(err => {
      this.pool.remote(`mkdir -p ${p}`);
    });
  }
};