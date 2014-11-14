(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('edit-mbtiles', ['$scope', '$http', '$stateParams', '$rootScope', '$upload',
        function ($scope, $http, $stateParams, $rootScope, $upload) {
            $scope.fileError = false;
            $scope.fileSuccess = false;
            var files = [];
            $scope.onFileSelect = function ($files) {
                files = $files;
                $scope.fileError = false;
                $scope.fileSuccess = true;
            };
            $scope.$parent.submit = function (form) {
                $scope.$parent.success = null;
                $scope.$parent.error = null;
                if ($scope.$parent.map._id) {
                    if (form.$valid) {
                        $http.put('/api/map', $scope.$parent.map).
                        success(function (data, status, headers, config) {
                            console.log(data);
                            $scope.$parent.success = true;
                            $scope.$parent.map = null;
                            $scope.$parent.map = {
                                epsg: '3857',
                                mapType: 'xyz',
                                organization: $stateParams.organization
                            };
                            form.name.$pristine = true;
                            form.url.$pristine = true;
                        }).
                        error(function (data, status, headers, config) {
                            $scope.$parent.error = data;
                            console.log(data);
                        });
                    } else {
                        form.name.$pristine = false;
                        form.url.$pristine = false;
                    }
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
                            // file is uploaded successfully


                            console.log(data);
                            $scope.success = true;
                            $scope.$parent.map = null;
                            $scope.$parent.map = {
                                epsg: '3857',
                                mapType: 'xyz',
                                organization: $stateParams.organization
                            };
                            //form.name.$pristine = true;

                            $rootScope.$broadcast("map", data);

                        }).error(function (data, status, headers, config) {
                            console.log(data);
                            $scope.parent.error = data;

                        });
                    }
                }
            };
            $scope.$parent.delete = function () {
                $http.delete('/api/mbtiles/' + $scope.$parent.map._id).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.$parent.remove();
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.parent.error = data;
                });
            };
        }]);
})(this, this.angular, this.console);