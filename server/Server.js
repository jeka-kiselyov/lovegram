const { Program, Command, LovaClass } = require('lovacli');
const path = require('path');
const fs = require('fs');
const webpack = require("webpack");
const Fastify = require('fastify');
const crypto = require('crypto');
const mime = require('mime-types');

class Server extends LovaClass { /// LovaClass is also EventEmmiter
    constructor(params = {}) {
        super(params);
        this._server = null;
        this._logger = params.logger || null;
        this._ds = params.ds || null;

        this._events = [];

        this._beforeInit = params.beforeInit || null;

        this._outData = {
            index: {
                content: null,
                fileName: path.join(__dirname, '../frontend/index.html'),
                contentType: 'text/html',
                livereload: true
            },
            favicon: {
                content: null,
                fileName: path.join(__dirname, '../frontend/favicon.ico'),
                contentType: 'image/x-icon'
            },
            robotstxt: {
                content: null,
                fileName: path.join(__dirname, '../frontend/robots.txt'),
                contentType: 'text/plain'
            },
            sw: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/sw.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/sw.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            authjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/auth.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/auth.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            mtpjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/mtp.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/mtp.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            mtworkerjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/mtworker.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/mtworker.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            webpworkerjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/webpworker.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/webpworker.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            appjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack/app.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/app.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true
            },
            indexjs: {
                content: null,
                fileName: path.join(__dirname, '../frontend/webpack.config.js'),
                compiledFileName: path.join(__dirname, '../frontend/dist/index.js'),
                contentType: 'text/javascript',
                webpack: true,
                watch: true,
                livereload: true,
                gzip: true,
            }
        };

        this._port = params.port || 8080;

