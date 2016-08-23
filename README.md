# FE: 学霸君前端开发工具集

![logo](https://116.236.249.238:2443/frontend/fe/uploads/b0c1e5b750cfc00fa093c00110beb76d/tool.png)

定位： 在学霸君前端团队的命令行工具集

目标： 易用的

# 安装

```
cnpm install @xueba/fe
```

注：cnpm 需设置公司内网npm仓库地址 `cnpm set registry http://10.2.1.104:7001/`

# 功能

## deploy

前端资源发布到 [静态资源站点](http://static.xueba100.com/)，该功能遵循 NodeJS 社区对 `package` 的定义，每次可发布一个 `package`。

### 例子

发布一个已开发好的 `package`

```
fe d test -p frontend/appsh5@1.7.0
```

其中：

1. `fe`: 命令名
2. `d`: 子命令 `deploy` 的别名，你也可以直接用 `deploy`
3. `test`: 待发布的环境，默认为 `dev`，可选的有 `dev`、`test`、`prod`
4. `-p`: 参数 `--package` 的简写，用来指定package ID
5. `frontend/appsh5@1.7.0`: `package` 的 `ID`，格式为 group/name@[tag|branch]，其中tag必须符合 `semver` 规范， `branch` 只在非生产环境有效

也可以发布一个 `npm` 仓库中的公共的 `package`，这里 package ID 的格式为 name@version

```
fe d test -t npm -p zepto@v1.1.7
```

### 使用

```
  Usage: deploy|d [options] [env]

  Options:

    -h, --help                output usage information
    -t, --type     [String]   设置类型，默认为 `git`，可选的有 [`npm`, `git`]
    -p, --package  [String]   设置包名，例如：zepto@1.0.0
    -b --base      [String]   设置发布的根目录，例如：./dest，默认为 `.`
    -f --force     [Boolean]  强制发布
    --disableLatest           不重新指定 `latest` 版本
    --disableMajor            不重新指定 `major` 版本
    --disableMinor            不重新指定 `minor` 版本
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
        "action": require('./test'),
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

module.exports = function(config, env, command) {
    console.log('just a test');
};
```

5. run

```
./bin/fe test

// >> just a test
```

## TODO

[] 打包功能，对普通 `package` 中文件的文件名加 md5，应对 CDN 缓存

[] 回滚操作，将 `latest` 版本重定向到上次发布的版本

[] 静态服务器，在当前工作目录启动一个静态服务器，并内置 `mock` 数据服务

[] 模板脚手架，内置一些常用的模板，一键生成需要的项目架构
