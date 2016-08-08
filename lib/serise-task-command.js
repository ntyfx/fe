'use strict';

const Promise = require('bluebird');

const Orchestrator = require('orchestrator');
const gutil = require('gulp-util');
const chalk = require('chalk');
var prettyTime = require('pretty-hrtime');

const utils = require('../utils');

class SeriesTaskCommand extends Orchestrator {
    constructor() {
        super();
        this.tasks = [];
        this.on('err', e => utils.error(e.err));
        this.on('task_start', this.taskStart.bind(this));
        this.on('task_stop', this.taskStop.bind(this));
        this.on('task_err', this.taskError.bind(this));
    }

    run() {
        let tasks = this.tasks;
        if(!tasks.length) {
            return;
        }
        tasks.forEach((v, i) => {
            let args = [v];
            let dep = tasks[i - 1];

            dep && args.push([dep]);

            args.push(this[v].bind(this));

            this.add.apply(this, args);
        });

        this.start.apply(this, tasks);
    }

    taskStart(e) {
        gutil.log(`Starting '${chalk.cyan(e.task)}'...`);
    }

    taskStop(e) {
        var time = prettyTime(e.hrDuration);
        gutil.log(`Finished '${chalk.cyan(e.task)}' after ${chalk.magenta(time)}`);
    }

    taskError(e) {
        var msg = formatError(e);
        var time = prettyTime(e.hrDuration);
        gutil.log(`'${chalk.cyan(e.task)}' ${chalk.red('errored after')} ${chalk.magenta(time)}`);
        gutil.log(`${msg}`);
    }
}

function formatError(e) {
    if (!e.err) {
        return e.message;
    }

    // PluginError
    if (typeof e.err.showStack === 'boolean') {
        return e.err.toString();
    }

    // Normal error
    if (e.err.stack) {
        return e.err.stack;
    }

    // Unknown (string, number, etc.)
    return new Error(String(e.err)).stack;
}

module.exports = SeriesTaskCommand;