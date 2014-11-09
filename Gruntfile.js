module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'couch-compile': {
            users: {
                files: {
                    'tmp/users.json': ['dist/users']
                }
            }
        },
        'couch-push': {
            "users": {
                files: {
                    'http://localhost:5986/_users': 'tmp/users.json'
                }
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-couch');

    // Default task(s).
    grunt.registerTask('default', ['couch-compile', 'couch-push']);

};