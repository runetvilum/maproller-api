(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization-maps', ['$scope', '$rootScope', '$http', '$stateParams', 'md5', '$upload', '$location',
        function ($scope, $rootScope, $http, $stateParams, md5, $upload, $location) {
            var map;
            var selectedLayer;
            $scope.maps = [];
            $scope.mapCreated = function (mapvar) {
                map = mapvar;
                $http.get('/api/maps/' + $stateParams.organization).
                success(function (data, status, headers, config) {
                    if (data.rows.length > 0) {
                        $scope.map = data.rows[0].value;
                        $scope.selectedIndex = 0;
                        $http.get('/tilestream/api/Tileset/' + $scope.map._id).
                        success(function (data, status, headers, config) {
                            var bounds = [[data.bounds[1], data.bounds[0]], [data.bounds[3], data.bounds[2]]];
                            var options = {
                                minZoom: data.minzoom,
                                maxZoom: data.maxzoom
                            };
                            var url = '';
                            if ($location.$$host !== 'localhost') {
                                url += 'http://{s}.' + $location.$$host;
                            }
                            url += '/tilestream/v2/' + $scope.map._id + '/{z}/{x}/{y}.' + $scope.map.format;
                            selectedLayer = L.tileLayer(url, options).addTo(map);
                            map.fitBounds(bounds);
                        }).
                        error(function (data, status, headers, config) {
                            console.log(data);
                        });
                    }
                    for (var i = 0; i < data.rows.length; i++) {
                        $scope.maps.push(data.rows[i].value);
                    }
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };

            $scope.select = function (index) {
                if (map.hasLayer(selectedLayer)) {
                    map.removeLayer(selectedLayer);
                }
                $scope.selectedIndex = index;
                $scope.map = $scope.maps[index];
                $http.get('/tilestream/api/Tileset/' + $scope.map._id).
                success(function (data, status, headers, config) {
                    var bounds = [[data.bounds[1], data.bounds[0]], [data.bounds[3], data.bounds[2]]];
                    var options = {
                        minZoom: data.minzoom,
                        maxZoom: data.maxzoom
                    };
                    var url = '';
                    if ($location.$$host !== 'localhost') {
                        url += 'http://{s}.' + $location.$$host;
                    }
                    url += '/tilestream/v2/' + $scope.map._id + '/{z}/{x}/{y}.' + $scope.map.format;
                    selectedLayer = L.tileLayer(url, options).addTo(map);
                    map.fitBounds(bounds);
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };
            $scope.new = function () {
                $scope.success = null;
                $scope.error = null;
                $scope.map = {
                    epsg: '3857',
                    mapType: 'mbtiles',
                    organization: $stateParams.organization
                };
                files = [];
            };

            $scope.fileError = false;
            $scope.fileSuccess = false;
            var files = [];
            $scope.onFileSelect = function ($files) {
                files = $files;
                $scope.fileError = false;
                $scope.fileSuccess = true;
            };
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    if ($scope.map._id) {
                        $http.put('/api/map', $scope.map).
                        success(function (data, status, headers, config) {
                            $scope.success = data;
                            $scope.map._rev = data.rev;
                        }).
                        error(function (data, status, headers, config) {
                            $scope.error = data;
                        });
                    } else {
                        if (files.length === 0) {
                            $scope.fileError = true;
                            $scope.fileSuccess = false;
                        } else {
                            $scope.upload = $upload.upload({
                                url: '/api/mbtiles', //upload.php script, node.js route, or servlet url
                                data: $scope.map,
                                file: files[0],
                            }).progress(function (evt) {
                                $scope.dynamic = parseInt(100.0 * evt.loaded / evt.total);
                            }).success(function (data, status, headers, config) {
                                $scope.success = data;
                                $scope.map._rev = data.rev;
                                $scope.map._id = data.id;
                                $scope.map.size = data.size;
                                $scope.map.format = data.format;
                                $scope.maps.push($scope.map);
                                $scope.select($scope.maps.length - 1);
                            }).error(function (data, status, headers, config) {
                                $scope.error = data;
                            });
                        }
                    }
                }
            };
            $scope.delete = function () {
                $scope.success = null;
                $scope.error = null;
                $http.delete('/api/mbtiles/' + $scope.map._id).
                success(function (data, status, headers, config) {
                    $scope.success = data;
                    var index = $scope.maps.indexOf($scope.map);
                    $scope.maps.splice(index, 1);
                    $scope.new();
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };


        }]);
})(this, this.angular, this.console);