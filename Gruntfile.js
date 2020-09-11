module.exports = function(grunt) {
    var config = require('./.screeps.json');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-screeps');
    grunt.initConfig({
        eslint: {
            options: {
                configFile: '.eslint.json'
            },
            target: ['src/*.js']
        },
        screeps: {
            options: {
                email: config.email,
                password: config.password,
                branch: config.branch,
                ptr: config.ptr
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });

    grunt.registerTask('default', ['eslint', 'screeps']);
}
