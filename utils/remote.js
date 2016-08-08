'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-remote');

// Expose modules.
module.exports.parse = parse;
module.exports.format = format;

/**
 * Parse a remote string.
 *
 * @param {string} str
 * @returns {object}
 */
function parse(str) {
    if (!str)
        throw new Error('解析ssh 连接串不能为空，格式为 username@hostname:port');

    var matches = str.match(/(.*)@([^:]*):?(.*)/);

    if (!matches)
        throw new Error('格式不对');

    return {
        user: matches[1],
        host: matches[2],
        port: +matches[3] || undefined
    };
}

/**
 * Format a remote object.
 *
 * @param {object} obj Remote object
 * @returns {string}
 */
function format(obj) {
    let user = obj.user;

    return `${user}@${obj.host}`;
}