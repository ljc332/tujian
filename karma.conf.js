// Karma configuration
// Generated on Fri Aug 16 2013 16:22:37 GMT+0200 (W. Europe Daylight Time)
'use strict';

module.exports = function (config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',

    // frameworks to use
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'bower/jquery/dist/jquery.js',
      'bower/angular/angular.js',
      'bower/angular-animate/angular-animate.js',
      'bower/angular-resource/angular-resource.js',
      'bower/angular-route/angular-route.js',
      'bower/angular-sanitize/angular-sanitize.js',
      'bower/angular-touch/angular-touch.js',
      'bower/angular-cache/dist/angular-cache.js',
      'bower/angular-aria/angular-aria.js',
      'bower/angular-material/angular-material.js',
      'bower/angular-ui-codemirror/ui-codemirror.js',
      'bower/angular-mocks/angular-mocks.js',
      'public/js/app.js',
      'public/js/controllers/*.js',
      'public/js/services/*.js',
      'public/js/directives.js',
      'public/js/filters.js',
      'test_client/jasmine-aliases.js',
      'test_client/**/*Specs.js'
    ],

    // list of files to exclude
    exclude: [

    ],

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['spec', 'growl'],

    specReporter : {
      suppressPassed: true,
      suppressFailed: false,
      suppressSkipped: true
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['ChromeCanary'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
