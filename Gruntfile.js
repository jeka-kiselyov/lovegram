const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

const webpackConfigs = {};
webpackConfigs['auth'] = require('./frontend/webpack/auth.config.js');
webpackConfigs['app'] = require('./frontend/webpack/app.config.js');
webpackConfigs['mtp'] = require('./frontend/webpack/mtp.config.js');
webpackConfigs['sw'] = require('./frontend/webpack/sw.config.js');
webpackConfigs['mtworker'] = require('./frontend/webpack/mtworker.config.js');
webpackConfigs['webpworker'] = require('./frontend/webpack/webpworker.config.js');

for (let wcName in webpackConfigs) {
    if (!webpackConfigs[wcName].optimization) {
        webpackConfigs[wcName].optimization = {};
    }
    webpackConfigs[wcName].optimization.minimize = true;
    webpackConfigs[wcName].optimization.minimizer = [new TerserPlugin({
            terserOptions: {
                compress: { booleans_as_integers: false, ecma: 2015, },
            }})];
    webpackConfigs[wcName].mode = 'production';
    webpackConfigs[wcName].output.path = path.join(__dirname, './dist');
}

module.exports = function(grunt) {

    grunt.initConfig({
        webpack: [webpackConfigs['auth'], webpackConfigs['app'], webpackConfigs['mtp'], webpackConfigs['mtworker'], webpackConfigs['webpworker'], webpackConfigs['sw']],
        // shell: {
        //     options: {
        //         stderr: false,
        //     },
        //     // libNPM: {
        //     //     command: 'npm install',
        //     //     cwd: path.join(__dirname, './frontend/src/protocol/tele')
        //     // },
        //     // libBuild: {
        //     //     command: "npm run build",
        //     //     cwd: path.join(__dirname, './frontend/src/protocol/tele')
        //     // }
        // },
        cssmin: {
            options: {
                rebase: true,
                rebaseTo: './dist/assets/css',
            },
            target: {
                files: [{
                    expand: true,
                    cwd: './dist/assets/css',
                    src: ['*.css', '!*.min.css'],
                    dest: './dist/assets/css',
                    ext: '.css'
                }]
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, flatten: true, src: ['./frontend/assets/css/elements/**'], dest: './dist/assets/css/elements',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/assets/css/**'], dest: './dist/assets/css',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/assets/data/**'], dest: './dist/assets/data',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/assets/js/**'], dest: './dist/assets/js',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/assets/images/**'], dest: './dist/assets/images',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/assets/*'], dest: './dist/assets',filter: 'isFile',},
                    {expand: true, flatten: true, src: ['./frontend/*'], dest: './dist/',filter: 'isFile',},
                ],
            },
        },
    });

    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['webpack', 'copy', 'cssmin']);
};