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

                var dbOrganization = nano.db.use(id2);
                dbOrganization.list(function (err, body) {
                    if (!err) {
                        body.rows.forEach(function (row) {
                            if (row.id !== '_design/security') {
                                dbApp.get(row.id, function (err, doc) {
                                    doc.organization = organization.id;
                                    doc.type = "configuration";

                                    dbApp.insert(doc, doc._id, function (err, body) {
                                        if (err) {
                                            console.log("error insert configuration: " + doc._id);
                                            console.log(err);
                                        } else {
                                            console.log("insert configuration: " + doc._id);
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    });
} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}