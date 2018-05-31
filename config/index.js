'use strict';

const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const debug = require('debug')('config');

const ini = require('ini');
const gutil = require('gulp-util');
const _ = require('lodash');
const home = process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
const pwd = process.env.PWD;
let defaults = {};

class Config {
    constructor() { }

    static parse(app) {
        let user = Config.parseUser(app);
        let project = Config.parseProject(app);

        try {
            defaults = JSON.parse(fs.readFileSync(path.resolve(__dirname, `defaults.json`), 'utf-8'));
        } catch (err) {
            console.log(err);
        }

        return _.defaultsDeep(project, user, defaults, {});
    }

    static parseUser(app) {
        let config = {};

        try {
            config = ini.parse(fs.readFileSync(path.resolve(home, `.${app}rc`), 'utf-8'));
        } catch (err) { }

        return config;
    }

    static parseProject(app) {
        let config = {};

        try {
            // config = JSON.parse(fs.readFileSync(path.resolve(pwd, `.${app}.json`), 'utf-8'));
            config = require(path.resolve(pwd, `.fe.js`));
            config.package = Config.loadLocalPackage(pwd);
        } catch (err) {
            console.log(err);
        }

        return config;
    }

    static loadLocalPackage(_root) {
        let pkg = {};
        let p = '';

        _root = _root || pwd;
        p = path.resolve(_root, 'package.json');

        try {
            pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (err) {
            throw new Error('解析 `${p}` 失败');
        }

        return pkg;
    }
}

module.exports = (sub, options) => {
    let config = new Config;

    sub = sub || 'list';

    config[sub] && config[sub]();
};

module.exports.Config = Config;