(function (window, angular, console) {
    'use strict';
    angular.module('myApp.filters', []).filter('objectpath', function () {
        return function (input, doc) {
            if (typeof (input) !== 'undefined'){
         
                
                var path = doc.split('/');
                console.log(path.length);
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
        return function (doc, sort) {
            if (typeof (doc) !== 'undefined'){
                var item = doc;
                var path = sort.split('/');
                for (var m = 1; m < path.length; m++) {
                    var key = path[m];
                    if (item.hasOwnProperty(key)) {
                        item = item[key];
                    }
                }
                return item;
            }
            return doc;
        };
    });
})(this, this.angular, this.console);