/*global require, console,process*/
var argv = require('minimist')(process.argv.slice(2)),
    jf = require('jsonfile'),
    async = require('async'),
    config,
    dbApp,
    nano,
    rolesdoc = {
        admins: {
            names: [],
            roles: ["_admin", "sys"]
        },
        members: {
            names: [],
            roles: []
        }
    };


if (argv.config) {
    config = jf.readFileSync(argv.config);
    nano = require('nano')({
        url: 'http://localhost:' + config.couchdb.port5984,
        requestDefaults: {
            auth: {
                user: config.couchdb.user,
                pass: config.couchdb.password
            }
        }
    });
    dbApp = nano.use(config.app);

    dbApp.view('config', 'organization', function (err, body) {
        if (!err) {
            body.rows.forEach(function (organization) {
                var id2 = config.app + '-' + organization.id;
                nano.db.create(id2, function (err, body) {
                    if (!err) {
                        console.log("create " + id2);
                    } else {
                        console.log("error create " + id2);
                    }
                    var dbOrganization = nano.db.use(id2);
                    var security = {
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
                            validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1 || userCtx.roles.indexOf('admin_" + organization.id + "') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                        };
                        dbOrganization.get('_design/security', function (err, body) {
                            if (!err) {
                                secdoc._rev = body._rev;
                            }
                            dbOrganization.insert(secdoc, '_design/security', function (err, body) {
                                if (err) {
                                    console.log("error validate_doc_update " + id2);
                                } else {
                                    console.log("validate_doc_update " + id2);
                                }
                                dbApp.view('config', 'configuration', {
                                    key: organization.id
                                }, function (err, body) {
                                    body.rows.forEach(function (row) {
                                        dbApp.get(row.id, {
                                            attachments: true
                                        }, function (err, configuration) {
                                            dbOrganization.get(configuration._id, function (err, body) {
                                                var doc = {
                                                    name: configuration.name,
                                                    hidden: configuration.hidden || false
                                                };
                                                if (!err) {
                                                    doc._rev = body._rev;
                                                }
                                                if (configuration._attachments && configuration._attachments.logo) {
                                                    doc._attachments = {
                                                        logo: {
                                                            content_type: configuration._attachments.logo.content_type,
                                                            data: configuration._attachments.logo.data
                                                        }
                                                    };
                                                }
                                                dbOrganization.insert(doc, configuration._id, function (err, body) {
                                                    if (err) {
                                                        console.log("error insert configuration: " + configuration._id);
                                                    } else {
                                                        console.log("insert configuration: " + configuration._id);
                                                    }
                                                    var doc = {
                                                        map: configuration.map,
                                                        widgets: configuration.widgets || [],
                                                        type: 'configuration'
                                                    };
                                                    if (doc.widgets) {
                                                        for (var i = 0; i < doc.widgets.length; i++) {
                                                            if (doc.widgets[i].id === 'indberetninger') {
                                                                doc.widgets[i].description = configuration.instruction;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    doc._rev = configuration._rev;

                                                    if (configuration._attachments) {
                                                        doc._attachments = {};
                                                        for (var key in configuration._attachments) {
                                                            if (key.indexOf('.geojson')) {
                                                                doc._attachments[key] = {
                                                                    content_type: configuration._attachments[key].content_type,
                                                                    data: configuration._attachments[key].data
                                                                };
                                                            }
                                                        }
                                                    }
                                                    dbApp.insert(doc, configuration._id, function (err, body) {
                                                        if (err) {
                                                            console.log("error insert doc: " + configuration._id);
                                                        } else {
                                                            console.log("insert doc: " + configuration._id);
                                                        }
                                                    });

                                                    var id3 = config.app + '-' + organization.id + '-' + configuration._id;
                                                    var id4 = 'db-' + configuration._id;
                                                    nano.db.destroy(id3, function (err, body) {
                                                        if (!err) {
                                                            console.log('destroy ' + id3);
                                                        } else {
                                                            console.log('error destroy ' + id3);
                                                        }

                                                    });
                                                    nano.db.destroy(id4, function (err, body) {
                                                        if (!err) {
                                                            console.log('destroy ' + id4);
                                                        } else {
                                                            console.log('error destroy ' + id4);
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    });

} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}