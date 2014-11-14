(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layout-info', ['$scope', '$rootScope', '$http', '$stateParams', 'ticket',
        function ($scope, $rootScope, $http, $stateParams, ticket) {
            $scope.ticket = ticket;
            $scope.update = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {

                    $http.put('/api/layout', $scope.$parent.layout).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = true;
                        form.name.$pristine = true;
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
            $http.get('/api/maps/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.layers = {};
                $scope.lookup = {};
                angular.forEach(data.rows, function (row) {
                    $scope.layers[row.id] = row.value.name;
                    $scope.lookup[row.id] = row.value.name;
                });

            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });

            $scope.addBaselayer = function (layer) {
                $scope.$parent.layout.baselayers[layer] = {
                    active: true
                };
                for (var key in $scope.$parent.layout.baselayers) {
                    if (key !== layer)
                        $scope.$parent.layout.baselayers[key].active = false;
                }
                delete $scope.layers[layer];
                $scope.openBaselayer = false;
                $scope.addLeafletLayer(layer, false, true);
            };
            $scope.removeBaselayer = function (layer) {
                delete $scope.$parent.layout.baselayers[layer];
                $scope.layers[layer] = $scope.lookup[layer];
                $scope.removeLeafletLayer(layer, false);
            };
            $scope.addOverlay = function (layer) {
                $scope.$parent.layout.overlays[layer] = {
                    active: true
                };
                delete $scope.layers[layer];
                $scope.openOverlay = false;
                $scope.addLeafletLayer(layer, true, true);
            };
            $scope.removeOverlay = function (layer) {
                delete $scope.layout.overlays[layer];
                $scope.layers[layer] = $scope.lookup[layer];
                $scope.removeLeafletLayer(layer, true);
            };
            /*$scope.ready = function () {
                var key;
                for (key in $scope.$parent.layout.baselayers) {
                    var baselayer = $scope.$parent.layout.baselayers[key];
                    $scope.addLeafletLayer(key, false, baselayer.active);
                }
                for (key in $scope.$parent.layout.overlays) {
                    var overlay = $scope.$parent.layout.overlays[key];
                    $scope.addLeafletLayer(key, true, overlay.active);
                }
            };*/

        }]);
})(this, this.angular, this.console);