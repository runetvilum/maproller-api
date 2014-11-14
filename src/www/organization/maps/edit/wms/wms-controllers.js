(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('edit-wms', ['$scope', '$http', '$stateParams', '$rootScope', '$upload',
        function ($scope, $http, $stateParams, $rootScope, $upload) {
            $scope.$parent.submit = function (form) {
                $scope.$parent.success = null;
                $scope.$parent.error = null;
                if (form.$valid) {
                    var method = "post";
                    if ($scope.$parent.map._id) {
                        method = "put";
                    }
                    $http[method]('/api/map', $scope.$parent.map).
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
            };
            $scope.$parent.delete = function () {
                $http.delete('/api/map/' + $scope.$parent.map._id).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.$parent.remove();
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };
        }]);
})(this, this.angular, this.console);