/*jshint -W054 */
(function (window, angular, console, L) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives')
        
    .directive('map', function () {
        return {
            restrict: 'A',
            scope: {
                onCreate: '&'
            },
            link: function ($scope, $element, $attr) {
                var map = new L.Map($element[0]);
                map.attributionControl.setPrefix('');
                $scope.onCreate({
                    map: map
                });
            }
        };
    });
    
})(this, this.angular, this.console, this.L);