        this._enableLivereload = params.enableLivereload || false;
        this._enableWebpackWatch = params.enableWebpackWatch || false;
        this._enableWebpackBuild = params.enableWebpackBuild || false;
	}

    log(str) {
        if (this._logger) {
            this._logger.debug(str);
        } else {
            console.log(str);
        }
    }

    async init() {
        this.log('Creating server instance...');
        this._server = Fastify();

        if (typeof this._beforeInit === "function") {
            this._beforeInit(this._server);
        }

        this._server.get('/*', {}, this.asyncWrap(this.index));
        this._server.get('/favicon.ico', {}, this.asyncWrap(this.favicon));
        this._server.get('/index.js', {}, this.asyncWrap(this.indexjs));
        this._server.get('/auth.js', {}, this.asyncWrap(this.authjs));
        this._server.get('/app.js', {}, this.asyncWrap(this.appjs));
        this._server.get('/mtp.js', {}, this.asyncWrap(this.mtpjs));
        this._server.get('/mtworker.js', {}, this.asyncWrap(this.mtworkerjs));
        this._server.get('/webpworker.js', {}, this.asyncWrap(this.webpworkerjs));
        this._server.get('/sw.js', {}, this.asyncWrap(this.sw));
        this._server.get('/robots.txt', {}, this.asyncWrap(this.robotstxt));
        this._server.get('/assets/*', {}, this.asyncWrap(this.asset));


        this._server.get('/subdir/*', {}, this.asyncWrap(this.index));
        this._server.get('/subdir/favicon.ico', {}, this.asyncWrap(this.favicon));
        this._server.get('/subdir/index.js', {}, this.asyncWrap(this.indexjs));
        this._server.get('/subdir/auth.js', {}, this.asyncWrap(this.authjs));
        this._server.get('/subdir/app.js', {}, this.asyncWrap(this.appjs));
        this._server.get('/subdir/mtp.js', {}, this.asyncWrap(this.mtpjs));
        this._server.get('/subdir/mtworker.js', {}, this.asyncWrap(this.mtworkerjs));
        this._server.get('/subdir/webpworker.js', {}, this.asyncWrap(this.webpworkerjs));
        this._server.get('/subdir/sw.js', {}, this.asyncWrap(this.sw));
        this._server.get('/subdir/robots.txt', {}, this.asyncWrap(this.robotstxt));
        this._server.get('/subdir/assets/*', {}, this.asyncWrap(this.asset));

        await this._server.ready();
        await this._server.listen(this._port, '0.0.0.0');

        this.log('Server listening at port #'+this._port);

        await this.initLivereload();
    }

    async asset(req, res) {
        let fname = null;
        if (req && req.params && req.params['*']) {
            fname = req.params['*'];
        }
        // let content = fs.readFileSync(path.join(__dirname, '../frontend/assets/'+fname));
        if (fname.indexOf('.makaka') === -1) {
            res
                .type(mime.lookup(fname))
                .compress(fs.createReadStream(path.join(__dirname, '../frontend/assets/'+fname)));
        } else {
            res
                .send(fs.readFileSync(path.join(__dirname, '../frontend/assets/'+fname)));
        }

    //     res.header('content-type', mime.lookup(fname));

    // .compress(fs.createReadStream('./package.json'))
    //     res.send(content);
        // let content = fs.readFileSync(this._outData[name].fileName);
        // res.header('content-type', outData.contentType);
        // res.send(outData.content);
    }

    async initLivereload() {
        if (!this._enableLivereload) {
            return false;
        }

        let pathes = [];
        pathes.push(path.join(__dirname, '../frontend/assets'));

        for (const [key, outData] of Object.entries(this._outData)) {
            if (outData.livereload) {
                let fileName = outData.compiledFileName || outData.fileName || null;
                if (fileName) {
                    pathes.push(fileName);
                }
            }
        }

        if (pathes) {
            this.log("Setting up LiveReload server to watch on "+pathes.length+" pathes...");

            try {
                const livereload = require('livereload');
                const server = livereload.createServer();
                server.on('error', ()=>{
                    this.log("Error initializing LiveReload server");
                });

                server.watch(pathes);
            } catch(e) {
                console.log(e);
                this.log("Error initializing LiveReload server");
            }
        }
    }

    asyncWrap(fn, checkAuth) {
        return async (req, res)=>{
            this.log('Server request: '+req.raw.url);
            await fn.call(this, req, res);
        };
    }

    async getOutData(name) {
        if (this._outData[name] && this._outData[name].content !== null) {
            return this._outData[name];
        }

        try {
            if (this._outData[name].webpack && !this._enableWebpackBuild) {
                /// if we are not using webpack - use already compiled code
                this._outData[name].fileName = this._outData[name].compiledFileName;
            }

            if (this._outData[name].webpack && this._enableWebpackBuild) {
                this.log("Compiling "+this._outData[name].fileName+" with webpack...");

                let compilerOptions = require(this._outData[name].fileName);
                console.log(compilerOptions);
                let compiler = webpack(compilerOptions);

                let promise = new Promise((resolve, reject)=>{
                    compiler.run((err, stats) => {
                        if (err) {
                            return reject(err);
                        }
                        this._outData[name].hash = stats.hash || null;

                        resolve(true);
                    });
                });

                try {
                    await promise;
                    this.log("Compiled to "+this._outData[name].compiledFileName);
                    this._outData[name].content = fs.readFileSync(this._outData[name].compiledFileName);
                    this._outData[name].etag = crypto.createHash('md5').update(this._outData[name].content).digest("hex");
                } catch(e) {
                    this.log(e);
                    this._outData[name].content = null;
                    this._outData[name].etag = 'null';
                }


                if (this._outData[name].watch && this._enableWebpackWatch) {
                    const watching = compiler.watch({
                            // Example watchOptions
                            aggregateTimeout: 300,
                            poll: undefined
                        }, (err, stats) => {
                            if (stats && stats.hash && stats.hash != this._outData[name].hash) {
                                this._outData[name].hash = stats.hash;
                                this.log("Webpack sources for "+name+" have been changed");
                                this._outData[name].content = null;
                            }
                        });
                }
            } else {
                this.log("Reading content from "+this._outData[name].fileName+"  ...");
                if (this._outData[name].livereload && this._enableLivereload) {
                    /// do not cache files for livereload. This is the quick hack for index.html
                    let content = fs.readFileSync(this._outData[name].fileName);
                    let obj = Object.assign({}, this._outData[name]);
                    obj.content = content;
                    return obj;
                } else {
                    this._outData[name].content = fs.readFileSync(this._outData[name].fileName);
                    this._outData[name].etag = crypto.createHash('md5').update(this._outData[name].content).digest("hex");
                }

            }
        } catch(e) {
            this.log(e);
            this._outData[name].content = null;
            this._outData[name].etag = 'null';
        }

        return this._outData[name];
    }

    async index(req, res) {
        let outData = await this.getOutData('index');
        res.header('content-type', outData.contentType);
        res.send(outData.content);
    }

    async sw(req, res) {
        let outData = await this.getOutData('sw');
        res.header('content-type', outData.contentType);
        res.send(outData.content);
    }

    async outjs(dataName, req, res) {
        let etag = req.headers['if-none-match'] || '';
        let outData = await this.getOutData(dataName);

        if (outData.etag && outData.etag === etag) {
            return res.status(304).send();
        }

        res.header('ETag', outData.etag);
        res
            .type(outData.contentType)
            .compress(outData.content);
    }

    async indexjs(req, res) {
       return await this.outjs('indexjs', req, res);
    }

    async authjs(req, res) {
       return await this.outjs('authjs', req, res);
    }

    async mtpjs(req, res) {
       return await this.outjs('mtpjs', req, res);
    }

    async mtworkerjs(req, res) {
       return await this.outjs('mtworkerjs', req, res);
    }

    async webpworkerjs(req, res) {
       return await this.outjs('webpworkerjs', req, res);
    }

    async sw(req, res) {
       return await this.outjs('sw', req, res);
    }

    async appjs(req, res) {
       return await this.outjs('appjs', req, res);
    }

    async robotstxt(req, res) {
        req.requireAuth();
        console.log(req.user);

        let outData = await this.getOutData('robotstxt');
        res.header('content-type', outData.contentType);
        res.send(outData.content);
    }

    async favicon(req, res) {
        let outData = await this.getOutData('favicon');
        res.header('content-type', outData.contentType);
        res.send(outData.content);
    }
}

module.exports = Server;