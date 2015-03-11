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

function insert(doc, configuration, secdoc, dbOrganization, organization) {
    dbOrganization.insert(doc, configuration.id, function (err, doc) {
        if (!err) {
            console.log("insert organization configuration: " + configuration.id);
        } else {
            console.log("error insert organization configuration: " + configuration.id);
        }
        nano.db.create('db-' + configuration.id, function (err, body) {
            if (!err) {
                console.log('create db-' + configuration.id);
            } else {
                console.log('error create db-' + configuration.id);
            }
            var dbConfiguration = nano.db.use('db-' + configuration.id);

            dbConfiguration.insert(rolesdoc, "_security", function (err, body) {
                dbConfiguration.insert(secdoc, '_design/security', function (err, body) {
                    if (err) {
                        console.log("error validate_doc_update configuration " + organization.id);
                    }
                    dbConfiguration.get(configuration.id, function (err, configdoc) {
                        var doc = {
                            hidden: configuration.doc.hidden || false,
                            map: configuration.doc.map,
                            widgets: configuration.doc.widgets
                        };
                        if (doc.widgets) {
                            for (var i = 0; i < doc.widgets.length; i++) {
                                if (doc.widgets[i].id === 'indberetninger') {
                                    doc.widgets[i].description = configuration.doc.instruction;
                                    break;
                                }
                            }
                        }
                        if (!err) {
                            doc._rev = configdoc._rev;
                        }
                        if (configuration.doc._attachments) {
                            doc._attachments = {};
                            var tasks = [];
                            for (var key in configuration.doc._attachments) {
                                if (key.indexOf('.geojson')) {
                                    tasks.push(function (callback) {
                                        dbApp.attachment.get(configuration.doc._id, key, function (err, data) {
                                            doc._attachments[key] = {
                                                content_type: configuration.doc._attachments[key].content_type,
                                                data: data.toString('base64')
                                            };
                                            callback();
                                        });
                                    });
                                }
                            }
                            async.parallel(tasks, function () {
                                dbConfiguration.insert(doc, configuration.id, function (err, body) {
                                    if (err) {
                                        console.log("error insert doc: " + configuration.id);
                                    } else {
                                        console.log("insert doc: " + configuration.id);
                                    }

                                });
                            });

                        } else {
                            dbConfiguration.insert(doc, configuration.id, function (err, body) {
                                if (err) {
                                    console.log("error insert doc: " + configuration.id);
                                } else {
                                    console.log("insert doc: " + configuration.id);
                                }

                            });
                        }
                    });
                });
            });
        });
    });
}
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
    var id = config.app + '-organizations';
    nano.db.create(id, function (err, body) {
        if (!err) {
            console.log("create " + id);
        } else {
            console.log("error create " + id);
        }
        var dbOrganizations = nano.db.use(id);
        dbOrganizations.insert(rolesdoc, "_security", function (err, body) {
            var secdoc = {
                validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1 || userCtx.roles.indexOf('admin_'+newDoc._id) !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
            };
            dbOrganizations.insert(secdoc, '_design/security', function (err, body) {
                if (err) {
                    console.log("error validate_doc_update organizations");
                    //console.log(err);
                }
                dbApp.view('config', 'organization', function (err, body) {
                    if (!err) {
                        body.rows.forEach(function (row) {
                            dbApp.get(row.id, {
                                attachments: true
                            }, function (err, organization) {
                                var doc = {
                                    name: organization.name,
                                    hidden: organization.hidden || false
                                };
                                if (organization._attachments && organization._attachments.logo) {
                                    doc._attachments = {
                                        logo: {
                                            content_type: organization._attachments.logo.content_type,
                                            data: organization._attachments.logo.data
                                        }
                                    };
                                }
                                dbOrganizations.get(organization._id, function (err, body) {
                                    if (!err) {
                                        doc._rev = body._rev;
                                    }
                                    dbOrganizations.insert(doc, organization._id, function (err, body) {
                                        if (err) {
                                            console.log("error insert organization: " + organization._id);
                                        } else {
                                            console.log("insert organization: " + organization._id);
                                        }

                                        var id2 = config.app + '-' + organization._id;
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
                                                    roles: ["_admin", "sys", "admin_" + organization._id]
                                                },
                                                members: {
                                                    names: [],
                                                    roles: []
                                                }
                                            };
                                            dbOrganization.insert(security, "_security", function (err, body) {
                                                secdoc = {
                                                    validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1 || userCtx.roles.indexOf('admin_" + organization._id + "') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                                                };
                                                dbOrganization.insert(secdoc, '_design/security', function (err, body) {
                                                    if (err) {
                                                        console.log("error validate_doc_update organization " + organization._id);
                                                    }
                                                    dbApp.view('config', 'configuration', {
                                                        key: organization._id
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
                                                                        var id3 = config.app + '-' + organization._id + '-' + configuration._id;
                                                                        var id4 = 'db-' + configuration._id;
                                                                        nano.db.destroy(id3, function (err, body) {
                                                                            if (!err) {
                                                                                console.log('destroy ' + id3);
                                                                            } else {
                                                                                console.log('error destroy ' + id3);
                                                                            }

                                                                        });
                                                                        nano.db.create(id4, function (err, body) {
                                                                            if (!err) {
                                                                                console.log('create ' + id4);
                                                                            } else {
                                                                                console.log('error create ' + id4);
                                                                            }
                                                                            var dbConfiguration = nano.db.use(id4);
                                                                            dbConfiguration.insert(security, "_security", function (err, body) {
                                                                                dbConfiguration.insert(secdoc, '_design/security', function (err, body) {
                                                                                    if (err) {
                                                                                        console.log("error validate_doc_update " + id4);
                                                                                    }
                                                                                    if (err) {
                                                                                        console.log("error validate_doc_update " + id4);
                                                                                    }
                                                                                    dbConfiguration.get(configuration._id, function (err, body) {
                                                                                        var doc = {
                                                                                            map: configuration.map,
                                                                                            widgets: configuration.widgets || []
                                                                                        };
                                                                                        if (doc.widgets) {
                                                                                            for (var i = 0; i < doc.widgets.length; i++) {
                                                                                                if (doc.widgets[i].id === 'indberetninger') {
                                                                                                    doc.widgets[i].description = configuration.instruction;
                                                                                                    break;
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                        if (!err) {
                                                                                            doc._rev = body._rev;
                                                                                        }
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
                                                                                        dbConfiguration.insert(doc, configuration._id, function (err, body) {
                                                                                            if (err) {
                                                                                                console.log("error insert doc: " + configuration._id);
                                                                                            } else {
                                                                                                console.log("insert doc: " + configuration._id);
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
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                });
            });
        });
    });
} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}