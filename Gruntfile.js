module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: grunt.file.readJSON('config.json'),
        'couch-compile': {
            users: {
                files: {
                    'tmp/users.json': ['dist/users']
                }
            },
            www: {
                files: {
                    'tmp/www.json': ['dist/www']
                }
            },
            admin: {
                files: {
                    'tmp/admin.json': ['dist/admin']
                }
            }
        },
        'couch-push': {
            users: {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://localhost:5986/_users': 'tmp/users.json'
                }
            },
            www: {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://localhost:5984/www': 'tmp/www.json'
                }
            },
            admin: {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://localhost:5984/admin': 'tmp/admin.json'
                }
            }
        },
        'couch-security': {
            "www": {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://localhost:5984/www': 'www/security.json'
                }
            },
            "admin": {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://localhost:5984/admin': 'dist/admin/security.json'
                }
            },
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-couch');

    // Default task(s).
    grunt.registerTask('default', ['couch-compile', 'couch-push', 'couch-security']);

};