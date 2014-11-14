(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('maps-create', ['$scope', '$http', '$stateParams', '$rootScope', '$state',
        function ($scope, $http, $stateParams, $rootScope, $state) {
            $scope.optionsType = [{
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
                mapType: 'xyz',
                organization: $stateParams.organization
            };
            $scope.map = {
                epsg: '3857',
                mapType: 'xyz',
                organization: $stateParams.organization
            };
            /*$rootScope.$on("item", function (evt, item) {
                $scope.map = null;
                $scope.map = item.value;
                $scope.old = true;
            });
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
            };*/
            $scope.$watch('map.mapType', function (doc) {
                $state.go('organization.maps.create.' + doc, {
                    organization: $stateParams.organization
                });
            });
        }]);
})(this, this.angular, this.console);