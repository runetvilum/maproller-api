/*global require, console,process*/
var argv = require('minimist')(process.argv.slice(2)),
    jf = require('jsonfile'),
    config,
    db_admin,
    nano;

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

    db_admin = nano.db.use("admin");

    db_admin.view('database', 'emailtemplate', {
        group: true,
        "group_level": 1
    }, function (err, body) {
        body.rows.forEach(function (row) {
            var id = row.key[0];
            console.log(id);
            nano.db.get('db-' + id, function (err, body) {
                if (!err) {
                    var d = nano.db.use('db-' + id);
                    var doc = {
                        language: 'javascript',
                        views: {
                            data: {
                                map: "function(doc){emit(doc._id, null);}"
                            }
                        }
                    };
                    d.get("_design/views", function (err, body) {
                        if (!err) {
                            doc._rev = body._rev;
                        }
                        d.insert(doc, "_design/views", function (err, body) {
                            if (err) {
                                console.log("error: " + id);
                                //console.log(err);
                            } else {
                                console.log("success: " + id);
                            }
                        });

                    })

                }
            })
        });
    });
} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}