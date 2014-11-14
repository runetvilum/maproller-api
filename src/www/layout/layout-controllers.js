(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layout', ['$scope', '$rootScope', '$http', '$stateParams', '$state', 'layout',
        function ($scope, $rootScope, $http, $stateParams, $state, layout) {
            $scope.layout = layout.data;
            $scope.layout.baselayers = $scope.layout.baselayers || {};
            $scope.layout.overlays = $scope.layout.overlays || {};
        }
    ]);
})(this, this.angular, this.console);