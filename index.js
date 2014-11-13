/*global require, console, __dirname, process, Buffer*/
var argv = require('minimist')(process.argv.slice(2));
var jf = require('jsonfile');
var crypto = require('crypto');
var imageType = require('image-type');
var sqlite3 = require('sqlite3');
var request = require('request');
var http = require('http');
var os = require("os");
var hostname = os.hostname();
var express = require('express');
var compress = require('compression');
var basicAuth = require('basic-auth');
var cors = require('cors');
var bodyParser = require('body-parser');
//var busboy = require('connect-busboy');
var Busboy = require('busboy');

//var cookieParser = require('cookie-parser');
var uuid = require('uuid');
var inspect = require('util').inspect;
var emailTemplates = require('email-templates');
var path = require('path');
var templatesDir = path.join(__dirname, 'templates');
var nodemailer = require('nodemailer');
var fs = require('fs');

var config;

if (argv.config) {
    config = jf.readFileSync(argv.config);
} else {
    console.log("Du skal angive config fil, f.eks.:  --config=config.json");
}


var app = express();
app.use('/mbtiles', function (req, res) {
    var url = "http://localhost:8888/" + req.url.substring(8);
    if (req.method === 'PUT') {
        req.pipe(request.put(url)).pipe(res);
    } else if (req.method === 'POST') {
        req.pipe(request.post(url)).pipe(res);
    } else if (req.method === 'GET') {
        req.pipe(request.get(url)).pipe(res);
    }
});
app.all('/couchdb*', function (req, res) {
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Origin', 'http://localhost:8100');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, HEAD, DELETE');
    res.set('Access-Control-Allow-Headers', 'accept, authorization, content-type, origin, referer');
    var url = "http://localhost:5984/" + req.url.substring(9);
    console.log(url);
    //console.log(inspect(req,{colors:true}));
    //var url = 'http://admin:rutv2327@localhost:5984/admin/' + req.params.id + '/logo.png';
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

var transport = nodemailer.createTransport(config.transport);
//nano
var userpass = config.couchdb.user + ':' + config.couchdb.password;

var url_5986 = "http://localhost:" + config.couchdb.port5986;

var db = require('nano')('http://' + userpass + '@localhost:' + config.couchdb.port5986 + '/_users');
var nano = require('nano')('http://' + userpass + '@localhost:' + config.couchdb.port5984);
var db_admin = nano.db.use("admin");


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

app.use(bodyParser.json());
/*app.use('/api/upload', busboy({
    immediate: true
}));*/
//app.use(cookieParser());

app.use(express.static(__dirname)); //  "public" off of current is root
//region Login
app.post('/api/signin', function (req, res) {
    if (!req.body || !req.body.name || !req.body.password) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Brugernavn og password er påkrævet.'
        }));
    }

    db.auth(req.body.name, req.body.password, function (err, body, headers) {
        if (err) {
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
        if (headers && headers['set-cookie']) {
            res.set('set-cookie', headers['set-cookie']);
        }
        db.get('org.couchdb.user:' + body.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }

            if (!user.verified) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du skal bekræfte din konto inden du kan logge ind. Check venligst din email (inklusiv spam folder) for mere information.'
                }));
            }
            user.organizations = [];
            if (user.roles.indexOf('sys') === -1) {
                var roles = [];
                for (var i = 0; i < user.roles.length; i++) {
                    var role = user.roles[i];
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
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            user.organizations = [];
            if (user.roles.indexOf('sys') === -1) {
                var roles = [];
                for (var i = 0; i < user.roles.length; i++) {
                    var role = user.roles[i];
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
app.delete('/api/session', function (req, res) {
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
app.post('/api/organization', function (req, res) {
    if (!req.body || !req.body.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Organisation er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette organisationer.'
                }));
            }
            db_admin.insert({
                name: req.body.organization,
                type: 'organization'
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });

        });
    });
});
//Hent en organisation
app.get('/api/organization/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.id) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                }));
            }

            db_admin.get(req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Opdater organisation
app.put('/api/organization', function (req, res) {
    if (!req.body || !req.body._id || !req.body.name) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Organisation er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at rette organisationer.'
                }));
            }
            db_admin.get(req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                body.name = req.body.name;
                db_admin.insert(body, req.body._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.end(JSON.stringify(body));
                });
            });
        });
    });
});
//Slet organisation
app.delete('/api/organization/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette organisationer.'
                }));
            }
            db_admin.view('organization', 'schemas', {
                key: req.params.id
            }, function (err, schemas) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
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
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    if (users.rows.length > 0) {
                        return res.status(401).send(JSON.stringify({
                            ok: false,
                            message: 'Der findes ' + users.rows.length + ' brugere på organisationen. Du kan ikke slette organisationen før alle brugere er slettet.'
                        }));
                    }
                    db_admin.get(req.params.id, function (err, body) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        db_admin.destroy(body._id, body._rev, function (err, body) {
                            if (err) {
                                return res.status(err.status_code ? err.status_code : 500).send(err);
                            }
                            res.end(JSON.stringify(body));
                        });
                    });
                });
            });
        });
    });
});
//Hent alle organisationer
/*app.get('/api/organizations', function (req, res) {
    var user = basicAuth(req);
    if (typeof user === "undefined") {
        return res.status(401).send(JSON.stringify({
            ok: false,
            message: 'Brugernavn og password er påkrævet.'
        }));
    }
    db.auth(user.name, user.pass, function (err, body, headers) {
        if (err) {
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
        if (body.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se organisationer.'
            }));
        }
        db_admin.view('organization', 'organizations', function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            res.end(JSON.stringify(body));
        });
    });
});*/
//endregion
//region Bruger
//Hent alle brugere i en organisation
app.get('/api/users/:organization', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se brugere for denne organisation.'
                }));
            }
            db.view('users', 'role', {
                key: req.params.organization
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});

