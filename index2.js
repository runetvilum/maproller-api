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
    sendmail = function (email, row) {
        return function (err, html, text) {
            if (err) {
                console.log(err);
            } else {
                console.log("sendmail: " + email);
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
        console.log(id);
        var db = nano.db.use('db-' + id),
            db2 = nano.db.use('db-' + id),
            options = {};
        db2.get('_local/follow_since', function (err, doc) {
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
                    debugger;
                    db2.get(change.id, function (err, doc) {
                        debugger;
                        if (err) {
                            console.log("get");
                            console.log(err);
                        } else {
                            db_admin.view('database', 'emailtemplate', emailoptions, function (err, data) {
                                debugger;
                                if (err) {
                                    console.log("view");
                                    console.log(err);
                                } else {
                                    console.log("count: " + data.rows.length);
                                    data.rows.forEach(function (row) {
                                        debugger;
                                        console.log("row: " + row.id);
                                        console.log(row);
                                        var key, ok, item, email;
                                        if (row.doc.users) {
                                            for (key in row.doc.users) {
                                                if (row.doc.users.hasOwnProperty(key)) {
                                                    item = row.doc.users[key];
                                                    ok = testrules(item.rules, doc);
                                                    if (ok) {
                                                        console.log("template: " + doc._id);
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
                                                        console.log("template: " + doc._id);
                                                        template(row.id, {
                                                            doc: doc
                                                        }, sendmail(email, doc));
                                                    }
                                                }
                                            }
                                        }
                                    });
                                    db2.get('_local/follow_since', function (err, doc) {
                                        doc = doc || {};
                                        doc.since = change.seq;
                                        db2.insert(doc, '_local/follow_since', function (err, body) {
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
                    if (id === "7329765f31b7939dc2b457f483107688") {
                        followDatabase(id, template);
                    }
                });
            });
        }
    });

} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}