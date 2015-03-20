/*jslint nomen: true*/
/*global require, process, console*/

var inspect = require('util').inspect,
    express = require('express'),
    basicAuth = require('basic-auth'),
    agentkeepalive = require('agentkeepalive'),
    app = express(),
    emailTemplates = require('email-templates'),
    nodemailer = require('nodemailer'),
    argv = require('minimist')(process.argv.slice(2)),
    jf = require('jsonfile'),
    databases = {},
    nano,
    transport,
    config,
    db_admin,
    sti,
    url_5986,
    myagent = new agentkeepalive({
        maxSockets: 50,
        maxKeepAliveRequests: 0,
        maxKeepAliveTime: 30000
    }),
    valuepath = function (input, doc) {
        var path = input.split('/'),
            item = doc,
            m,
            key;
        for (m = 1; m < path.length; m += 1) {
            key = path[m];
            if (item.hasOwnProperty(key)) {
                item = item[key];
            } else {
                return null;
            }

        }
        return item;
    },
    testrules = function (rules, doc) {
        var key,
            rule;
        for (key in rules) {
            if (rules.hasOwnProperty(key)) {
                rule = rules[key];
                if (Object.prototype.toString.call(rule) === '[object Array]') {
                    if (rule.indexOf(valuepath(key, doc)) === -1) {
                        return false;
                    }
                } else if (rule !== valuepath(key, doc)) {
                    return false;
                }
            }
        }
        return true;
    },
    sendmail = function (email, subject) {
        return function (err, html, text) {
            if (err) {
                console.log(err);
            } else {
                console.log('sendmail: ' + email + ' ' + subject);
                transport.sendMail({
                    from: config.transport.auth.user,
                    to: email,
                    subject: subject,
                    html: html,
                    text: text
                }, function (err, responseStatus) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        };
    },
    followDatabase = function (id, template) {
        var db = nano.db.use('db-' + id),
            options = {};
        db.get('_local/follow_since', function (err, doc) {
            if (!err) {
                options.since = doc.since;
            }
            db.follow(options, function (error, change) {
                if (error) {
                    console.log(error);
                } else {
                    var feed = this,
                        emailoptions = {
                            reduce: false,
                            include_docs: true
                        },
                        rev;
                    databases[id] = feed;
                    feed.pause();
                    /*console.log(inspect(change, {
                        colors: true
                    }));*/
                    if (change.deleted) {
                        console.log('deleted: ' + change.id);
                        emailoptions.key = [id, "delete"];
                    } else {
                        rev = change.changes[0].rev.split('-');
                        if (rev[0] === '1') {
                            emailoptions.key = [id, "create"];
                            console.log('created: ' + change.id);
                        } else {
                            emailoptions.key = [id, "update"];
                            console.log('updated: ' + change.id);
                        }
                    }
                    db.get(change.id, function (err, doc) {
                        if (err) {
                            console.log("get");
                            console.log(err);
                        } else {
                            db_admin.view('database', 'emailtemplate', emailoptions, function (err, data) {
                                if (err) {
                                    console.log("view");
                                    console.log(err);
                                } else {
                                    data.rows.forEach(function (row) {
                                        var key, ok, item, email;
                                        if (row.doc.users) {
                                            for (key in row.doc.users) {
                                                if (row.doc.users.hasOwnProperty(key)) {
                                                    item = row.doc.users[key];
                                                    ok = testrules(item.rules, doc);
                                                    if (ok) {
                                                        template(row.id, {
                                                            doc: doc
                                                        }, sendmail(key, row.doc.name));
                                                    }
                                                }
                                            }
                                        }
                                        if (row.doc.userfields) {
                                            for (key in row.doc.userfields) {
                                                if (row.doc.userfields.hasOwnProperty(key)) {
                                                    email = valuepath(key, doc);
                                                    item = row.doc.userfields[key];
                                                    ok = testrules(item.rules, doc);
                                                    if (ok && email) {
                                                        template(row.id, {
                                                            doc: doc
                                                        }, sendmail(email, row.doc.name));
                                                    }
                                                }
                                            }
                                        }
                                    });
                                    db.get('_local/follow_since', function (err, doc) {
                                        doc = doc || {};
                                        doc.since = change.seq;
                                        db.insert(doc, '_local/follow_since', function (err, body) {
                                            feed.resume();
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    },
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
if (argv.config) {
    config = jf.readFileSync(argv.config);
    transport = nodemailer.createTransport(config.transport);
    url_5986 = "http://localhost:" + config.couchdb.port5986;
    nano = require('nano')({
        url: 'http://' + config.couchdb.user + ':' + config.couchdb.password + '@' + config.couchdb.host + ':' + config.couchdb.port5984,
        "requestDefaults": {
            "agent": myagent
        }
    });
    db_admin = nano.db.use("admin");
    sti = "/mnt/gluster/emailtemplates";
    emailTemplates(sti, function (err, template) {
        if (!err) {
            app.put('/follow/:id', auth, function (req, res) {
                db_admin.get(req.params.id, function (err, database) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                        return res.status(401).send(JSON.stringify({
                            ok: false,
                            message: 'Du har ikke rettigheder til at oprette follow.'
                        }));
                    }
                    if (!databases.hasOwnProperty(req.params.id)) {
                        console.log("follow: " + req.params.id);
                        followDatabase(req.params.id, template);
                    }
                    res.end();
                });
            });
            app["delete"]('/follow/:id', auth, function (req, res) {
                db_admin.get(req.params.id, function (err, database) {
                    if (err) {
                        return res.status(err.status_code || 500).send(err);
                    }
                    if (req.userCtx.roles.indexOf("sys") === -1 && req.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                        return res.status(401).send(JSON.stringify({
                            ok: false,
                            message: 'Du har ikke rettigheder til at slette follow.'
                        }));
                    }
                    if (databases.hasOwnProperty(req.params.id)) {
                        db_admin.view('database', 'emailtemplate', {
                            startkey: [req.params.id, ""],
                            endkey: [req.params.id, {}]
                        }, function (err, body) {
                            if (err) {
                                return res.status(err.status_code || 500).send(err);
                            }
                            if (body.rows.length === 0) {
                                databases[req.params.id].stop();
                                console.log("delete: " + req.params.id);
                                delete databases[req.params.id];
                            }
                        });
                    }
                    res.end();
                });
            });
            app.listen(4001);
            console.log('Listening on port 4001');
            db_admin.view('database', 'emailtemplate', {
                group: true,
                "group_level": 1
            }, function (err, body) {
                body.rows.forEach(function (row) {
                    var id = row.key[0];
                    //if (id === "7329765f31b7939dc2b457f483107688") {
                    followDatabase(id, template);
                    //}
                });
            });
        }
    });

} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}