var checkAdmin = function (roles, roles2) {
    for (var i = 0; i < roles.length; i++) {
        var role = roles[i].replace('admin_', '');
        for (var j = 0; j < roles2.length; j++) {
            var role2 = roles2[j].replace('admin_', '').replace('user_', '');
            if (role == role2) {
                return true;
            }
        }
    }
    return false;
};
//Hent bruger
app.get('/api/user/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get('org.couchdb.user:' + req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && checkAdmin(user.roles, body.roles)) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at se brugere for denne organisation.'
                    }));
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});
//Opret bruger
app.post('/api/user', function (req, res) {
    if (!req.body || !req.body.name || !req.body.role) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Bruger er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get('org.couchdb.user:' + req.body.name, function (err, body2) {
                var organization = req.body.role.replace('user_', '').replace('admin_', '');
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + organization) === -1) {
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
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        body.timestamp = body2.timestamp;
                        body.verified = body2.verified;
                        res.end(JSON.stringify(body));
                    });
                } else {
                    //Opret ny bruger
                    var roles = [req.body.role];
                    var code = uuid.v1();
                    var date = new Date();
                    //couchdb <= 1.1.1
                    var salt = crypto.randomBytes(16).toString('hex');
                    var hash = crypto.createHash('sha1');
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
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        body.timestamp = date;
                        emailTemplates(templatesDir, function (err, template) {
                            if (err) {
                                return res.status(err.status_code ? err.status_code : 500).send(err);
                            }
                            template('verify', {
                                user: body,
                                url: 'http://data.addin.dk/#/verify/' + code
                                //url: 'http://localhost:3000/#/verify/' + code
                            }, function (err, html, text) {
                                if (err) {
                                    return res.status(err.status_code ? err.status_code : 500).send(err);
                                }
                                transport.sendMail({
                                    from: 'rune@addin.dk',
                                    to: req.body.name,
                                    subject: 'Invitation',
                                    html: html,
                                    // generateTextFromHTML: true,
                                    text: text
                                }, function (err, responseStatus) {
                                    if (err) {
                                        return res.status(err.status_code ? err.status_code : 500).send(err);
                                    }
                                    res.json(body);
                                });
                            });
                        });
                    });
                }
            });
        });
    });
});
//Slet bruger
app.delete('/api/user/:id', function (req, res) {
    if (!req.params || !req.params.id || !req.query || !req.query.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'id og organization er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get(req.params.id, function (err, user) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                var admin_role = user.roles.indexOf("admin_" + req.query.organization);
                var user_role = user.roles.indexOf("user_" + req.query.organization);
                if (body.roles.indexOf("sys") === -1 && (body.roles.indexOf("admin_" + req.query.organization) === -1 || (admin_role === -1 && user_role === -1))) {
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
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        res.end(JSON.stringify(body));
                    });
                } else {
                    db.destroy(user._id, user._rev, function (err, body) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        res.end(JSON.stringify(body));
                    });
                }
            });
        });
    });
});
//Opdater bruger
app.put('/api/user', function (req, res) {
    if (!req.body || !req.body._id || !req.body.role) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'id og role er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get(req.body._id, function (err, user) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                var organization = req.body.role.replace('user_', '').replace('admin_', '');
                var admin_role = user.roles.indexOf("admin_" + organization);
                var user_role = user.roles.indexOf("user_" + organization);
                if (body.roles.indexOf("sys") === -1 && (body.roles.indexOf("admin_" + organization) === -1 || (admin_role === -1 && user_role === -1))) {
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
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.end(JSON.stringify(body));
                });
            });
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
            return res.status(err.status_code ? err.status_code : 500).send(err);
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

        var salt = crypto.randomBytes(16).toString('hex');
        var hash = crypto.createHash('sha1');
        hash.update(req.body.password + salt);
        user.verified = new Date();
        //user.password = req.body.password;
        user.salt = salt;
        user.password_sha = hash.digest('hex');
        db.insert(user, user._id, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.auth(user.name, req.body.password, function (err, body, headers) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (headers && headers['set-cookie']) {
                    res.set('set-cookie', headers['set-cookie']);
                }
                db.get('org.couchdb.user:' + body.name, function (err, user) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    user.organizations = [];
                    if (user.roles.indexOf('sys') === -1) {
                        var roles = [];
                        for (var i = 0; i < user.roles.length; i++) {
                            var role = user.roles[i];
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
            return res.status(err.status_code ? err.status_code : 500).send(err);
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
                return res.status(err.status_code ? err.status_code : 500).send(err);
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
app.put('/api/database/:id', function (req, res) {
    if (!req.body || !req.body.name || !req.body.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Navn og organisation er påkrævet.'
        }));
    }
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

        if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at rette databasen.'
            }));
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            body.name = req.body.name;
            body.organization = req.body.organization;
            db_admin.insert(body, body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});

