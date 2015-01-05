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
                    'tmp/www.json': ['dist/www/data']
                }
            },
            admin: {
                files: {
                    'tmp/admin.json': ['dist/admin/organization', 'dist/admin/templates', 'dist/admin/database']
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
                    'http://localhost:<%= config.couchdb.port5986 %>/_users': 'tmp/users.json'
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
                    'http://localhost:5984/www': 'dist/www/security.json'
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
            }
        },
        'copy': {
            'www': {
                expand: true,
                cwd: 'src/www',
                src: '**/*',
                dest: 'dist/www/data/_attachments'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-couch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-preen');

    // Default task(s).
    grunt.registerTask('default', ['copy', 'couch-compile', 'couch-push', 'couch-security']);

};