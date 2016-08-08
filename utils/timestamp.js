'use strict';

const timestamp = require('time-stamp');
const chalk = require('chalk');

module.exports = () => {
    return '[' + chalk.grey(timestamp('HH:mm:ss')) + ']';
};