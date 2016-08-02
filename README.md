# FE: 学霸君前端开发工具集

定位： 在学霸君前端团队的命令行工具集

目标： 易用的

# `v1.0.0` 功能

## deploy

前端资源发布到 [静态资源站点](http://static.xueba100.com/)，该功能遵循 NodeJS 社区对 `package` 的定义，每次可发布一个 `package`。

### 例子

发布一个已开发好的 `package`

```
cd $package_root // 进入到本地开发的 package 根目录，即 package.json所在的目录
fe deploy production --ref v1.0.0
// ref 为需要发布的版本，v1.0.0 为此次发布打的tag，并且必须push到服务器端
// production 为需要发布的环境，默认为test
```

也可以发布一个 `npm` 仓库中的公共的 `package`，其中 `-n` 参数的值的格式是必须的，为 `name@version`

```
fe d production -t npm -n zepto@v1.1.7
```

### 使用

```
  Usage: deploy|d [options] [name]

  Options:

    -h, --help                output usage information
    -H, --host     [String]   设置临时发布的机器IP
    -P, --path     [String]   设置服务器端的发布目录
    -R, --repo     [String]   设置仓库地址，默认为package中repository.url
    -b, --build    [Boolean]  设置是否需要进行build，文件名md5等操作
    -c, --config   [String]   设置发布的配置文件，默认为 `fe.json`
    -d, --dest     [String]   设置发布的目录
    -e, --env      [String]   设置发布的环境 [`production`, `test`]，默认为 `test`
    -n --name      [String]   当type为npm时设置包名，例如：zepto@1.0.0
    -p, --port     [Number]   通过ssh链接服务器时的端口号，默认是 `9922`
    -r, --ref      [String]   设置发布的分支
    -t --type      [String]   设置类型，默认为 `git`，可选的有 [`npm`, `git`]
    -u, --user     [String]   设置远程链接的用户，默认为 `wenba`
```

### 开发

将自己常用的功能集成进来，和小伙伴们共享

#### 新增一个子命令 `test`

1. clone repo

```
git clone ssh://git@116.236.249.238:9922/frontend/fe.git fe
cd fe && npm install
```

2. edit `commanders.json`，新增子命令 `test`

```
    "test": {
        "command": "test [name]",
        "description": "run test commands",
        "alias": "g",
        "options": [
            ["-f, --setup_foo [foo]", "Which setup foo to use"],
            ["-bar, --setup_bar [bar]", "Which setup bar to use"]
        ]
    }
```

3. 新建文件

```
mkdir test
touch index.js
```

4. edit test/index.js

```
'use strict';

class Test{
    constructor() {
    }

    init(options) {
        console.log('init Test');
    }
}

module.exports = function(env, options) {
    var test = new Test();
    test.init(options);
};
```

5. run

```
./bin/fe
```