app.get('/api/testdatabase/:id', function (req, res) {
    var couchdb = require('nano')({
        cookie: req.headers.cookie,
        url: 'http://127.0.0.1:15984'
    });
    couchdb.db.get('db-' + req.params.id, function (err, body) {
        if (err) {
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
        res.json(body);
    });
});

//Hent databaseinformation
app.get('/api/database/:id/info', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.get(req.params.id, function (err, body2) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + body2.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                    }));
                }
                nano.db.get('db-' + req.params.id, function (err, body3) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    var d = nano.db.use('db-' + req.params.id);
                    d.get("_security", function (err, body4) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
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
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + body.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                }));
            }
            nanoAdmin.db.get('_all_dbs', function (err, allDBs) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                for(var i=0;i<allDBs.length){
                    if()
                }
                var d = nano.db.use('db-' + req.params.id);
                d.get("_security", function (err, body4) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
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
app.get('/api/organization/:id/databases', function (req, res) {
    var getDatabases = function (userCtx) {
        if (userCtx.roles.indexOf("sys") === -1 && userCtx.roles.indexOf("admin_" + req.params.id) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
            }));
        }
        db_admin.view('organization', 'databases', {
            keys: [req.params.id]
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            res.json(body);
        });

    };
    var user = basicAuth(req);
    if (typeof user === "undefined") {
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
            getDatabases(session.userCtx);
        });
    } else {
        db.auth(user.name, user.pass, function (err, userCtx, headers) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            getDatabases(userCtx);
        });
    }
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
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
        nano.db.get('db-' + req.params.id, function (err, body2) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            var d = nano.db.use('db-' + req.params.id);
            d.get("_security", function (err, body3) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
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
app.post('/api/database', function (req, res) {
    if (!req.body || !req.body.name || !req.body.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Navn og organisation er påkrævet.'
        }));
    }
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
        if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
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
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            var db_id = 'db-' + body.id;
            nano.db.create(db_id, function (err, body2) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
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
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.end(JSON.stringify(body));
                });
            });
        });
    });
});

