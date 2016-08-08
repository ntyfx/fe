'use strict';

module.exports = {
    "deploy": {
        "action": require('./deploy'),
        "command": "deploy [env]",
        "description": "run deploy commands for envs",
        "alias": "d",
        "options": [
            ["-t, --type     [String]", "设置类型，默认为 `git`，可选的有 [`npm`, `git`]"],
            ["-p, --package  [String]", "设置包名，例如：zepto@1.0.0"],
            ["-b --base      [String]", "设置发布的根目录，例如：./dest，默认为 `.` "],
            ["-f --force     [Boolean]", "强制发布"],
            ["--disableLatest", "不重新指定 `latest` 版本"],
            ["--disableMajor", "不重新指定 `major` 版本"],
            ["--disableMinor", "不重新指定 `minor` 版本"]
        ]
    },
    "config": {
        "action": require('./config'),
        "command": "config [sub]",
        "description": "setup static server at current dir",
        "alias": "c",
        "options": [

        ]
    },
    "server": {
        "action": require('./server'),
        "command": "server",
        "description": "setup static server at current dir",
        "alias": "s",
        "options": [
            ["-p, --port [port]", "设置端口号，默认为 `9001`"]
        ]
    },
    "build": {
        "action": require('./build'),
        "command": "build",
        "description": "build",
        "alias": "b",
        "options": [
            ["-p, --port [port]", "设置端口号，默认为 `9001`"]
        ]
    },
    "generator": {
        "action": require('./generator'),
        "command": "generator [name]",
        "description": "run generator commands for envs",
        "alias": "g",
        "options": [
            ["-s, --setup_mode [mode]", "Which setup mode to use"],
            ["-d, --setup_mode [mode]", "Which setup mode to use"]
        ]
    }
};