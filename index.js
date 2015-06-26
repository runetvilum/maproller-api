/*jslint nomen: true */
/*jslint plusplus: true */
/*global require, console, __dirname, process, Buffer*/
(function () {
    'use strict';
    var argv = require('minimist')(process.argv.slice(2)),
        jf = require('jsonfile'),
        crypto = require('crypto'),
        async = require('async'),
        imageType = require('image-type'),
        sqlite3 = require('sqlite3'),
        request = require('request'),
        http = require('http'),
        os = require("os"),
        hostname = os.hostname(),
        express = require('express'),
        compress = require('compression'),
        basicAuth = require('basic-auth'),
        cors = require('cors'),
        bodyParser = require('body-parser'),
        //var busboy = require('connect-busboy');
        Busboy = require('busboy'),
        geojsonvt = require('geojson-vt'),
        //var cookieParser = require('cookie-parser');
        uuid = require('uuid'),
        inspect = require('util').inspect,
        emailTemplates = require('email-templates'),
        path = require('path'),
        templatesDir = path.join(__dirname, 'templates'),
        nodemailer = require('nodemailer'),
        fs = require('fs'),
        config,
        app = express(),
        url_5986,
        auth,
        db,
        db_admin,
        nano,
        transport,
        checkAdmin,
        schemaPostPut,
        sinh = function sinh(x) {
            return (Math.exp(x) - Math.exp(-x)) / 2;
        },
        transformPoint = function (p, z2, tx, ty, extent) {
            var x = (p[0] / extent + tx), //Math.round(extent * (p[0] * z2 - tx)),
                y = (p[1] / extent + ty), //Math.round(extent * (p[1] * z2 - ty));
                lon = 360 * x / z2 - 180,
                lat = 180 / Math.PI * Math.atan(sinh(Math.PI * (1 - 2 * y / z2)));
            return [lon, lat];

            /*y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
            var sin = Math.sin(p[1] * Math.PI / 180),
            x = (p[0] / 360 + 0.5),
        

            return [x, y];*/
        },
        createTemplate = function (req, organization) {
            return function (callback) {
                var id2 = 'app-' + req.params.id + '-' + organization;
                nano.db.get(id2, function (err, body) {
                    if (err) {
                        nano.db.create(id2, function (err, body) {
                            var dbOrganization = nano.db.use(id2),
                                security = {
                                    admins: {
                                        names: [],
                                        roles: ["_admin", "sys"]
                                    },
                                    members: {
                                        names: [],
                                        roles: []
                                    }
                                };
                            dbOrganization.insert(security, "_security", function (err, body) {
                                var secdoc = {
                                    validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1 || userCtx.roles.indexOf('admin_" + req.params.id + "') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                                };
                                dbOrganization.insert(secdoc, '_design/security', function (err, body) {
                                    callback();
                                });
                            });
                        });
                    } else {
                        callback();
                    }
                });
            };
        },
        addFeature = function (feature, tilePoint) {

            var geom = feature.geometry,
                type = feature.type,
                geojson = {
                    coordinates: []
                },
                i,
                j,
                ring,
                transformedRing,
                p,
                z2 = 1 << tilePoint.z,
                tx = tilePoint.x,
                ty = tilePoint.y,
                extent = 4096;

            if (type === 1) {
                geojson.type = "Point";
                for (i = 0; i < geom.length; i++) {
                    geojson.coordinates.push(transformPoint(geom[i], z2, tx, ty, extent));

                }

            } else {
                if (type === 2) {
                    geojson.type = "LineString";
                } else if (type === 3) {
                    geojson.type = "Polygon";
                }
                // simplify and transform projected coordinates for tile geometry
                for (i = 0; i < geom.length; i++) {
                    ring = geom[i];

                    transformedRing = [];

                    for (j = 0; j < ring.length; j++) {
                        p = ring[j];
                        transformedRing.push(transformPoint(p, z2, tx, ty, extent));
                    }

                    geojson.coordinates.push(transformedRing);
                }
            }


            return geojson;
        };


    if (argv.config) {
        config = jf.readFileSync(argv.config);
    } else {
        console.log("Du skal angive config fil, f.eks.:  --config=config.json");
    }
    transport = nodemailer.createTransport(config.transport);
    url_5986 = "http://localhost:" + config.couchdb.port5986;

    db = require('nano')({
        url: 'http://localhost:' + config.couchdb.port5986 + '/_users',
        requestDefaults: {
            auth: {
                user: config.couchdb.user,
                pass: config.couchdb.password
            }
        }
    });
    nano = require('nano')({
        url: 'http://localhost:' + config.couchdb.port5984,
        requestDefaults: {
            auth: {
                user: config.couchdb.user,
                pass: config.couchdb.password
            }
        }
    });
    db_admin = nano.db.use("admin");

    app.use('/tilestream', function (req, res) {

        var url = "http://localhost:8888" + req.url;
        console.log(url);
        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'POST') {
            req.pipe(request.post(url)).pipe(res);
        } else if (req.method === 'GET') {
            req.pipe(request.get(url)).pipe(res);
        }
    });
    app.use('/follow', function (req, res) {

        var url = "http://localhost:4001/follow" + req.url;
        console.log(url);
        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'DELETE') {
            req.pipe(request.del(url)).pipe(res);
        }
    });
    app.all('/es*', function (req, res) {
        var url = "http://127.0.0.1:9200/" + req.url.substring(4);
        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'POST') {
            req.pipe(request.post(url)).pipe(res);
        } else if (req.method === 'GET') {
            req.pipe(request.get(url)).pipe(res);
        } else if (req.method === 'DELETE') {
            req.pipe(request.del(url)).pipe(res);
        }
    });

    app.all('/couchdb*', function (req, res) {
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Allow-Origin', 'http://localhost:8100');
        res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, HEAD, DELETE');
        res.set('Access-Control-Allow-Headers', 'accept, authorization, content-type, origin, referer');
        var url = "http://localhost:5984/" + req.url.substring(9);
        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'POST') {
            req.pipe(request.post(url)).pipe(res);
        } else if (req.method === 'GET') {
            req.pipe(request.get(url)).pipe(res);
        } else if (req.method === 'DELETE') {
            req.pipe(request.del(url)).pipe(res);
        } else if (req.method === 'OPTIONS') {
            res.end();
        }

    });
    app.all('/_fti*', function (req, res) {

        var url = "http://localhost:5984" + req.url;
        console.log(url);
        //console.log(inspect(req,{colors:true}));

        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'POST') {
            req.pipe(request.post(url)).pipe(res);
        } else if (req.method === 'GET') {
            req.pipe(request.get(url)).pipe(res);
        }

    });





    app.use(compress());
    /*app.use(cors({
        allowedHeaders: ["accept", "authorization", "content-type", "origin", "referer"]
    }));*/
    app.use(cors({
        credentials: true,
        origin: function (origin, callback) {
            callback(null, true);
        }
    }));

    app.use(bodyParser.json({
        limit: '100mb'
    }));
    /*app.use('/api/upload', busboy({
        immediate: true
    }));*/
    //app.use(cookieParser());

    app.use(express["static"](__dirname)); //  "public" off of current is root

    auth = function (req, res, next) {
        function unauthorized(res) {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            return res.send(401);
        }

        function cookie(req, res, next) {
            var couchdb = require('nano')({
                cookie: req.headers.cookie,
                url: url_5986
            });
            couchdb.session(function (err, session, headers) {
                if (err) {
                    return unauthorized(res);
                }
                req.userCtx = session.userCtx;
                if (headers && headers['set-cookie']) {
                    res.set('set-cookie', headers['set-cookie']);
                }
                return next();
            });
        }

        function login(user, req, res, next) {
            var couchdb = require('nano')({
                url: url_5986
            });
            couchdb.auth(user.name, user.pass, function (err, body, headers) {
                if (err) {
                    return unauthorized(res);
                }
                req.userCtx = body;
                if (headers && headers['set-cookie']) {
                    res.set('set-cookie', headers['set-cookie']);
                }
                return next();
            });
        }
        var user = basicAuth(req);
        if (!user || !user.name || !user.pass) {
            if (req.headers && req.headers.cookie) {
                return cookie(req, res, next);
            }
            return unauthorized(res);
        }
        return login(user, req, res, next);
    };

    //region Login
    app.post('/api/signin', function (req, res) {
        if (!req.body || !req.body.name || !req.body.password) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            }));
        }
        var couchdb = require('nano')({
            url: url_5986
        });
        couchdb.auth(req.body.name, req.body.password, function (err, body, headers) {
            if (err) {

                return res.status(err.status_code || 500).send(err);
            }
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }

            db.get('org.couchdb.user:' + req.body.name, function (err, user) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                user.roles = body.roles;
                if (body.roles.indexOf('_admin') === -1 && !user.verified) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du skal bekræfte din konto inden du kan logge ind. Check venligst din email (inklusiv spam folder) for mere information.'
                    }));
                }
                user.organizations = [];
                if (user.roles.indexOf('sys') === -1 && user.roles.indexOf('_admin') === -1) {
                    var roles = [],
                        i,
                        role;
                    for (i = 0; i < user.roles.length; i++) {
                        role = user.roles[i];
                        roles.push(role.replace('user_', '').replace('admin_', ''));
                    }
                    db_admin.view('organization', 'organizations', {
                        keys: roles
                    }, function (err, body) {
                        if (!err) {
                            user.organizations = body.rows;
                        }
                        res.end(JSON.stringify({
                            ok: true,
                            user: user
                        }));
                    });
                } else {
                    db_admin.view('organization', 'organizations', function (err, body) {
                        if (!err) {
                            user.organizations = body.rows;
                        }
                        res.json({
                            ok: true,
                            user: user
                        });
                    });
                }
            });
        });
    });
    //Hent bruger
    app.get('/api/session', function (req, res) {
        var couchdb = require('nano')({
            cookie: req.headers.cookie,
            url: url_5986
        });
        couchdb.session(function (err, session, headers) {
            if (!session.userCtx.name) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Brugernavn og password er påkrævet.',
                    host: hostname,
                    headers: req.headers.cookie
                }));
            }
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }
            db.get('org.couchdb.user:' + session.userCtx.name, function (err, user, header) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                user.roles = session.userCtx.roles;
                user.organizations = [];
                if (user.roles.indexOf('_admin') === -1 && user.roles.indexOf('sys') === -1) {
                    var roles = [],
                        i,
                        role;
                    for (i = 0; i < user.roles.length; i++) {
                        role = user.roles[i];
                        roles.push(role.replace('user_', '').replace('admin_', ''));
                    }
                    db_admin.view('organization', 'organizations', {
                        keys: roles
                    }, function (err, body) {
                        if (!err) {
                            user.organizations = body.rows;
                        }
                        res.end(JSON.stringify({
                            ok: true,
                            user: user
                        }));
                    });
                } else {
                    db_admin.view('organization', 'organizations', function (err, body) {
                        if (!err) {
                            user.organizations = body.rows;
                        }
                        res.end(JSON.stringify({
                            ok: true,
                            user: user
                        }));
                    });
                }
            });
        });
    });
    app.post('/api/session', function (req, res) {
        if (!req.body || !req.body.name || !req.body.password) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            }));
        }
        var couchdb = require('nano')({
            url: url_5986
        });
        couchdb.auth(req.body.name, req.body.password, function (err, body, headers) {
            if (err) {

                return res.status(err.status_code || 500).send(err);
            }
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }

            res.json(body);
        });
    });
    app.get('/api/session2', function (req, res) {
        var couchdb = require('nano')({
            cookie: req.headers.cookie,
            url: url_5986
        });
        couchdb.session(function (err, session, headers) {
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }
            res.json(session);
        });
    });
    app["delete"]('/api/session', function (req, res) {
        var couchdb = require('nano')({
            cookie: req.headers.cookie,
            url: url_5986
        });
        couchdb.db.destroy('_session', function (err, session, headers) {
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }
            res.end(JSON.stringify(session));
        });
    });
    //endregion
    //region Organisation
    //Opret ny organisation
    app.post('/api/organization', auth, function (req, res) {
        if (!req.body || !req.body.name) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'name er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette organisationer.'
            });
        }
        db_admin.insert({
            name: req.body.name,
            type: 'organization'
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });

    });
    app.get('/api/organization/:id/logo', auth, function (req, res) {
        delete req.headers.cookie;
        req.pipe(request({
            url: 'http://localhost:' + config.couchdb.port5984 + '/admin/' + req.params.id + '/logo',
            auth: {
                user: config.couchdb.user,
                pass: config.couchdb.password
            }
        })).pipe(res);
    });
    //Hent en organisation
    app.get('/api/organization/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.id) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
            });
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Opdater organisation
    app.put('/api/organization/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.id) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at rette organisationer.'
            });
        }
        db_admin.get(req.params.id, function (err, doc) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') !== -1) {
                var busboy = new Busboy({
                        headers: req.headers
                    }),
                    buffer = [],
                    finalbuffer,
                    contentType;
                busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
                    doc[fieldname] = val;
                });

                busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
                        return res.status(401).json({
                            ok: false,
                            message: 'Billedet skal være JPG eller PNG'
                        });
                    }
                    contentType = mimetype;
                    file.on('data', function (data) {
                        buffer.push(data);
                    });
                    file.on('end', function () {
                        finalbuffer = Buffer.concat(buffer);
                    });
                });
                busboy.on('finish', function () {
                    db_admin.multipart.insert(doc, [
                        {
                            name: 'logo',
                            data: finalbuffer,
                            contentType: contentType
                        }
                    ], doc._id, function (err, body) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        res.json(body);
                    });
                });
                req.pipe(busboy);
            } else {
                doc.name = req.body.name;
                db_admin.insert(doc, req.body._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            }
        });
    });
    //Slet organisation
    app["delete"]('/api/organization/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at slette organisationer.'
            }));
        }
        db_admin.view('organization', 'databases', {
            key: req.params.id
        }, function (err, schemas) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (schemas.rows.length > 0) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Der findes ' + schemas.rows.length + ' databaser på organisationen. Du kan ikke slette organisationen før alle databaser er slettet.'
                }));
            }
            db.view('users', 'role', {
                key: req.params.id
            }, function (err, users) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                if (users.rows.length > 0) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Der findes ' + users.rows.length + ' brugere på organisationen. Du kan ikke slette organisationen før alle brugere er slettet.'
                    }));
                }
                db_admin.get(req.params.id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    db_admin.destroy(body._id, body._rev, function (err, body) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        res.json(body);
                    });
                });
            });
        });
    });
    //endregion
    //region Bruger
    //Hent alle brugere i en organisation
    app.get('/api/users/:organization', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se brugere for denne organisation.'
            }));
        }
        db.view('users', 'role', {
            key: req.params.organization
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });

    checkAdmin = function (roles, roles2) {
        var i,
            j,
            role,
            role2;
        for (i = 0; i < roles.length; i++) {
            role = roles[i].replace('admin_', '');
            for (j = 0; j < roles2.length; j++) {
                role2 = roles2[j].replace('admin_', '').replace('user_', '');
                if (role === role2) {
                    return true;
                }
            }
        }
        return false;
    };
    //Hent bruger
    app.get('/api/user/:id', auth, function (req, res) {
        db.get('org.couchdb.user:' + req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && !checkAdmin(req.userCtx.roles, body.roles)) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se brugere for denne organisation.'
                }));
            }
            res.json(body);
        });
    });
    //Opret bruger
    app.post('/api/user', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.role) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Bruger er påkrævet.'
            }));
        }
        db.get('org.couchdb.user:' + req.body.name, function (err, body2) {
            var organization,
                roles,
                code,
                date,
                //
                salt,
                hash;
            organization = req.body.role.replace('user_', '').replace('admin_', '');
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette brugere.'
                }));
            }
            if (!err && (body2.roles.indexOf("admin_" + organization) !== -1 || body2.roles.indexOf("user_" + organization) !== -1)) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Brugeren er allerede tilknyttet organisationen.'
                }));
            }
            if (!err) {
                //Brugeren findes men skal tilknyttes ny organisation
                body2.roles.push(req.body.role);
                db.insert(body2, body2._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    body.timestamp = body2.timestamp;
                    body.verified = body2.verified;
                    res.end(JSON.stringify(body));
                });
            } else {
                //Opret ny bruger
                roles = [req.body.role];
                code = uuid.v1();
                date = new Date();
                //couchdb <= 1.1.1
                salt = crypto.randomBytes(16).toString('hex');
                hash = crypto.createHash('sha1');
                hash.update(uuid.v1() + salt);

                db.insert({
                    name: req.body.name,
                    type: 'user',
                    roles: roles,
                    verification_code: code,
                    /*password: uuid.v1(),*/
                    salt: salt,
                    password_sha: hash.digest('hex'),
                    timestamp: date
                }, 'org.couchdb.user:' + req.body.name, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    body.timestamp = date;
                    emailTemplates(templatesDir, function (err, template) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        template('verify', {
                            user: body,
                            url: config.verify.url + code
                                //url: 'http://localhost:3000/#/verify/' + code
                        }, function (err, html, text) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            transport.sendMail({
                                from: config.verify.from,
                                to: req.body.name,
                                subject: 'Invitation',
                                html: html,
                                // generateTextFromHTML: true,
                                text: text
                            }, function (err, responseStatus) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                res.json(body);
                            });
                        });
                    });
                });
            }
        });
    });
    //Slet bruger
    app["delete"]('/api/user/:id', auth, function (req, res) {
        if (!req.params || !req.params.id || !req.query || !req.query.organization) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'id og organization er påkrævet.'
            }));
        }
        db.get(req.params.id, function (err, user) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var admin_role = user.roles.indexOf("admin_" + req.query.organization),
                user_role = user.roles.indexOf("user_" + req.query.organization);
            if (req.userCtx.roles.indexOf("sys") === -1 && (req.userCtx.roles.indexOf("admin_" + req.query.organization) === -1 || (admin_role === -1 && user_role === -1))) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette brugeren.'
                }));
            }
            if (user.roles.length > 1) {
                if (admin_role !== -1) {
                    user.roles.splice(admin_role, 1);
                }
                if (user_role !== -1) {
                    user.roles.splice(user_role, 1);
                }
                db.insert(user, user._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            } else {
                db.destroy(user._id, user._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            }
        });
    });
    //Opdater bruger
    app.put('/api/user', auth, function (req, res) {
        if (!req.body || !req.body._id || !req.body.role) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'id og role er påkrævet.'
            }));
        }
        db.get(req.body._id, function (err, user) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var organization = req.body.role.replace('user_', '').replace('admin_', ''),
                admin_role = user.roles.indexOf("admin_" + organization),
                user_role = user.roles.indexOf("user_" + organization);
            if (req.userCtx.roles.indexOf("sys") === -1 && (req.userCtx.roles.indexOf("admin_" + organization) === -1 || (admin_role === -1 && user_role === -1))) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere brugeren.'
                }));
            }
            if (admin_role !== -1) {
                user.roles.splice(admin_role, 1);
            }
            if (user_role !== -1) {
                user.roles.splice(user_role, 1);
            }
            user.roles.push(req.body.role);
            db.insert(user, user._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
    app.put('/api/sysuser', auth, function (req, res) {
        if (!req.body || !req.body._id || typeof (req.body.sys) === 'undefined') {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'id og sys er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf('sys') === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at tildele system administrator rettigheder.'
            });
        }
        db.get(req.body._id, function (err, user) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var sys_role = user.roles.indexOf("sys");
            if (req.body.sys) {
                if (sys_role === -1) {
                    user.roles.push("sys");
                }
            } else {
                if (sys_role !== -1) {
                    user.roles.splice(sys_role, 1);
                }
            }
            db.insert(user, user._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
    //endregion
    //region Verificer
    //Verificer bruger og skift password
    app.post('/api/verify/:code', function (req, res) {
        if (!req.params.code) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'A verification code is required.'
            }));
        }
        if (!req.body || !req.body.password) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Nyt password er påkrævet.'
            }));
        }
        var user;
        // use verification code
        db.view('users', 'verification_code', {
            key: req.params.code
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (body.rows && body.rows.length === 0) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'Invalid verification code.'
                }));
            }

            // TODO:  Add an expiration date for the verification code and check it.

            user = body.rows[0].value;
            if (user.verified) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'Brugeren er allerede verificeret',
                    user: user.name
                }));
            }
            if (!user.verification_code || user.verification_code !== req.params.code) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'The verification code you attempted to use does not match our records.'
                }));
            }
            //delete user.verification_code;

            var salt = crypto.randomBytes(16).toString('hex'),
                hash = crypto.createHash('sha1');
            hash.update(req.body.password + salt);
            user.verified = new Date();
            //user.password = req.body.password;
            user.salt = salt;
            user.password_sha = hash.digest('hex');
            db.insert(user, user._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                db.auth(user.name, req.body.password, function (err, body, headers) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    if (headers && headers['set-cookie']) {
                        res.set('set-cookie', headers['set-cookie']);
                    }
                    db.get('org.couchdb.user:' + body.name, function (err, user) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        user.organizations = [];
                        if (user.roles.indexOf('sys') === -1) {
                            var roles = [],
                                i,
                                role;
                            for (i = 0; i < user.roles.length; i++) {
                                role = user.roles[i];
                                roles.push(role.replace('user_', '').replace('admin_', ''));
                            }
                            db_admin.view('organization', 'organizations', {
                                keys: roles
                            }, function (err, body) {
                                if (!err) {
                                    user.organizations = body.rows;
                                }
                                res.end(JSON.stringify({
                                    ok: true,
                                    user: user
                                }));
                            });
                        } else {
                            db_admin.view('organization', 'organizations', function (err, body) {
                                if (!err) {
                                    user.organizations = body.rows;
                                }
                                res.end(JSON.stringify({
                                    ok: true,
                                    user: user
                                }));
                            });
                        }
                    });
                });
            });
        });
    });
    //Verificer bruger
    app.get('/api/verify/:code', function (req, res) {
        if (!req.params.code) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'A verification code is required.'
            }));
        }

        var user;
        // use verification code
        db.view('users', 'verification_code', {
            key: req.params.code
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (body.rows && body.rows.length === 0) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'Invalid verification code.'
                }));
            }

            // TODO:  Add an expiration date for the verification code and check it.

            user = body.rows[0].value;
            if (user.verified) {
                return res.status(400).json({
                    ok: false,
                    message: 'Brugeren er allerede verificeret',
                    user: user.name
                });
            }
            if (!user.verification_code || user.verification_code !== req.params.code) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'The verification code you attempted to use does not match our records.'
                }));
            }
            res.send(JSON.stringify({
                ok: true,
                message: 'Skift password',
                user: user.name
            }));
            /*
            //delete user.verification_code;
            user.verified = new Date();
            db.insert(user, user._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                return res.status(200).send(JSON.stringify({
                    ok: true,
                    message: "Account verified."
                }));
            });
            */
        });
    });
    //endregion
    //region Database
    //Opdater database
    app.put('/api/database/:id', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.organization) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Navn og organisation er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at rette databasen.'
            }));
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            body.name = req.body.name;
            body.organization = req.body.organization;
            db_admin.insert(body, body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var db_id = 'db-' + req.params.id,
                    d = nano.db.use(db_id);
                d.get("_design/views", function (err, body2) {
                    if (err) {
                        d.insert({
                            language: 'javascript',
                            views: {
                                data: {
                                    map: "function(doc){emit(doc._id, null);}"
                                }
                            }
                        }, "_design/views", function (err, body3) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            res.json(body);
                        });
                    } else {
                        res.json(body);
                    }
                });
            });
        });
    });

    //Hent databaseinformation
    app.get('/api/database/:id/info', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, body2) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + body2.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                }));
            }
            nano.db.get('db-' + req.params.id, function (err, body3) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var d = nano.db.use('db-' + req.params.id);
                d.get("_security", function (err, body4) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    var security = {
                        c: "1",
                        r: "1",
                        u: "1",
                        d: "1"
                    };
                    if (body4.members.roles.indexOf('user_' + body2.organization) !== -1) {
                        security.r = 2;
                    } else if (body4.members.roles.indexOf('admin_' + body2.organization) !== -1) {
                        security.r = 3;
                    }
                    d.get("_design/security", function (err, body5) {
                        if (!err) {
                            if (body5.security) {
                                security = body5.security;
                            }
                        }
                        res.json({
                            schema: body2,
                            database: body3,
                            security: security
                        });
                    });
                });
            });
        });
    });
    //endregion
    //region Compact
    //Hent databaseinformation
    /*
    app.get('/api/compact/:id', function (req, res) {
        var couchdb = require('nano')({
            cookie: req.headers.cookie,
            url: url_5986
        });
        couchdb.session(function (err, session, headers) {
            if (!session.userCtx.name) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Brugernavn og password er påkrævet.'
                }));
            }
            if (headers && headers['set-cookie']) {
                res.set('set-cookie', headers['set-cookie']);
            }

            db_admin.get(req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + body.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                    }));
                }
                nanoAdmin.db.get('_all_dbs', function (err, allDBs) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    for(var i=0;i<allDBs.length){
                        if()
                    }
                    var d = nano.db.use('db-' + req.params.id);
                    d.get("_security", function (err, body4) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        var security = {
                            c: "1",
                            r: "1",
                            u: "1",
                            d: "1"
                        };
                        if (body4.members.roles.indexOf('user_' + body2.organization) !== -1) {
                            security.r = 2;
                        } else if (body4.members.roles.indexOf('admin_' + body2.organization) !== -1) {
                            security.r = 3;
                        }
                        d.get("_design/security", function (err, body5) {
                            if (!err) {
                                if (body5.security) {
                                    security = body5.security;
                                }
                            }
                            res.end(JSON.stringify({
                                schema: body2,
                                database: body3,
                                security: security
                            }));
                        });
                    });
                });
            });
        });
    });
    */
    //endregion
    //region Skema
    //Hent alle databaser for en organisation
    app.get('/api/organization/:id/databases', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.id) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
            }));
        }
        db_admin.view('organization', 'databases', {
            keys: [req.params.id]
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });

    //Hent database
    app.get('/api/database/:id', function (req, res) {
        var security = {
            c: "1",
            r: "1",
            u: "1",
            d: "1"
        };
        if (!req.params.id) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'id er påkrævet'
            }));
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            nano.db.get('db-' + req.params.id, function (err, body2) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var d = nano.db.use('db-' + req.params.id);
                d.get("_security", function (err, body3) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    if (body3.members.roles.indexOf('user_' + body.organization) !== -1) {
                        security.r = 2;
                    } else if (body3.members.roles.indexOf('admin_' + body.organization) !== -1) {
                        security.r = 3;
                    }
                    d.get("_design/security", function (err, body4) {
                        if (!err) {
                            if (body4.security) {
                                security = body4.security;
                            }
                        }
                        res.end(JSON.stringify({
                            database: body,
                            info: body2,
                            security: security
                        }));
                    });
                });
            });
        });
    });

    //Opret database
    app.post('/api/database', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.organization) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Navn og organisation er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette databaser.'
            }));
        }
        db_admin.insert({
            name: req.body.name,
            organization: req.body.organization,
            type: 'database'
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var db_id = 'db-' + body.id;
            nano.db.create(db_id, function (err, body2) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var d = nano.db.use(db_id);
                d.insert({
                    admins: {
                        names: [],
                        roles: ["_admin", "sys", "admin_" + req.body.organization]
                    },
                    members: {
                        names: [],
                        roles: []
                    }
                }, "_security", function (err, body3) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    d.insert({
                        language: 'javascript',
                        views: {
                            data: {
                                map: "function(doc){emit(doc._id, null);}"
                            }
                        }
                    }, "_design/views", function (err, body4) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        res.json(body4);
                    });
                });
            });
        });
    });

    schemaPostPut = function (req, res) {
        if (!req.body || !req.body.schema) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'schema er påkrævet.'
            }));
        }

        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette databaser.'
                }));
            }
            fs.readFile('tv4.js', 'utf8', function (err, data) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                fs.readFile('validate_doc_update.js', 'utf8', function (err, validate_doc_update) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    var db_id = 'db-' + req.params.database,
                        d = nano.db.use(db_id);
                    d.get("_design/schema", function (err, doc) {
                        if (err) {
                            doc = {};
                        }
                        doc.validate_doc_update = validate_doc_update;
                        doc.lib = {
                            tv4: data,
                            schema: "exports.schema=" + JSON.stringify(req.body.schema)
                        };
                        doc.filters = {
                            schema: "function (doc, req) {" +
                                "        if (doc._id === '_design/schema' || doc._id === '_design/straks') {" +
                                "            return true;" +
                                "        }" +
                                "        return false;" +
                                "    }",
                            data: "function (doc, req) {" +
                                "        if (doc._id.substring(0,7) !== '_design') {" +
                                "            return true;" +
                                "        }" +
                                "        return false;" +
                                "    }"
                        };
                        /*doc.filters = {
                            schema: "function (doc, req) {" +
                                "      if (doc._id === '_design/schema') {" +
                                "        return true;" +
                                "      }" +
                                "      return false;" +
                                "    }"
                        };*/
                        doc.schema = req.body.schema;
                        d.insert(doc, "_design/schema", function (err, body) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            res.json(body);
                        });
                    });
                });
            });
        });
    };

    //Opret skema
    app.post('/api/database/:database/schema', auth, function (req, res) {
        schemaPostPut(req, res);
    });
    //Opdater skema
    app.put('/api/database/:database/schema', auth, function (req, res) {
        schemaPostPut(req, res);
    });
    //Slet database
    app["delete"]('/api/database/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette databasen.'
                }));
            }
            db_admin.view('database', 'emailtemplate', {
                reduce: false,
                startkey: [req.params.id, ""],
                endkey: [req.params.id, {}]
            }, function (err, emailtemplates) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                if (emailtemplates.rows.length > 0) {
                    return res.status(401).json({
                        ok: false,
                        message: 'Der findes ' + emailtemplates.rows.length + ' emailtemplates på databasen. Du kan ikke slette databasen før alle emailtemplates er slettet.'
                    });
                }
                request.del({
                    uri: "http://email:4001/follow/" + req.params.id
                }, function (err, response, body) {
                    /*if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }*/
                    db_admin.destroy(database._id, database._rev, function (err, body) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        nano.db.destroy('db-' + database._id, function (err, body) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            res.json(body);
                        });
                    });
                });
            });
        });
    });
    //endregion
    //Opdater sikkerhed
    app.put('/api/security', auth, function (req, res) {
        if (!req.body || !req.body.database || !req.body.security) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Database og security er påkrævet.'
            }));
        }
        db_admin.get(req.body.database, function (err, body2) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + body2.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere database sikkerheden.'
                }));
            }
            var d = nano.db.use('db-' + req.body.database);
            d.get('_security', function (err, security) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                switch (req.body.security.r) {
                case "1":
                    security.members.roles = [];
                    break;
                case "2":
                    security.members.roles = ['user_' + body2.organization, 'admin_' + body2.organization, 'sys'];
                    break;
                case "3":
                    security.members.roles = ['admin_' + body2.organization, 'sys'];
                    break;
                }
                d.insert(security, '_security', function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    var id = '_design/security',
                        validate_admin = "if ((userCtx.roles.indexOf('_admin') !== -1) || (userCtx.roles.indexOf('admin_" + body2.organization + "') !== -1)) { return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }",
                        validate_user = "if ((userCtx.roles.indexOf('_admin') !== -1) || (userCtx.roles.indexOf('admin_" + body2.organization + "') !== -1) || (userCtx.roles.indexOf('user_" + body2.organization + "') !== -1)) { return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }",
                        validate = "function (newDoc, oldDoc, userCtx, secObj) { if (newDoc._deleted === true) {";
                    if ((req.body.security.r === '1' && req.body.security.d !== '1') || (req.body.security.r === '2' && req.body.security.d === '3')) {
                        switch (req.body.security.d) {
                        case "1":
                            break;
                        case "2":
                            validate = validate + validate_user;
                            break;
                        case "3":
                            validate = validate + validate_admin;
                            break;
                        }
                    }
                    validate = validate + " } else if (oldDoc === null) { ";
                    if ((req.body.security.r === '1' && req.body.security.c !== '1') || (req.body.security.r === '2' && req.body.security.c === '3')) {
                        switch (req.body.security.c) {
                        case "1":
                            break;
                        case "2":
                            validate = validate + validate_user;
                            break;
                        case "3":
                            validate = validate + validate_admin;
                            break;
                        }
                    }
                    validate = validate + " } else { ";
                    if ((req.body.security.r === '1' && req.body.security.u !== '1') || (req.body.security.r === '2' && req.body.security.u === '3')) {
                        switch (req.body.security.u) {
                        case "1":
                            break;
                        case "2":
                            validate = validate + validate_user;
                            break;
                        case "3":
                            validate = validate + validate_admin;
                            break;
                        }
                    }
                    validate = validate + " } }";

                    d.get(id, function (err, body) {
                        if (err) {
                            body = {
                                language: 'javascript'
                            };
                        }
                        body.security = req.body.security;
                        if (body.validate_doc_update) {
                            delete body.validate_doc_update;
                        }
                        if (body.security.c !== body.security.r || body.security.c !== body.security.u || body.security.c !== body.security.d) {
                            body.validate_doc_update = validate;
                        }
                        d.insert(body, id, function (err, body) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            res.end(JSON.stringify(body));
                        });
                    });
                });
            });
        });
    });
    //Upload data

    app.post('/api/upload/:database', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere skemaet.'
                }));
            }
            if (!(req.headers['content-type'] &&
                    req.headers['content-type'].indexOf('multipart/form-data') === 0 && req.method === 'POST')) {
                return res.status(400).send(JSON.stringify({
                    ok: false,
                    message: 'Fil er påkrævet.'
                }));
            } else {
                var busboy = new Busboy({
                    headers: req.headers
                });

                busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                    //console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
                    var buffer = "";
                    file.on('data', function (data) {
                        //console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                        buffer += data;
                    });
                    file.on('end', function () {
                        //console.log('File [' + fieldname + '] Finished');
                        var d,
                            key,
                            json,
                            schema,
                            i,
                            doc;
                        try {
                            json = JSON.parse(buffer);
                        } catch (ex) {
                            return res.status(500).send(ex.message);
                        }
                        schema = {
                            "$schema": "http://json-schema.org/draft-04/schema#",
                            "title": "Projekt",
                            "description": "",
                            "type": ["object"],
                            "properties": {
                                "_id": {
                                    "type": "string"
                                },
                                "_rev": {
                                    "type": "string"
                                },
                                "_revisions": {
                                    "type": "object",
                                    "properties": {
                                        "start": {
                                            "type": "integer"
                                        },
                                        "ids": {
                                            "type": "array"
                                        }
                                    }
                                },
                                "type": {
                                    "enum": ["Feature"]
                                },
                                "geometry": {
                                    "title": "geometry",
                                    "description": "One geometry as defined by GeoJSON",
                                    "type": "object",
                                    "required": ["type", "coordinates"],
                                    "oneOf": [
                                        {
                                            "title": "Point",
                                            "properties": {
                                                "type": {
                                                    "enum": ["Point"]
                                                },
                                                "coordinates": {
                                                    "$ref": "#/definitions/position"
                                                }
                                            }
                                        },
                                        {
                                            "title": "MultiPoint",
                                            "properties": {
                                                "type": {
                                                    "enum": ["MultiPoint"]
                                                },
                                                "coordinates": {
                                                    "$ref": "#/definitions/positionArray"
                                                }
                                            }
                                        },
                                        {
                                            "title": "LineString",
                                            "properties": {
                                                "type": {
                                                    "enum": ["LineString"]
                                                },
                                                "coordinates": {
                                                    "$ref": "#/definitions/lineString"
                                                }
                                            }
                                        },
                                        {
                                            "title": "MultiLineString",
                                            "properties": {
                                                "type": {
                                                    "enum": ["MultiLineString"]
                                                },
                                                "coordinates": {
                                                    "type": "array",
                                                    "items": {
                                                        "$ref": "#/definitions/lineString"
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            "title": "Polygon",
                                            "properties": {
                                                "type": {
                                                    "enum": ["Polygon"]
                                                },
                                                "coordinates": {
                                                    "$ref": "#/definitions/polygon"
                                                }
                                            }
                                        },
                                        {
                                            "title": "MultiPolygon",
                                            "properties": {
                                                "type": {
                                                    "enum": ["MultiPolygon"]
                                                },
                                                "coordinates": {
                                                    "type": "array",
                                                    "items": {
                                                        "$ref": "#/definitions/polygon"
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                },
                                "properties": {
                                    "type": "object",
                                    "properties": {

                                    }
                                }
                            },
                            "required": ["properties", "type", "geometry"],
                            "definitions": {
                                "position": {
                                    "description": "A single position",
                                    "type": "array",
                                    "minItems": 2,
                                    "items": [
                                        {
                                            "type": "number"
                                        },
                                        {
                                            "type": "number"
                                        }
                                    ],
                                    "additionalItems": false
                                },
                                "positionArray": {
                                    "description": "An array of positions",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/position"
                                    }
                                },
                                "lineString": {
                                    "description": "An array of two or more positions",
                                    "allOf": [
                                        {
                                            "$ref": "#/definitions/positionArray"
                                        },
                                        {
                                            "minItems": 2
                                        }
                                    ]
                                },
                                "linearRing": {
                                    "description": "An array of four positions where the first equals the last",
                                    "allOf": [
                                        {
                                            "$ref": "#/definitions/positionArray"
                                        },
                                        {
                                            "minItems": 4
                                        }
                                    ]
                                },
                                "polygon": {
                                    "description": "An array of linear rings",
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/definitions/linearRing"
                                    }
                                }
                            }
                        };
                        if (json.features && json.features.length > 0) {
                            for (i = 0; i < json.features.length; i++) {
                                doc = json.features[i];
                                //doc._id = uuid.v1();
                                for (key in doc.properties) {
                                    if (doc.properties.hasOwnProperty(key)) {
                                        if (doc.properties[key] !== null) {
                                            schema.properties.properties.properties[key] = {
                                                "type": typeof doc.properties[key]
                                            };
                                        } else {
                                            delete doc.properties[key];
                                        }
                                    }
                                }
                            }
                            d = nano.db.use('db-' + req.params.database);
                            d.bulk({
                                docs: json.features
                            }, function (err, body) {
                                /*console.log(inspect(body, {
                                    colors: true,
                                    depth: null
                                }));*/
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                req.body.schema = schema;

                                d.get("_design/schema", function (err, doc) {
                                    if (err) {
                                        schemaPostPut(req, res);
                                    } else {
                                        res.json(body);
                                    }
                                });
                            });
                        }
                    });
                });
                req.pipe(busboy);
            }
        });
    });
    app.post('/api/geojson/:configuration/:layer', auth, function (req, res) {
        var d = require('nano')({
            "requestDefaults": {
                "headers": {
                    authorization: req.headers.authorization
                }
            },
            url: 'http://localhost:' + config.couchdb.port5984 + '/' + config.app
        });
        d.head(req.params.configuration, function (err, _, headers) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var buffer = new Buffer(JSON.stringify(req.body));
            d.attachment.insert(req.params.configuration, req.params.layer + '.geojson', buffer, 'application/json', {
                rev: headers.etag.replace(/"/g, '')
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    app.get('/api/export/:database', auth, function (req, res) {
        var d = nano.db.use(req.params.database);
        d.list({
            include_docs: true
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            var geojson = {
                type: "FeatureCollection",
                "crs": {
                    "type": "name",
                    "properties": {
                        "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                    }
                },
                features: []
            };
            for (var i = 0; i < body.rows.length; i++) {
                var row = body.rows[i];
                if (row.id.substring(0, 7) !== '_design') {
                    var doc = {
                        type: "Feature",
                        properties: {}
                    };
                    if (row.doc.hasOwnProperty("properties")) {
                        doc.properties = row.doc.properties;
                    }
                    doc.properties.id = row.doc["_id"];
                    doc.properties.rev = row.doc["_rev"];
                    if (row.doc.hasOwnProperty("geometry")) {
                        doc.geometry = row.doc.geometry;
                    }
                    if (row.doc.hasOwnProperty("_attachments")) {
                        for (var key in row.doc["_attachments"]) {
                            doc.properties[key] = "http://geo.os2geo.dk/couchdb/" + req.params.database + "/" + row.id + "/" + key;
                        }

                    }
                    geojson.features.push(doc);
                }
            }
            res.json(geojson);
        });
    });
    //Henter alle apps
    app.get('/api/apps', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            });
        }
        var d = nano.db.use('apps');
        d.list({
            include_docs: true
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Henter alle apps i en organization
    app.get('/api/apps/:organization', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            }));
        }
        db_admin.view('templates', 'organization', {
            key: req.params.organization
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Opretter ny app i en organisation
    app.post('/api/apps', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.organization || !req.body.template) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'Navn, template og organisation er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            }));
        }
        var doc = {
            name: req.body.name,
            template: req.body.template,
            organization: req.body.organization,
            type: 'app'
        };
        db_admin.insert(doc, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Henter alle apps i en organization
    app.get('/api/app/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            });
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });

    //Opdater app
    app.put('/api/app', auth, function (req, res) {
        if (!req.body || !req.body._id || !req.body.name || !req.body.databases) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'name og databases er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            }));
        }
        db_admin.get(req.body._id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            body.name = req.body.name;
            body.databases = req.body.databases;
            db_admin.insert(body, req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    //Slet app
    app["delete"]('/api/app/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, app) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + app.organization) === -1) {
                return res.status(401).json({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette apps for denne organisation.'
                });
            }
            db_admin.destroy(app._id, app._rev, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    //region Template
    //Opret ny template
    app.post('/api/templates', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette apps.'
            });
        }
        if (!(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') === 0)) {
            return res.status(400).json({
                ok: false,
                message: 'Fil er påkrævet.'
            });
        }
        var doc = {
                type: 'template',
                organizations: []
            },
            busboy = new Busboy({
                headers: req.headers
            }),
            name,
            myfile,
            buffer = [],
            finalbuffer;
        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
            if (fieldname === 'databases') {
                val = JSON.parse(val);
            }
            doc[fieldname] = val;
        });
        busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
            file.on('data', function (data) {
                buffer.push(data);
            });
            file.on('end', function () {
                finalbuffer = Buffer.concat(buffer);
            });
        });
        busboy.on('finish', function () {
            db_admin.insert(doc, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                db_admin.attachment.insert(body.id, 'logo.png', finalbuffer, 'image/png', {
                    rev: body.rev
                }, function (err, body2) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    var db_id = 'app-' + body.id;
                    nano.db.create(db_id, function (err, body3) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        var d = nano.db.use(db_id);
                        d.insert({
                            admins: {
                                names: ["admin"],
                                roles: ["sys"]
                            },
                            members: {
                                names: [],
                                roles: []
                            }
                        }, "_security", function (err, body4) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            var doc = {
                                organizations: [],
                                validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                            };
                            d.insert(doc, '_design/security', function (err, body5) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                res.json(body5);
                            });
                        });
                    });
                });
            });
        });
        req.pipe(busboy);
    });
    //hent alle templates/
    app.get('/api/templates', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }

        db_admin.view('templates', 'all', function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //henter en template
    app.get('/api/template/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            });
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //henter en template
    app.get('/api/template/:id/logo', auth, function (req, res) {
        delete req.headers.cookie;
        req.pipe(request({
            url: 'http://localhost:' + config.couchdb.port5984 + '/admin/' + req.params.id + '/logo.png',
            auth: {
                user: config.couchdb.user,
                pass: config.couchdb.password

            }
        })).pipe(res);
    });
    //henter sikkerhed for en template
    app.get('/api/template/:id/security', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }
        var organizations = [],
            d = nano.db.use('app-' + req.params.id);
        d.get("_design/security", function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (body.organizations) {
                organizations = body.organizations;
            }
            res.json(organizations);
        });
    });
    //Opdater sikkerhed på en template


    app.put('/api/template/:id/security', auth, function (req, res) {
        if (!req.body || !req.body.organizations) {
            return res.status(400).json({
                ok: false,
                message: 'organizations er påkrævet.'
            });
        }
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            });
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            body.organizations = req.body.organizations;
            db_admin.insert(body, req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var id = '_design/security',
                    i,
                    d = nano.db.use('app-' + req.params.id),
                    validate = "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1){return;} else if (oldDoc === null) { if(",
                    validate_create = "";
                for (i = 0; i < req.body.organizations.length; i++) {
                    validate_create += "|| userCtx.roles.indexOf('admin_" + req.body.organizations[i] + "') !== -1 ";
                }
                validate += validate_create.substring(2) + "){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}} else { if(userCtx.roles.indexOf('admin_'+oldDoc.organization) !== -1 || userCtx.roles.indexOf('admin_'+oldDoc._id) !== -1){ return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }} }";

                d.get(id, function (err, body) {
                    if (err) {
                        body = {
                            language: 'javascript'
                        };
                    }
                    body.organizations = req.body.organizations;
                    body.validate_doc_update = validate;
                    d.insert(body, id, function (err, body) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        var tasks = [],
                            i;
                        for (i = 0; i < req.body.organizations.length; i++) {
                            tasks.push(createTemplate(req, req.body.organizations[i]));
                        }
                        async.parallel(tasks, function () {
                            res.json(body);
                        });
                    });
                });
            });
        });
    });

    //Create geojson tiles
    app.put('/api/rfsconfig/:db/:id', auth, function (req, res) {
        var db = require('nano')({
                cookie: req.headers.cookie,
                url: 'http://localhost:' + config.couchdb.port5984 + '/' + req.params.db
            }),
            i,
            j,
            overlay,
            options,
            tileIndex,
            tile,
            tiledata,
            geojson,
            feature,
            tilePoint,
            isTiled = false;
        for (i = 0; i < req.body.map.overlays.length; i += 1) {
            overlay = req.body.map.overlays[i];
            if (overlay.type === 'geojson') {
                req.body._attachments = req.body._attachments || {};
                options = {
                    maxZoom: 18,
                    baseZoom: 18
                };
                if (overlay.maxZoom) {
                    options.maxZoom = overlay.maxZoom;
                    options.baseZoom = overlay.maxZoom;
                }
                if (overlay.geojson) {
                    for (tile in req.body._attachments) {
                        if (req.body._attachments.hasOwnProperty(tile) && tile.indexOf(overlay.id) !== -1) {
                            delete req.body._attachments[tile];
                        }
                    }
                    req.body._attachments[overlay.id + '.geojson'] = {
                        content_type: 'application/json',
                        data: new Buffer(JSON.stringify(overlay.geojson)).toString('base64')
                    };
                    /*if (overlay.tile) {
                        tileIndex = geojsonvt(overlay.geojson, options);
                        for (tile in tileIndex.tiles) {
                            if (tileIndex.tiles.hasOwnProperty(tile)) {
                                req.body._attachments[overlay.id + '/' + tile] = {
                                    content_type: 'application/json',
                                    data: new Buffer(JSON.stringify(tileIndex.tiles[tile])).toString('base64')
                                };
                            }
                        }
                    }*/
                    delete overlay.geojson;
                }
            }
        }
        db.insert(req.body, req.body._id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    /*tiledata = tileIndex.tiles[tile];
                            tilePoint = {
                                x: tiledata.x,
                                y: tiledata.y,
                                z: tiledata.z
                            };
                            geojson = {
                                "type": "FeatureCollection",
                                "crs": {
                                    "type": "name",
                                    "properties": {
                                        "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                                    }
                                },
                                "features": []
                            };
                            for (j = 0; j < tiledata.features.length; j += 1) {
                                feature = tiledata.features[j];
                                geojson.features.push({
                                    type: "Feature",
                                    geometry: addFeature(feature, tilePoint),
                                    properties: feature.tags
                                });
                            }
                            req.body._attachments[overlay.id + '/' + tiledata.z + '/' + tiledata.x + '/' + tiledata.y] = {
                                content_type: 'application/json',
                                data: new Buffer(JSON.stringify(geojson)).toString('base64')
                            };*/
    //opdatere en template
    app.put('/api/template', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body._id || !req.body._rev) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'name  er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }

        db_admin.insert(req.body, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Slet en template
    app["delete"]('/api/template/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til slette templates.'
            }));
        }
        db_admin.get(req.params.id, function (err, template) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            db_admin.destroy(template._id, template._rev, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                nano.db.destroy('app-' + req.params.id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
    //Opdater fulltext
    app.put('/api/fulltext/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere fulltext.'
                }));
            }
            var d = nano.db.use('db-' + req.params.id);
            d.get('_design/schema', function (err, schema) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var m,
                    keys = req.body.sort.split('/'),
                    item = schema.schema,
                    key,
                    buildMappings,
                    mappings = {};
                keys.splice(0, 1);
                for (m = 0; m < keys.length; m++) {
                    key = keys[m];
                    if (item.properties && item.properties.hasOwnProperty(key)) {
                        item = item.properties[key];
                    }
                }
                buildMappings = function (keys) {
                    var json = {},
                        key = keys[0];
                    if (keys.length === 1) {

                        json[key] = {
                            type: "string",
                            analyzer: "danish",
                            "index": "analyzed",
                            fields: {
                                raw: {
                                    type: "string",
                                    index: "not_analyzed"
                                }
                            }
                        };
                        /*json[key].fields[key] = {
                            type: "string",
                            index: "analyzed"
                        };*/
                        return json;
                    }
                    keys.splice(0, 1);
                    json[key] = {
                        properties: buildMappings(keys)
                    };

                    return json;
                };

                if (item.type === 'string') {

                    mappings["db-" + req.params.id] = {
                        "properties": buildMappings(keys)
                    };
                    mappings["db-" + req.params.id].properties._rev = {
                        type: "string",
                        index: "no"
                    };
                }
                /*console.log(inspect(mappings, {
                    depth: null,
                    colors: true
                }));*/
                request.del({
                    uri: "http://" + config.elasticsearch.host + "/es/db-" + req.params.id
                }, function (err, response, body) {
                    request.del({
                        uri: "http://" + config.elasticsearch.host + "/es/_river/db-" + req.params.id
                    }, function (err, response, body) {
                        request.post({
                            uri: "http://" + config.elasticsearch.host + "/es/db-" + req.params.id,
                            json: {
                                mappings: mappings
                            }
                        }, function (err, response, body) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            var river = {
                                "type": "couchdb",
                                "couchdb": {
                                    "host": config.elasticsearch.couchdb.host,
                                    "port": config.elasticsearch.couchdb.port,
                                    "db": "couchdb/db-" + req.params.id,
                                    "filter": "schema/data"
                                },
                                "index": {
                                    "index": "db-" + req.params.id,
                                    "type": "db-" + req.params.id,
                                    "bulk_size": 100,
                                    "bulk_timeout": "10ms"
                                }
                            };
                            request.put({
                                uri: "http://" + config.elasticsearch.host + "/es/_river/db-" + req.params.id + '/_meta',
                                json: river
                            }, function (err, response, body) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                schema.sort = req.body.sort;

                                d.insert(schema, '_design/schema', function (err, body) {
                                    if (err) {
                                        return res.status(err.status_code || 500).send(err);
                                    }
                                    res.json(body);
                                });
                            });
                        });
                    });
                });
            });


            //Lucene
            /*var fulltext = {
                "data": {
                    "index": ""
                }
            };
            fulltext.data.index = "function (doc) { if(doc._id.substring(0,7)!=='_design'){var ret = new Document(); function idx(obj,parent) { for (var key in obj) { switch (typeof obj[key]) { case 'object':  idx(obj[key],parent + '/'+key); break; case 'function': break; default: ";
            if (req.body.sort && req.body.sort !== "") {
                fulltext.data.index += "if (parent + '/' + key === '" + req.body.sort + "') { ret.add(obj[key], { \"field\": \"sort\", \"store\": \"yes\", \"index\": \"not_analyzed\" });  }";
            }
            fulltext.data.index += " ret.add(obj[key]);  break; }}} idx(doc,''); return ret;} return null;}";
            var id = '_design/fulltext';
            d.get(id, function (err, body) {
                if (err) {
                    body = {
                        language: 'javascript'
                    };
                }
                body.sort = req.body.sort;
                body.fulltext = fulltext;
                d.insert(body, id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            });*/
        });
    });
    //Hent fulltext
    app.get('/api/fulltext/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).json({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se fulltext.'
                });
            }
            var d = nano.db.use('db-' + req.params.id),
                id = '_design/fulltext';
            d.get(id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    //Slet fulltext
    app["delete"]('/api/fulltext/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, schema) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + schema.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette fulltext.'
                }));
            }
            var d = nano.db.use('db-' + req.params.id),
                id = '_design/fulltext';
            d.get(id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                d.destroy(body._id, body._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
    //Henter alle apps i en organization
    app.get('/api/template/_design/:id', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            });
        }
        var d = nano.db.use('apps');
        d.get('_design/' + req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });


    //Hent alle emailtemplates for en database
    app.get('/api/:database/emailtemplate', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).json({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se emailtemplates for denne organisation.'
                });
            }
            db_admin.view('database', 'emailtemplate', {
                reduce: false,
                startkey: [database._id, ""],
                endkey: [database._id, {}]
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    //Hent emailtemplate
    app.get('/api/emailtemplate/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            db_admin.get(body.database, function (err, database) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at se emailtemplates for denne organisation.'
                    }));
                }

                var sti = "/mnt/gluster/emailtemplates",
                    sti2 = sti + '/' + req.params.id;
                fs.readFile(sti2 + "/html.ejs", 'utf8', function (err, data) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    body.html = data;
                    fs.readFile(sti2 + "/text.ejs", 'utf8', function (err, data) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        body.text = data;
                        fs.readFile(sti2 + "/style.css", 'utf8', function (err, data) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            body.css = data;
                            emailTemplates(sti, function (err, template) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                var d = nano.db.use('db-' + body.database);
                                d.list({
                                    limit: 10
                                }, function (err, data) {
                                    if (err) {
                                        return res.status(err.status_code || 500).send(err);
                                    }

                                    var i, doc;
                                    for (i = 0; i < data.rows.length; i++) {
                                        doc = data.rows[i];
                                        if (doc.id.substring(0, 7) !== '_design') {
                                            break;
                                        }
                                    }
                                    if (doc) {
                                        d.get(doc.id, function (err, data) {
                                            template(req.params.id, {
                                                doc: data
                                            }, function (err, html, text) {
                                                res.json({
                                                    doc: body,
                                                    html: html,
                                                    text: text,
                                                    error: err
                                                });
                                            });
                                        });
                                    } else {
                                        template(req.params.id, {
                                            doc: null
                                        }, function (err, html, text) {
                                            res.json({
                                                doc: body,
                                                html: html,
                                                text: text,
                                                error: err
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    //Slet emailtemplate
    app["delete"]('/api/emailtemplate/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, emailtemplate) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            db_admin.get(emailtemplate.database, function (err, database) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at slette emailtempltes for denne organisation.'
                    }));
                }
                db_admin.destroy(emailtemplate._id, emailtemplate._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    var sti = "/mnt/gluster/emailtemplates/" + req.params.id;
                    fs.unlink(sti + "/html.ejs", function (err) {
                        fs.unlink(sti + "/text.ejs", function (err) {
                            fs.unlink(sti + "/style.css", function (err) {
                                fs.rmdir(sti, function (err) {
                                    request.del({
                                        uri: "http://email:4001/follow/" + emailtemplate.database
                                    }, function (err, response, body4) {
                                        if (err) {
                                            return res.status(err.status_code || 500).send(err);
                                        }
                                        res.end();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    //Opdater emailtemplate
    app.put('/api/emailtemplate', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.database || !req.body.action || !req.body.html || !req.body.text || !req.body.css || !req.body._rev || !req.body._id) {
            return res.status(400).json({
                ok: false,
                message: '_id, _rev, name, action, html, text, css og database er påkrævet.'
            });
        }
        db_admin.get(req.body.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere emailtemplates.'
                }));
            }
            db_admin.insert(req.body, req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                req.body._rev = body.rev;
                var sti = "/mnt/gluster/emailtemplates",
                    sti2 = sti + '/' + body.id;

                fs.writeFile(sti2 + "/html.ejs", req.body.html, function (err, result) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    fs.writeFile(sti2 + "/text.ejs", req.body.text, function (err, result) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        fs.writeFile(sti2 + "/style.css", req.body.css, function (err, result) {

                            emailTemplates(sti, function (err, template) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                var d = nano.db.use('db-' + req.body.database);
                                d.list({
                                    limit: 10
                                }, function (err, data) {
                                    if (err) {
                                        return res.status(err.status_code || 500).send(err);
                                    }

                                    var i, doc;
                                    for (i = 0; i < data.rows.length; i++) {
                                        doc = data.rows[i];
                                        if (doc.id.substring(0, 7) !== '_design') {
                                            break;
                                        }
                                    }
                                    if (doc) {
                                        d.get(doc.id, function (err, data) {
                                            template(req.body._id, {
                                                doc: data
                                            }, function (err, html, text) {
                                                res.json({
                                                    doc: req.body,
                                                    html: html,
                                                    text: text,
                                                    error: err
                                                });
                                            });
                                        });
                                    } else {
                                        template(req.body._id, {
                                            doc: null
                                        }, function (err, html, text) {
                                            res.json({
                                                doc: req.body,
                                                html: html,
                                                text: text,
                                                error: err
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    //Opret emailtemplate
    app.post('/api/:database/emailtemplate', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.action) {
            return res.status(400).json({
                ok: false,
                message: 'name og action er påkrævet.'
            });
        }
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette en emailtemplate.'
                }));
            }

            db_admin.insert({
                name: req.body.name,
                database: req.params.database,
                action: req.body.action,
                type: 'emailtemplate'
            }, function (err, body) {
                if (err) {
                    console.log("Opret emailtemplate");
                    console.log(err);
                    return res.status(err.status_code || 500).send(err);
                }
                var sti = "/mnt/gluster/emailtemplates/" + body.id;
                fs.mkdir(sti, function (err, result) {
                    fs.writeFile(sti + "/html.ejs", "", function (err, result) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        fs.writeFile(sti + "/text.ejs", "", function (err, result) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            fs.writeFile(sti + "/style.css", "", function (err, result) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                request.put({
                                    uri: "http://email:4001/follow/" + req.params.database
                                }, function (err, response, body4) {
                                    if (err) {
                                        return res.status(err.status_code || 500).send(err);
                                    }
                                    res.end();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    //Hent alle kort for en organisation
    app.get('/api/maps/:organization', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at se kort for denne organisation.'
            });
        }
        db_admin.view('organization', 'maps', {
            keys: [req.params.organization]
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Hent kort
    app.get('/api/map/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, map) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + map.organization) === -1 && req.userCtx.roles.indexOf("user_" + map.organization) === -1) {
                return res.status(401).json({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se kort for denne organisation.'
                });
            }
            res.json(map);
        });
    });
    //Slet et kort for en organisation
    app["delete"]('/api/map/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, map) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + map.organization) === -1 && req.userCtx.roles.indexOf("user_" + map.organization) === -1) {
                return res.status(401).json({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette kort for denne organisation.'
                });
            }
            db_admin.destroy(map._id, map._rev, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.json(body);
            });
        });
    });
    //Opret kort
    app.post('/api/map', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.organization || !req.body.mapType || !req.body.epsg) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'name, url, epsg, mapType og organization er påkrævet.'
            }));
        }
        if ((req.body.mapType === 'xyz' || req.body.mapType === 'wms') && !req.body.url) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'url er påkrævet.'
            }));
        }
        if (req.body.mapType === 'wms' && !req.body.wms) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'wms er påkrævet.'
            }));
        }
        if (req.body.mapType === 'geojson' && !req.body.database) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'database er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).json({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette kort.'
            });
        }
        var doc = req.body;
        doc.type = "map";
        db_admin.insert(doc, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    //Opdater map
    app.put('/api/map', auth, function (req, res) {
        if (!req.body || !req.body.name || !req.body.organization || !req.body.mapType || !req.body.epsg || !req.body._id || !req.body._rev) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'name, epsg, mapType, _id, _rev og organization er påkrævet.'
            }));
        }
        if ((req.body.mapType === 'xyz' || req.body.mapType === 'wms') && !req.body.url) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'url er påkrævet.'
            }));
        }
        if (req.body.mapType === 'wms' && !req.body.wms) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'wms er påkrævet.'
            }));
        }
        if (req.body.mapType === 'geojson' && !req.body.database) {
            return res.status(400).send(JSON.stringify({
                ok: false,
                message: 'database er påkrævet.'
            }));
        }
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette kort.'
            }));
        }
        db_admin.insert(req.body, req.body._id, function (err, body) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            res.json(body);
        });
    });
    app.get('/api/kfticket', function (req, res) {
        // Replace the VisStedet login information with your own login
        // Fetch a ticket from Kortforsyningen, using your organization's login

        http.get('http://kortforsyningen.kms.dk/service?request=GetTicket&login=' + config.kms.user + '&password=' + config.kms.password, function (response) {
            var str = '';
            response.on('data', function (chunk) {
                str += chunk;
            });
            response.on('end', function () {
                res.cookie('kfticket', str, {
                    maxAge: 86400000
                });
                res.send(str);
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
        });
    });
    /*var ogr_metadata = {
        "_id": "_design/ogr_metadata",
        "srs": "GEOGCS[\"GCS_WGS_1984\",DATUM[\"WGS_1984\",SPHEROID[\"WGS_84\",6378137,298.257223563]],PRIMEM[\"Greenwich\",0],UNIT[\"Degree\",0.017453292519943295]]",
        "geomtype": "POINT",
        "extent": {
            "validity_update_seq": 4,
            "bbox": [
               -180,
               -90,
               180,
               90
           ]
        },
        "geojson_documents": true,
        "fields": [
            {
                "name": "id",
                "type": "integer"
           },
            {
                "name": "text",
                "type": "string"
           },
            {
                "name": "number",
                "type": "integer"
           },
            {
                "name": "decimal",
                "type": "real"
           },
            {
                "name": "date",
                "type": "string"
           }
       ]
    };*/


    app.get('/api/qgis/:database/_design/:design', function (req, res) {
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        var d,
            ogr_metadata;
        if (req.params.design === 'ogr_metadata') {
            console.log(req.params.design);
            ogr_metadata = {
                "_id": "_design/ogr_metadata",
                "srs": "GEOGCS[\"GCS_WGS_1984\",DATUM[\"WGS_1984\",SPHEROID[\"WGS_84\",6378137,298.257223563]],PRIMEM[\"Greenwich\",0],UNIT[\"Degree\",0.017453292519943295]]",
                "geomtype": "LineString",
                "extent": {
                    "validity_update_seq": 4,
                    "bbox": [-180, -90, 180, 90]
                },
                "geojson_documents": true,
                "fields": []
            };
            db_admin.get(req.params.database, function (err, body) {
                /*ogr_metadata.fields.push({
                    name: 'couchdb',
                    type: "text"
                });*/
                var item,
                    field;
                for (item in body.properties) {
                    if (body.properties.hasOwnProperty(item)) {
                        field = body.properties[item];
                        if (field.type === 'text') {
                            ogr_metadata.fields.push({
                                name: item,
                                type: "text"
                            });
                        }
                    }
                }
                return res.json(ogr_metadata);
            });
        } else {
            d = nano.db.use('db-' + req.params.database);
            d.get('_design/' + req.params.design, function (err, body) {
                if (err) {
                    return res.status(404).json({
                        "error": "not_found",
                        "reason": "missing"
                    });
                }
                res.json(body);
            });
        }
    });


    app.get('/api/qgis/:database/_all_docs', function (req, res) {
        console.log(1);
        console.log(req.originalUrl);
        console.log(req.query);
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        var d = nano.db.use('db-' + req.params.database);
        d.get('_all_docs', req.query, function (err, body) {
            if (err) {
                return res.status(404).json({
                    "error": "not_found",
                    "reason": "missing"
                });
            }
            res.json(body);
        });
    });
    app.get('/api/qgis/:database', function (req, res) {
        console.log(2);
        console.log(req.originalUrl);
        console.log(req.query);
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        var user = basicAuth(req);
        if (typeof user === "undefined") {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            }));
        }
        db.auth(user.name, user.pass, function (err, body, headers) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.params.database === '_all_dbs') {
                var roles = [],
                    i,
                    role;
                for (i = 0; i < body.roles.length; i++) {
                    role = body.roles[i].replace('user_', '').replace('admin_', '');
                    if (role !== 'sys' && role !== '_admin') {
                        roles.push(role);
                    }
                }
                db_admin.view('organization', 'schemas', {
                    keys: roles
                }, function (err, body) {
                    var dbs = [];
                    if (!err) {
                        for (i = 0; i < body.rows.length; i++) {
                            dbs.push(body.rows[i].id);
                        }
                    }
                    return res.json(dbs);
                });

            } else {
                nano.db.get('db-' + req.params.database, function (err, body) {
                    res.json(body);
                });
            }
        });

    });
    app.get('/api/qgis/:database/:id', function (req, res) {
        console.log(2);
        console.log(req.originalUrl);
        console.log(req.query);
        console.log(req.params);
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        var user = basicAuth(req),
            couchdb;
        if (typeof user === "undefined") {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            }));
        }
        couchdb = require('nano')('http://' + user.name + ':' + user.pass + '@localhost:5984/' + req.params.database);
        couchdb.get(req.params.id, function (err, body) {
            res.json(body);
        });
    });
    /*var d = nano.db.use('db-'+database);
           d.list({
                include_docs: true
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.end(JSON.stringify(body));
            });*/

    app.get('/api/qgis', function (req, res) {
        console.log(1);
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        console.log(req.originalUrl);
        nano.db.get('', function (err, body, headers) {
            res.json(body);
        });
    });
    /*app.get('/api/qgis', function (req, res) {
        console.log(2);
        res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
        console.log(req.originalUrl);
        nano.db.list(function (err, body) {
            //console.log(body);
            res.json(body);
        });
    });*/


    //email
    app.all('/api/pouchdb*', function (req, res) {
        console.log(req.method);
        console.log(req.url);
        var url = "http://localhost:5984/" + req.url.substring(13);
        console.log(url);
        //console.log(inspect(req,{colors:true}));

        if (req.method === 'PUT') {
            req.pipe(request.put(url)).pipe(res);
        } else if (req.method === 'POST') {
            req.pipe(request.post(url)).pipe(res);
        } else if (req.method === 'GET') {
            req.pipe(request.get(url)).pipe(res);
        }

    });
    //Slet mbtile kort
    app["delete"]('/api/mbtiles/:id', auth, function (req, res) {
        db_admin.get(req.params.id, function (err, map) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + map.organization) === -1 && req.userCtx.roles.indexOf("user_" + map.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette kort for denne organisation.'
                }));
            }
            var filepath = '/mnt/gluster/tiles/' + req.params.id + '.mbtiles';
            fs.unlink(filepath, function (err) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                db_admin.destroy(map._id, map._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });

    //Opret ny mbtile kort
    app.post('/api/:organization/mbtiles', auth, function (req, res) {
        if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette kort.'
            }));
        }
        if (!(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') === 0)) {
            return res.status(400).json({
                ok: false,
                message: 'Fil er påkrævet.'
            });
        }

        var busboy = new Busboy({
                headers: req.headers
            }),
            name,
            id = uuid.v1(),
            //var saveTo = path.join(os.tmpDir(), id);
            saveTo = '/mnt/gluster/tiles/' + id + '.mbtiles',
            doc = {
                type: 'map',
                mapType: 'mbtiles'
            };
        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
            doc[fieldname] = val;
        });
        busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
            file.pipe(fs.createWriteStream(saveTo));
        });
        busboy.on('finish', function () {
            fs.stat(saveTo, function (err, stats) {
                doc.size = stats.size;
                doc.organization = req.params.organization;

                var mbtilesDB = new sqlite3.Database(saveTo, sqlite3.OPEN_READONLY, function (err) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    mbtilesDB.all("select count(*) as c from tiles", function (err, rows) {
                        if (rows.length === 1) {
                            doc.count = rows[0].c;
                        }
                        /*mbtilesDB.all("select * from metadata", function (err, rows) {
                        if (err) {
                            console.log("metadata: " + err);
                        } else {
                            for (var i = 0; i < rows.length; i++) {
                                var row = rows[i];
                                doc[row.name] = row.value;
                            }
                        }*/
                        mbtilesDB.each("select * from tiles limit 1", function (err, row) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            var buf = new Buffer(row.tile_data),
                                imgtype = imageType(buf);
                            doc.format = imgtype;
                            db_admin.insert(doc, id, function (err, body) {
                                if (err) {
                                    return res.status(err.status_code || 500).send(err);
                                }
                                res.json({
                                    id: body.id,
                                    rev: body.rev,
                                    format: doc.format,
                                    size: doc.size,
                                    count: doc.count
                                });
                                /*var db_id = 'db-' + body.id;
                                nano.db.create(db_id, function (err, body2) {
                                    if (err) {
                                        return res.status(err.status_code || 500).send(err);
                                    }
                                    res.json(body);
                                    var d = nano.db.use(db_id);
                                    mbtilesDB.each('SELECT * from tiles', function (err, row) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            var id = row.zoom_level + '_' + row.tile_column + '_' + row.tile_row;
                                            var doc = {
                                                '_id': id
                                            };
                                            var attachments = [{
                                                'name': 'tile.' + imgtype,
                                                'data': row.tile_data,
                                                'content_type': 'image/' + imgtype
                                            }];
                                            d.multipart.insert(doc, attachments, doc._id);
                                        }
                                    }, function (err, num_rows) {
                                        if (err) {
                                            console.log("done: " + err);
                                        }
                                        console.log("rows: "+num_rows);
                                        mbtilesDB.close(function (err) {
                                            if (err) {
                                                console.log("close: " + err);
                                            } else {
                                                fs.unlink(saveTo, function () {
                                                    console.log("slettet: " + saveTo);
                                                });
                                            }
                                        });
                                    });
                                });*/
                            });
                        });
                    });
                });
            });
        });
        req.pipe(busboy);
    });


    app.get('/api/:database/straks', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se straksafgørelser.'
                }));
            }
            var db_id = 'db-' + req.params.database,
                d = nano.db.use(db_id);
            d.get("_design/straks", function (err, doc) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                res.send(doc.lib.straks.substring(15));
            });
        });
    });
    app.get('/api/:database/straks/:id', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }
            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se straksafgørelser.'
                }));
            }
            var db_id = 'db-' + req.params.database,
                d = nano.db.use(db_id);
            d.get("_design/straks", function (err, doc) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var straks = JSON.parse(doc.lib.straks.substring(15)),
                    geojson = {};
                if (straks.hasOwnProperty(req.params.id)) {
                    geojson = straks[req.params.id];
                }
                res.json(geojson);
            });
        });
    });
    //Opret / opdater straksafgørelser
    app.put('/api/:database/straks', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }

            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette straksafgørelser.'
                }));
            }
            fs.readFile('validate_doc_update_straks.js', 'utf8', function (err, validate_doc_update) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                var db_id = 'db-' + req.params.database,
                    d = nano.db.use(db_id);
                d.get("_design/straks", function (err, doc) {
                    if (err) {
                        doc = {};
                    }
                    doc.validate_doc_update = validate_doc_update;
                    doc.lib = {
                        straks: "exports.straks=" + JSON.stringify(req.body.straks)
                    };

                    d.insert(doc, "_design/straks", function (err, body) {
                        if (err) {
                            return res.status(err.status_code || 500).send(err);
                        }
                        res.json(body);
                    });
                });
            });
        });
    });
    app["delete"]('/api/:database/straks', auth, function (req, res) {
        db_admin.get(req.params.database, function (err, database) {
            if (err) {
                return res.status(err.status_code || 500).send(err);
            }

            if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette straksafgørelser.'
                }));
            }
            var db_id = 'db-' + req.params.database,
                d = nano.db.use(db_id);
            d.get('_design/straks', function (err, body) {
                if (err) {
                    return res.status(err.status_code || 500).send(err);
                }
                d.destroy('_design/straks', body._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });

    app.listen(4000);
    console.log('Listening on port 4000');
}());