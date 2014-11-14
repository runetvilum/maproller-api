(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-fulltext', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.missingSchema = true;
            $scope.missing = true;
            $scope.sort = "";
            $scope.keys = [];
            var buildKeys = function (node, parent) {
                for (var key in node) {

           

                    /*if (node[key].properties) {
                        buildKeys(node[key].properties,  parent + '["'+key +'"].');

                    } else {
                        $scope.keys.push(parent+'["'+key+'"]');
                    }*/
                    if (node[key].properties) {
                        buildKeys(node[key].properties,  parent + '/'+key );

                    } else {
                        $scope.keys.push(parent+'/'+key);
                    }
                }
            };
            $http.get('/couchdb/db-' + $stateParams.database + '/_design/schema')

            .success(function (data, status, headers, config) {
                $scope.missingSchema = false;
                $scope.schema = data.schema;
                buildKeys(data.schema.properties,"");
            })

            .error(function (data, status, headers, config) {
                if (status === 404) {
                    $scope.missingSchema = true;
                } else {
                    $scope.errorSchema = data;
                }

            });

            $http.get('/api/fulltext/' + $stateParams.database)

            .success(function (data, status, headers, config) {
                $scope.missing = false;
                $scope.sort = data.sort;
                info();
            })

            .error(function (data, status, headers, config) {
                console.log(data);
                if (data.status_code === 404) {
                    $scope.missing = true;
                } else {
                    $scope.error = data;
                }
            });
            $scope.save = function () {
                $scope.error = null;
                $scope.success = null;

                $http.put('/api/fulltext/' + $stateParams.database, {
                    sort: $scope.sort
                })

                .success(function (data, status, headers, config) {
                    $scope.missing = false;
                    $scope.success = data;
                    info();
                })

                .error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
            $scope.delete = function () {
                $scope.error = null;
                $scope.success = null;

                $http.delete('/api/fulltext/' + $stateParams.database)

                .success(function (data, status, headers, config) {
                    $scope.missing = true;
                    $scope.success = data;
                })

                .error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
            var info = function () {

                $http.get('http://127.0.0.1:5984/_fti/local/db-' + $stateParams.database + '/_design/fulltext/data')

                .success(function (data, status, headers, config) {
                    $scope.info = data;
                })

                .error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
            $scope.query = "";
            $scope.search = function ($event) {

                $http.get('http://127.0.0.1:5984/_fti/local/db-' + $stateParams.database + '/_design/fulltext/data?sort=sort&limit=100000&q=' + $scope.query + '*')

                .success(function (data, status, headers, config) {
                    $scope.result = data;
                })

                .error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);