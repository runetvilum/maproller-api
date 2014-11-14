(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layout-map', ['$scope', '$rootScope', '$http', '$stateParams', '$state',
        function ($scope, $rootScope, $http, $stateParams, $state) {
            $scope.layers = {
                baselayers: {}
            }
        }
    ]);
})(this, this.angular, this.console);