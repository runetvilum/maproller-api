(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-info', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.name = $scope.$parent.data.database.name;
            $scope.update = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    var oldname = $scope.$parent.data.database.name;
                    $scope.data.database.name = $scope.name;
                    $http.put('/api/database/' + $stateParams.database, $scope.data.database).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = data;
                        form.name.$pristine = true;
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.data.database.name = oldname;
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
            $scope.compact = function () {
                $http.post('/couchdb/db-' + $stateParams.database + '/_compact').
                success(function (data, status, headers, config) {
                    $scope.success = data;
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);