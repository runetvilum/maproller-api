/*jslint nomen: true*/
/*global require, process, console*/

var inspect = require('util').inspect,
    express = require('express'),
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
        console.log(item);
        return item;
    },
    testrules = function (rules, doc) {
        var key,
            rule;
        for (key in rules) {
            if (rules.hasOwnProperty(key)) {
                rule = rules[key];
                if (rule !== valuepath(key, doc)) {
                    return false;
                }
            }
        }
        return true;
    },
    sendmail = function (email, row) {
        return function (err, html, text) {
            if (err) {
                console.log(err);
            } else {
                transport.sendMail({
                    from: config.transport.auth.user,
                    to: email,
                    subject: row.doc.name,
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
                var feed = this,
                    emailoptions = {
                        reduce: false,
                        include_docs: true
                    },
                    rev;
                databases[id] = feed;
                if (!error) {
                    feed.pause();
                    /*console.log(inspect(change, {
                        colors: true
                    }));*/
                    if (change.deleted) {
                        emailoptions.key = [id, "delete"];
                    } else {
                        rev = change.changes[0].rev.split('-');
                        if (rev[0] === '1') {
                            emailoptions.key = [id, "create"];
                        } else {
                            emailoptions.key = [id, "update"];
                        }
                    }
                    db.get(change.id, function (err, doc) {
                        db_admin.view('database', 'emailtemplate', emailoptions, function (err, data) {
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
                                                }, sendmail(key, row));
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
                                                }, sendmail(email, doc));
                                            }
                                        }
                                    }
                                }
                            });
                            db.get('_local/follow_since', function (err, doc) {
                                /*console.log(inspect(doc, {
                                                colors: true
                                            }));*/
                                doc = doc || {};
                                doc.since = change.seq;
                                db.insert(doc, '_local/follow_since', function (err, body) {
                                    /*if (!err) {
                                                    console.log(inspect(body, {
                                                        colors: true
                                                    }));
                                                } else {
                                                    console.log("insert error: " + err);
                                                }*/
                                    feed.resume();
                                });
                            });
                        });
                    });
                }
            });
        });
    };
if (argv.config) {
    config = jf.readFileSync(argv.config);
    transport = nodemailer.createTransport(config.transport);
    nano = require('nano')({
        url: 'http://' + config.couchdb.user + ':' + config.couchdb.password + '@' + config.couchdb.host + ':' + config.couchdb.port5984
    });
    db_admin = nano.db.use("admin");
    sti = "/mnt/gluster/emailtemplates";
    emailTemplates(sti, function (err, template) {
        if (!err) {
            app.put('/follow/:id', function (req, res) {
                if (!databases.hasOwnProperty(req.params.id)) {
                    followDatabase(req.params.id, template);
                }
                res.end();
            });
            app["delete"]('/follow/:id', function (req, res) {
                if (databases.hasOwnProperty(req.params.id)) {
                    databases[req.params.id].stop();
                    delete databases[req.params.id];
                }
                res.end();
            });
            app.listen(4001);
            console.log('Listening on port 4001');
            db_admin.view('database', 'emailtemplate', {
                group: true,
                "group_level": 1
            }, function (err, body) {
                body.rows.forEach(function (row) {
                    var id = row.key[0];
                    followDatabase(id, template);
                });
            });
        }
    });

} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}