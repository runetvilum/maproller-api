(function (window, angular, console, L) {
    'use strict';
    angular.module('myApp.controllers').controller('database-straks', ['$scope', '$rootScope', '$http', '$stateParams', 'md5', '$upload', '$location',
        function ($scope, $rootScope, $http, $stateParams, md5, $upload, $location) {
            var map,
                selectedLayer;

            $scope.data = {};
            $scope.mapCreated = function (mapvar) {
                map = mapvar;
                L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?').addTo(map);
                $http.get('/api/' + $stateParams.database + '/straks').
                success(function (data, status, headers, config) {
                    $scope.data = data;
                    var key;
                    for (key in data) {
                        if (data.hasOwnProperty(key)) {
                            $scope.selectedIndex = key;
                            break;
                        }
                    }
                    if (key) {
                        $scope.straks = data[key];
                        selectedLayer = L.geoJson(data[key].geojson).addTo(map);
                        map.fitBounds(selectedLayer.getBounds());

                    } else {
                        $scope.new();
                    }
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                    $scope.new();
                });
            };

            $scope.select = function (index) {
                if (map.hasLayer(selectedLayer)) {
                    map.removeLayer(selectedLayer);
                }
                $scope.selectedIndex = index;
                $scope.straks = $scope.data[index];
                selectedLayer = L.geoJson($scope.straks.geojson).addTo(map);
                map.fitBounds(selectedLayer.getBounds());
            };

            $scope.new = function () {
                $http.get('/couchdb/_uuids').
                success(function (data, status, headers, config) {
                    var uuid = data.uuids[0];
                    $scope.success = null;
                    $scope.error = null;
                    $scope.straks = {
                        name: '',
                        link: '',
                        description: '',
                        inside: true,
                        database: $stateParams.database,
                        geojson: {}
                    };
                    if (map.hasLayer(selectedLayer)) {
                        map.removeLayer(selectedLayer);
                    }
                    $scope.data[uuid] = $scope.straks;
                    $scope.selectedIndex = uuid;

                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });

            };

            $scope.onFileSelect = function ($files) {
                if ($files.length > 0) {
                    var fileReader = new FileReader();
                    fileReader.readAsText($files[0]);
                    fileReader.onload = function (e) {
                        $scope.straks.geojson = JSON.parse(e.target.result);
                        if (map.hasLayer(selectedLayer)) {
                            map.removeLayer(selectedLayer);
                        }
                        selectedLayer = L.geoJson($scope.straks.geojson).addTo(map);
                        map.fitBounds(selectedLayer.getBounds());
                    };
                }
            };


            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    $http.put('/api/' + $stateParams.database + '/straks', {
                        straks: $scope.data
                    }).
                    success(function (data, status, headers, config) {
                        $scope.success = data;
                    }).
                    error(function (data, status, headers, config) {
                        $scope.error = data;
                    });
                }
            };
            $scope.delete = function () {
                delete $scope.data[$scope.selectedIndex];
                $scope.selectedIndex = null;
            };
            $scope.deleteAll = function () {
                $scope.success = null;
                $scope.error = null;
                $http.delete('/api/' + $stateParams.database + '/straks').
                success(function (data, status, headers, config) {
                    $scope.success = data;
                    $scope.data = [];
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
        }]);
})(this, this.angular, this.console, this.L);