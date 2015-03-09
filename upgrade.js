/*global require, console,process*/
var argv = require('minimist')(process.argv.slice(2)),
    jf = require('jsonfile'),
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
                            for (var key in configuration.doc._attachments) {
                                if (key.indexOf('.geojson')) {
                                    doc._attachments[key] = {
                                        content_type: configuration.doc._attachments[key].content_type,
                                        data: configuration.doc._attachments[key].data
                                    };
                                }
                            }
                        }
                        dbConfiguration.insert(doc, configuration.id, function (err, body) {
                            if (err) {
                                console.log("error insert doc: " + configuration.id);
                            } else {
                                console.log("insert doc: " + configuration.id);
                            }
                        });
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
    dbApp.view('config', 'organization', {
        include_docs: true
    }, function (err, body) {
        if (!err) {
            body.rows.forEach(function (organization) {
                var id = config.app + '-' + organization.id;
                nano.db.create(id, function (err, body) {
                    if (!err) {
                        console.log("create " + id);
                    } else {
                        console.log("error create " + id);
                    }
                    var dbOrganization = nano.db.use(id);
                    dbOrganization.insert(rolesdoc, "_security", function (err, body) {

                        var secdoc = {
                            validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1 || userCtx.roles.indexOf('admin_" + organization.id + "') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                        };
                        dbOrganization.insert(secdoc, '_design/security', function (err, body) {
                            if (err) {
                                console.log("error validate_doc_update organization " + organization.id);
                                //console.log(err);
                            }
                            dbApp.view('config', 'configuration', {
                                key: organization.id,
                                include_docs: true,
                                attachments: true
                            }, function (err, body) {
                                body.rows.forEach(function (configuration) {
                                    dbOrganization.get(configuration.id, function (err, configdoc) {
                                        var doc = {
                                            name: configuration.doc.name
                                        };
                                        if (!err) {
                                            doc._rev = configdoc._rev;
                                        }
                                        if (configuration.doc._attachments && configuration.doc._attachments.logo) {
                                            dbOrganization.attachment.get(configuration.id, 'logo', function (err, data) {
                                                doc._attachments = {
                                                    logo: {
                                                        content_type: configuration.doc._attachments.logo.content_type,
                                                        data: data
                                                    }
                                                };
                                                insert(doc, configuration, secdoc, dbOrganization, organization);
                                            });

                                        } else {
                                            insert(doc, configuration, secdoc, dbOrganization, organization);
                                        }

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