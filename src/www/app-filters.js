(function (window, angular, console) {
    'use strict';
    angular.module('myApp.filters', []).filter('objectpath', function () {
        return function (input, value) {
            if (typeof (input) !== 'undefined') {
                var path = value.split('/');
                var item = input.properties;
                for (var m = 1; m < path.length; m++) {
                    var key = path[m];
                    if (item.hasOwnProperty(key)) {
                        item = item[key].properties;
                    }
                }
                return item;
            }
            return input;
        };
    }).filter('valuepath', function () {
        return function (input, value) {
            if (typeof (input) !== 'undefined') {
                var path = value.split('/');
                var item = input;
                for (var m = 1; m < path.length; m++) {
                    var key = path[m];
                    if (item.hasOwnProperty(key)) {
                        item = item[key];
                    }
                }
                if (typeof (item) === 'object') {
                    return null;
                }
                return item;
            }
            return input;
        };
    });
})(this, this.angular, this.console);