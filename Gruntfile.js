module.exports = function(grunt) {
    var config = require('./.screeps.json');
    grunt.loadNpmTasks('grunt-eslint');
    // grunt.loadNpmTasks('grunt-screeps');
    grunt.loadTasks("tasks")
    grunt.registerTask('deploy', function(...args) {
        if (args && args.includes("season")) {
            grunt.config.merge({
                screeps: {
                    options: {
                        season: true,
                    }
                },
            })
        }

        grunt.task.run(["screeps"]);
    })
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
                token: config.token,
                branch: config.branch,
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });

    grunt.registerTask('default', ['eslint', 'deploy']);
    grunt.registerTask('season', ['eslint', 'deploy:season']);
}
