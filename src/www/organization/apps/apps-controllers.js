(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization-apps', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.apps = [];
            
            $http.get('/api/apps/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.apps = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
  
        }]);
})(this, this.angular, this.console);