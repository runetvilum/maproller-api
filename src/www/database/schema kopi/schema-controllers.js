(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-schema', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.felter = [];

            $http.get('/couchdb/db-' + $stateParams.database + '/_design/schema')

            .success(function (data, status, headers, config) {
                if (data.schema) {
                    angular.forEach(data.schema.properties, function (value, key) {
                        $scope.felter.push({
                            key: key,
                            value: value
                        });
                    });
                }
            })

            .error(function (data, status, headers, config) {
                console.log(data);
                $scope.error = data;
            });

            $scope.$watchCollection('felter', function (newFelter, oldFelter) {
                console.log('felter');
                if (!angular.equals(newFelter, oldFelter)) {
                    $scope.changed = true;
                }
            });
            $scope.changed = false;
            $scope.$watch('changed', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.error = null;
                    $scope.success = null;
                }
            });
            $scope.save = function () {
                $scope.changed = false;
                var properties = {};
                for (var i = 0; i < $scope.felter.length; i++) {
                    var felt = $scope.felter[i];
                    properties[felt.key] = felt.value;
                }

                var doc = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "Product",
                    "description": "A product from Acme's catalog",
                    "type": "object",
                    properties: properties
                };
                $scope.error = null;
                $scope.success = null;
                $http.put('/api/database/' + $stateParams.database + '/schema', doc).
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