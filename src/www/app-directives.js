(function (window, angular, console) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives', []).filter('isArray', function () {
        return function (input) {
            return angular.isArray(input);
        };
    })

    .filter('makeArray', function () {
        return function (input) {
            if (input && !angular.isArray(input)) {
                return [input];
            }
            return input;
        };
    })
    
    .filter('isSchemaDependency', function () {
        return function (input) {
            if (input && !angular.isArray(input)) {
                return [input];
            }
            return input;
        };
    })
    
    .filter('isPropertyDependency', function () {
        return function (input) {
            if (input && !angular.isArray(input)) {
                return [input];
            }
            return input;
        };
    });
})(this, this.angular, this.console);