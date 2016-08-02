'use strict';

const program = require('commander');
const pkg = require('./package');
const commanders = require('./commanders');
const {optionParser} = require('./utils');

program.version(pkg.version);

// register sub commands
Object.keys(commanders).forEach(key => {
    let command = commanders[key];
    let subProgram = program.command(command.command);
    if(command.options && command.options.length) {
        command.options.forEach(option => {
            subProgram.option(option[0], option[1], optionParser[option[2]]);
        });
    }
    let run = require('./' + key);
    subProgram.alias(command.alias).action(run.bind(null));
});

program.parse(process.argv);

module.exports = program;