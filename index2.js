/*jslint nomen: true*/
/*global require, process, console*/

var inspect = require('util').inspect,
    emailTemplates = require('email-templates'),
    nodemailer = require('nodemailer'),
    argv = require('minimist')(process.argv.slice(2)),
    jf = require('jsonfile');
if (argv.config) {
    var config = jf.readFileSync(argv.config),
        transport = nodemailer.createTransport(config.transport),
        nano = require('nano')({
            url: 'http://' + config.couchdb.user + ':' + config.couchdb.password + '@localhost:' + config.couchdb.port5984
        }),
        db_admin = nano.db.use("admin"),
        sti = "/mnt/gluster/emailtemplates";
    emailTemplates(sti, function (err, template) {
        if (!err) {
            db_admin.view('database', 'emailtemplate', {
                group: true,
                "group_level": 1
            }, function (err, body) {
                body.rows.forEach(function (row) {
                    var id = row.key[0],
                        db = nano.db.use('db-' + id),
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
                                            if (row.doc.users) {
                                                row.doc.users.forEach(function (user) {
                                                    template(row.id, {
                                                        doc: doc
                                                    }, function (err, html, text) {
                                                        if (err) {
                                                            console.log(err);
                                                        } else {
                                                            transport.sendMail({
                                                                from: config.transport.auth.user,
                                                                to: user.substring(17),
                                                                subject: row.doc.name,
                                                                html: html,
                                                                text: text
                                                            }, function (err, responseStatus) {
                                                                if (err) {
                                                                    console.log(err);
                                                                }
                                                            });
                                                        }
                                                    });
                                                });
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
                });
            });
        }
    });

} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}