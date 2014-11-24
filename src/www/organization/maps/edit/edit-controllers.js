(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('maps-edit', ['$scope', '$rootScope', '$http', '$stateParams', '$state', 'ticket',
        function ($scope, $rootScope, $http, $stateParams, $state, ticket) {
            $scope.ticket = ticket;
            $http.get('/api/maps/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.maps = data.rows;
                if (data.rows.length > 0) {
                    $scope.selected = data.rows[0];
                    $scope.map = $scope.selected.value;
                }
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });

            /*$scope.optionsType = [{
                key: 'Tiles (xyz)',
                value: 'xyz'
            }, {
                key: 'WMS',
                value: 'wms'
            }, {
                key: 'MBTiles',
                value: 'mbtiles'
            }, {
                key: 'GeoJSON',
                value: 'geojson'
            }];*/
            $scope.optionsType = [ {
                key: 'MBTiles',
                value: 'mbtiles'
            }];
            $scope.optionsEPSG = [{
                key: 'Web mercator (EPSG:3857)',
                value: '3857'
            }, {
                key: 'UTM32 / ETRS89 (EPSG:25832)',
                value: '25832'
            }];
            var init = {
                epsg: '3857',
                mapType: 'mbtiles',
                organization: $stateParams.organization
            };
            $scope.map = {
                epsg: '3857',
                mapType: 'mbtiles',
                organization: $stateParams.organization
            };
            $scope.new = function () {
                $scope.old = false;
                $scope.map = null;
                $scope.success = null;
                $scope.error = null;
                $scope.map = {
                    epsg: '3857',
                    mapType: 'xyz',
                    organization: $stateParams.organization
                };
            };
            $scope.remove = function () {
                var index = $scope.maps.indexOf($scope.selected);
                $scope.maps.splice(index, 1);
                $scope.selected = null;
                $scope.new();
            };
            $scope.$watch('map.mapType', function (doc) {
                $state.go('organization.maps.edit.' + doc, {
                    organization: $stateParams.organization
                });
            });
        }]);
})(this, this.angular, this.console);