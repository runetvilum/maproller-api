(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organizations', ['$scope', '$rootScope', '$http',
        function ($scope, $rootScope, $http) {

            
            $rootScope.title="Organisationer";
        }
    ]);
})(this, this.angular, this.console);