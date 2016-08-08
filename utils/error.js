'use strict';

const gutil = require('gulp-util');
const chalk = require('chalk');

module.exports = err => {
    gutil.log(chalk.red(`${err}`));
    process.exit(1);
};