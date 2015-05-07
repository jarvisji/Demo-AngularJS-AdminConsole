module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        replace: {
            txyun: {
                src: ['php/config.php'],
                dest: ['built/php/config.php'],
                replacements: [
                    {
                        from: '$grunt_replace_serviceUrl',
                        to: 'http://service.demo.biz'
                    },
                    {
                        from: '$grunt_replace_envmode',
                        to: 'PROD'
                    }
                ]
            },
            txtest: {
                src: ['php/config.php'],
                dest: ['built/php/config.php'],
                replacements: [
                    {
                        from: '$grunt_replace_serviceUrl',
                        to: 'http://devservice.demo.biz'
                    },
                    {
                        from: '$grunt_replace_envmode',
                        to: 'DEV'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-text-replace');

    grunt.registerTask('txyun', ['replace:txyun']);
    grunt.registerTask('txtest', ['replace:txtest']);
};