var schemaGetPut = function (req, res) {
    if (!req.body || !req.body.schema) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'schema er påkrævet.'
        }));
    }
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
        if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + req.body.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at oprette databaser.'
            }));
        }
        fs.readFile('tv4.js', 'utf8', function (err, data) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            fs.readFile('validate_doc_update.js', 'utf8', function (err, validate_doc_update) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                var db_id = 'db-' + req.params.id;
                var d = nano.db.use(db_id);
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
                            "      if (doc._id === '_design/schema') {" +
                            "        return true;" +
                            "      }" +
                            "      return false;" +
                            "    }"
                    };
                    doc.schema = req.body.schema;
                    d.insert(doc, "_design/schema", function (err, body) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        res.json(body);
                    });
                });
            });
        });
    });
};

//Opret skema
app.post('/api/database/:id/schema', function (req, res) {
    schemaGetPut(req, res);
});
//Opdater skema
app.put('/api/database/:id/schema', function (req, res) {
    schemaGetPut(req, res);
});
//Slet database
app.delete('/api/database/:id', function (req, res) {
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
        db_admin.get(req.params.id, function (err, database) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette databasen.'
                }));
            }
            db_admin.destroy(database._id, database._rev, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                nano.db.destroy('db-' + database._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});
//endregion
//Opdater sikkerhed
app.put('/api/security', function (req, res) {
    if (!req.body || !req.body.database || !req.body.security) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Database og security er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.get(req.body.database, function (err, body2) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + body2.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at opdatere database sikkerheden.'
                    }));
                }
                var d = nano.db.use('db-' + req.body.database);
                d.get('_security', function (err, security) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
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
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        var validate_admin = "if ((userCtx.roles.indexOf('_admin') !== -1) || (userCtx.roles.indexOf('admin_" + body2.organization + "') !== -1)) { return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }";
                        var validate_user = "if ((userCtx.roles.indexOf('_admin') !== -1) || (userCtx.roles.indexOf('admin_" + body2.organization + "') !== -1) || (userCtx.roles.indexOf('user_" + body2.organization + "') !== -1)) { return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }";
                        var validate = "function (newDoc, oldDoc, userCtx, secObj) { if (newDoc._deleted === true) {";
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
                        var id = '_design/security';
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
                                    return res.status(err.status_code ? err.status_code : 500).send(err);
                                }
                                res.end(JSON.stringify(body));
                            });
                        });
                    });
                });
            });
        });
    });
});
//Upload data
app.post('/api/upload/:database', function (req, res) {
    db_admin.get(req.params.database, function (err, schema) {
        if (err) {
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
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
            db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + schema.organization) === -1) {
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
                    var d = nano.db.use('db-' + req.params.database);
                    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
                        var buffer = "";
                        file.on('data', function (data) {
                            console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                            buffer += data;
                        });
                        file.on('end', function () {
                            console.log('File [' + fieldname + '] Finished');
                            var json = JSON.parse(buffer);
                            if (json.features && json.features.length > 0) {
                                schema.properties = schema.properties || {};
                                for (var key in json.features[0].properties) {
                                    if (!schema.properties.hasOwnProperty(key)) {
                                        schema.properties[key] = {
                                            type: "text"
                                        };
                                    }
                                }
                                db_admin.insert(schema, schema._id, function (err, body) {
                                    if (err) {
                                        return res.status(err.status_code ? err.status_code : 500).send(err);
                                    }
                                    var insert = function (err, body) {
                                        if (err) {
                                            return res.status(err.status_code ? err.status_code : 500).send(err);
                                        }
                                    };
                                    for (var i = 0; i < json.features.length; i++) {
                                        var doc = json.features[i];
                                        d.insert(doc, insert);
                                    }
                                    res.end(JSON.stringify(body));
                                });

                            }
                        });
                    });
                    req.pipe(busboy);
                }
            });
        });
    });
});
//Henter alle apps
app.get('/api/apps', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se apps for denne organisation.'
                }));
            }
            var d = nano.db.use('apps');

            d.list({
                include_docs: true
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});
//Henter alle apps i en organization
app.get('/api/apps/:organization', function (req, res) {
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
        if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + req.params.organization) === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til at se apps for denne organisation.'
            }));
        }
        db_admin.view('templates', 'organization', {
            key: req.params.organization
        }, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            res.json(body);
        });

    });
});
//Opretter ny app i en organisation
app.post('/api/apps', function (req, res) {
    if (!req.body || !req.body.name || !req.body.organization || !req.body.template) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Navn, template og organisation er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
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
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});
//Henter alle apps i en organization
app.get('/api/app/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se apps for denne organisation.'
                }));
            }
            db_admin.get(req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});

