(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('maps-list', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $http.get('/api/maps/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.maps = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);