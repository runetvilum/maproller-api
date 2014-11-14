(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-data', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.felter = [];
            angular.forEach($scope.data.schema.properties, function (value, key) {
                $scope.felter.push({
                    key: key,
                    value: value
                });
            });
            $http.get('/couchdb/db-' + $stateParams.database + '/_all_docs?include_docs=true').
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.rows = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
                $scope.error = data;
            });
        }
    ]);
})(this, this.angular, this.console);