(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-data', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            /*$scope.felter = [];
            angular.forEach($scope.data.schema.properties, function (value, key) {
                $scope.felter.push({
                    key: key,
                    value: value
                });
            });*/
            $scope.sort = "/";
            $http.get('/couchdb/db-' + $stateParams.database + '/_all_docs?include_docs=true').
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.rows = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
                $scope.error = data;
            });
            
            $scope.keys = ["/"];
            var buildKeys = function (node, parent) {
                
                for (var key in node) {
                    if (node[key].properties) {
                        $scope.keys.push(parent+key+'/');
                        buildKeys(node[key].properties,  parent +key +'/' );

                    } /*else {
                        $scope.keys.push(parent+'/'+key);
                    }*/
                }
            };
            $http.get('/couchdb/db-' + $stateParams.database + '/_design/schema')

            .success(function (data, status, headers, config) {
                $scope.missingSchema = false;
                $scope.schema = data.schema;
                buildKeys(data.schema.properties,"/");
            })

            .error(function (data, status, headers, config) {
                if (status === 404) {
                    $scope.missingSchema = true;
                } else {
                    $scope.errorSchema = data;
                }

            });
        }
    ]);
})(this, this.angular, this.console);