//Opdater app
app.put('/api/app', function (req, res) {
    if (!req.body || !req.body._id || !req.body.name || !req.body.databases) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'name og databases er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se apps for denne organisation.'
                }));
            }
            db_admin.get(req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                body.name = req.body.name;
                body.databases = req.body.databases;
                db_admin.insert(body, req.body._id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.end(JSON.stringify(body));
                });

            });
        });
    });
});
//Slet app
app.delete('/api/app/:id', function (req, res) {

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
        db_admin.get(req.params.id, function (err, app) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + app.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at slette apps for denne organisation.'
                    }));
                }
                db_admin.destroy(app._id, app._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});
//region Template
//Opret ny template
app.post('/api/templates', function (req, res) {

    var couchdb = require('nano')({
        cookie: req.headers.cookie,
        url: url_5986
    });
    couchdb.session(function (err, session, headers) {
        if (!session.userCtx.name) {
            return res.status(401).json({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            });
        }
        if (headers && headers['set-cookie']) {
            res.set('set-cookie', headers['set-cookie']);
        }

        if (session.userCtx.roles.indexOf("sys") === -1) {
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
        };
        var busboy = new Busboy({
            headers: req.headers
        });
        var name;
        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated) {
            if (fieldname === 'databases') {
                val = JSON.parse(val);
            }
            doc[fieldname] = val;
        });
        var myfile;
        var buffer = [];
        var finalbuffer;
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
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                db_admin.attachment.insert(body.id, 'logo.png', finalbuffer, 'image/png', {
                    rev: body.rev
                }, function (err, body2) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    var db_id = 'app-' + body.id;
                    nano.db.create(db_id, function (err, body3) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
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
                                return res.status(err.status_code ? err.status_code : 500).send(err);
                            }
                            var doc = {
                                organizations: [],
                                validate_doc_update: "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}}"
                            };
                            d.insert(doc, '_design/security', function (err, body5) {
                                if (err) {
                                    return res.status(err.status_code ? err.status_code : 500).send(err);
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
});
//hent alle templates/
app.get('/api/templates', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til se templates.'
                }));
            }

            db_admin.view('templates', 'all', function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//henter en template
app.get('/api/template/:id', function (req, res) {
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
        if (session.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            res.json(body);
        });
    });
});
//henter en template
app.get('/api/template/:id/logo', function (req, res) {
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
        delete req.headers.cookie;
        var url = 'http://' + userpass + '@localhost:' + config.couchdb.port5984 + '/admin/' + req.params.id + '/logo.png';
        req.pipe(request(url)).pipe(res);
    });
});
//henter sikkerhed for en template
app.get('/api/template/:id/security', function (req, res) {
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
        if (session.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }
        var organizations = [];
        var d = nano.db.use('app-' + req.params.id);
        d.get("_design/security", function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (body.organizations) {
                organizations = body.organizations;
            }
            res.json(organizations);
        });
    });
});
//Opdater sikkerhed på en template
app.put('/api/template/:id/security', function (req, res) {
    if (!req.body || !req.body.organizations) {
        return res.status(400).json({
            ok: false,
            message: 'organizations er påkrævet.'
        });
    }
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
        if (session.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til se templates.'
            }));
        }
        db_admin.get(req.params.id, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            body.organizations = req.body.organizations;
            db_admin.insert(body, req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                var d = nano.db.use('app-' + req.params.id);
                var validate = "function (newDoc, oldDoc, userCtx, secObj) { if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('sys') !== -1){return;} else if (oldDoc === null) { if(";
                var validate_create = "";
                for (var i = 0; i < req.body.organizations.length; i++) {
                    validate_create += "|| userCtx.roles.indexOf('admin_" + req.body.organizations[i] + "') !== -1 ";
                }
                validate += validate_create.substring(2) + "){return;} else {throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' });}} else { if(userCtx.roles.indexOf('admin_'+oldDoc.organization) !== -1){ return; } else { throw ({ forbidden: 'Du har ikke rettigheder til denne operation.' }); }} }";
                var id = '_design/security';
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
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        res.json(body);
                    });
                });
            });
        });
    });
});
//opdatere en template
app.put('/api/template', function (req, res) {
    if (!req.body || !req.body.name || !req.body._id || !req.body._rev) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'name  er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til se templates.'
                }));
            }

            db_admin.insert(req.body, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Slet en template
app.delete('/api/template/:id', function (req, res) {
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
        if (session.userCtx.roles.indexOf("sys") === -1) {
            return res.status(401).send(JSON.stringify({
                ok: false,
                message: 'Du har ikke rettigheder til slette templates.'
            }));
        }
        db_admin.get(req.params.id, function (err, template) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.destroy(template._id, template._rev, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                nano.db.destroy('app-' + req.params.id, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});
//Opdater fulltext
app.put('/api/fulltext/:id', function (req, res) {
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
        db_admin.get(req.params.id, function (err, schema) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + schema.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at opdatere fulltext.'
                }));
            }
            var d = nano.db.use('db-' + req.params.id);
            var fulltext = {
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
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});
//Hent fulltext
app.get('/api/fulltext/:id', function (req, res) {
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
        db_admin.get(req.params.id, function (err, database) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + database.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se fulltext.'
                }));
            }
            var d = nano.db.use('db-' + req.params.id);
            var id = '_design/fulltext';
            d.get(id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Slet fulltext
app.delete('/api/fulltext/:id', function (req, res) {
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
        db_admin.get(req.params.id, function (err, schema) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (session.userCtx.roles.indexOf("sys") === -1 && session.userCtx.roles.indexOf("admin_" + schema.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at slette fulltext.'
                }));
            }
            var d = nano.db.use('db-' + req.params.id);
            var id = '_design/fulltext';
            d.get(id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                d.destroy(body._id, body._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });

        });
    });
});
//Henter alle apps i en organization
app.get('/api/template/_design/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se apps for denne organisation.'
                }));
            }
            var d = nano.db.use('apps');
            d.get('_design/' + req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});


//Hent alle layouts for en organisation
app.get('/api/layouts/:organization', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                }));
            }
            db_admin.view('organization', 'layouts', {
                keys: [req.params.organization]
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});
//Slet layout
app.delete('/api/layout/:id', function (req, res) {

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
        db_admin.get(req.params.id, function (err, layout) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + layout.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at slette apps for denne organisation.'
                    }));
                }
                db_admin.destroy(layout._id, layout._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});

//Opdater layout
app.put('/api/layout', function (req, res) {
    if (!req.body || !req.body.name || !req.body.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Navn og organisation er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + req.body.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette databaser.'
                }));
            }
            db_admin.insert(req.body, req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Opret layout
app.post('/api/layouts', function (req, res) {
    if (!req.body || !req.body.name || !req.body.organization) {
        return res.status(400).send(JSON.stringify({
            ok: false,
            message: 'Navn og organisation er påkrævet.'
        }));
    }
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + req.body.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette databaser.'
                }));
            }
            db_admin.insert({
                name: req.body.name,
                organization: req.body.organization,
                type: 'layout'
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Hent alle kort for en organisation
app.get('/api/maps/:organization', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se databaser for denne organisation.'
                }));
            }
            db_admin.view('organization', 'maps', {
                keys: [req.params.organization]
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Hent kort
app.get('/api/map/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.get(req.params.id, function (err, map) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + map.organization) === -1 && user.roles.indexOf("user_" + map.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at se kort for denne organisation.'
                    }));
                }
                res.json(map);
            });
        });
    });
});
//Hent alle kort for en organisation
app.delete('/api/map/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.get(req.params.id, function (err, map) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + map.organization) === -1 && user.roles.indexOf("user_" + map.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at slette kort for denne organisation.'
                    }));
                }
                db_admin.destroy(map._id, map._rev, function (err, body) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    res.json(body);
                });
            });
        });
    });
});
//Opret kort
app.post('/api/map', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + req.body.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette kort.'
                }));
            }
            var doc = req.body;
            doc.type = "map";
            db_admin.insert(doc, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
    });
});
//Opdater map
app.put('/api/map', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, body) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (body.roles.indexOf("sys") === -1 && body.roles.indexOf("admin_" + req.body.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at oprette kort.'
                }));
            }
            db_admin.insert(req.body, req.body._id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.json(body);
            });
        });
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
            res.send();
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
    console.log(1);
    console.log(req.originalUrl);
    res.set('Server', 'CouchDB/1.6.0 (Erlang OTP/17)');
    if (req.params.design === 'ogr_metadata') {
        console.log(req.params.design);
        var ogr_metadata = {
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
            for (var item in body.properties) {
                var field = body.properties[item];
                if (field.type === 'text') {
                    ogr_metadata.fields.push({
                        name: item,
                        type: "text"
                    });
                }
            }
            return res.json(ogr_metadata);
        });
    } else {
        var d = nano.db.use('db-' + req.params.database);
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

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
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
        /*for (var i = 0; i < body.rows.length; i++) {
            var row = body.rows[i];
            row.couchdb = row._id;
            row._id = pad(i, 9);
        }*/
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
            return res.status(err.status_code ? err.status_code : 500).send(err);
        }
        if (req.params.database === '_all_dbs') {
            var roles = [];
            for (var i = 0; i < body.roles.length; i++) {
                var role = body.roles[i].replace('user_', '').replace('admin_', '');
                if (role !== 'sys' && role !== '_admin') {
                    roles.push(role);
                }
            }
            db_admin.view('organization', 'schemas', {
                keys: roles
            }, function (err, body) {
                var dbs = [];
                if (!err) {
                    for (var i = 0; i < body.rows.length; i++) {
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
    var user = basicAuth(req);
    if (typeof user === "undefined") {
        return res.status(401).send(JSON.stringify({
            ok: false,
            message: 'Brugernavn og password er påkrævet.'
        }));
    }
    var couchdb = require('nano')('http://' + user.name + ':' + user.pass + '@localhost:5984/' + req.params.database);
    couchdb.get(req.params.id, function (err, body) {
        res.json(body);
    });
});
/*var d = nano.db.use('db-'+database);
           d.list({
                include_docs: true
            }, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
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
/*app.get('/api/qgis/*', function (req, res) {
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
app.delete('/api/mbtiles/:id', function (req, res) {
    var couchdb = require('nano')({
        cookie: req.headers.cookie,
        url: url_5986
    });
    couchdb.session(function (err, session, headers) {
        if (!session.userCtx.name) {
            return res.status(401).json({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            });
        }
        if (headers && headers['set-cookie']) {
            res.set('set-cookie', headers['set-cookie']);
        }
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            db_admin.get(req.params.id, function (err, map) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + map.organization) === -1 && user.roles.indexOf("user_" + map.organization) === -1) {
                    return res.status(401).send(JSON.stringify({
                        ok: false,
                        message: 'Du har ikke rettigheder til at slette kort for denne organisation.'
                    }));
                }
                var filepath = '/mnt/gluster/tiles/' + req.params.id + '.mbtiles';
                fs.unlink(filepath, function (err) {
                    if (err) {
                        return res.status(err.status_code ? err.status_code : 500).send(err);
                    }
                    db_admin.destroy(map._id, map._rev, function (err, body) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        res.json(body);
                    });
                });
            });
        });
    });
});

//Opret ny mbtile kort
app.post('/api/mbtiles', function (req, res) {

    var couchdb = require('nano')({
        cookie: req.headers.cookie,
        url: url_5986
    });
    couchdb.session(function (err, session, headers) {
        if (!session.userCtx.name) {
            return res.status(401).json({
                ok: false,
                message: 'Brugernavn og password er påkrævet.'
            });
        }
        if (headers && headers['set-cookie']) {
            res.set('set-cookie', headers['set-cookie']);
        }
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.body.organization) === -1) {
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
            });
            var name;
            var id = uuid.v1();
            //var saveTo = path.join(os.tmpDir(), id);
            var saveTo = '/mnt/gluster/tiles/' + id + '.mbtiles';
            var doc = {
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
                    var mbtilesDB = new sqlite3.Database(saveTo, sqlite3.OPEN_READONLY, function (err) {
                        if (err) {
                            return res.status(err.status_code ? err.status_code : 500).send(err);
                        }
                        mbtilesDB.all("select * from metadata", function (err, rows) {
                            if (err) {
                                console.log("metadata: " + err);
                            } else {
                                for (var i = 0; i < rows.length; i++) {
                                    var row = rows[i];
                                    doc[row.name] = row.value;
                                }
                            }
                            mbtilesDB.each("select * from tiles limit 1", function (err, row) {
                                if (err) {
                                    return res.status(err.status_code ? err.status_code : 500).send(err);
                                }
                                var buf = new Buffer(row.tile_data);
                                var imgtype = imageType(buf);
                                doc.format = imgtype;
                                db_admin.insert(doc, id, function (err, body) {
                                    if (err) {
                                        return res.status(err.status_code ? err.status_code : 500).send(err);
                                    }
                                    res.json(body);
                                    /*var db_id = 'db-' + body.id;
                                nano.db.create(db_id, function (err, body2) {
                                    if (err) {
                                        return res.status(err.status_code ? err.status_code : 500).send(err);
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
    });
});
//Henter alle apps i en organization
app.get('/api/layout/:id', function (req, res) {
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
        db.get('org.couchdb.user:' + session.userCtx.name, function (err, user) {
            if (err) {
                return res.status(err.status_code ? err.status_code : 500).send(err);
            }
            if (user.roles.indexOf("sys") === -1 && user.roles.indexOf("admin_" + req.params.organization) === -1) {
                return res.status(401).send(JSON.stringify({
                    ok: false,
                    message: 'Du har ikke rettigheder til at se apps for denne organisation.'
                }));
            }
            db_admin.get(req.params.id, function (err, body) {
                if (err) {
                    return res.status(err.status_code ? err.status_code : 500).send(err);
                }
                res.end(JSON.stringify(body));
            });
        });
    });
});
app.listen(4000);
console.log('Listening on port 4000');