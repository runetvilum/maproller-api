/*jshint -W054 */
(function (window, angular, console, L) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives').directive('map', ['$http',
        function ($http) {
            var map;
            return {
                link: function (scope, element, attrs) {
                    var mapScope = scope;
                    
                    map = new L.Map(element[0]);
                    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
                    map.setView(L.latLng(55.9, 11.8), 7);
                    /*map = new L.Map(element[0], {
                        crs: new L.Proj.CRS.TMS('EPSG:25832',
                            '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                                resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1]
                            })
                    });

                    L.tileLayer('http://{s}.kortforsyningen.kms.dk/topo_skaermkort?ticket={kfticket}&request=GetTile&version=1.0.0&service=WMTS&Layer=dtk_skaermkort&style=default&format=image/jpeg&TileMatrixSet=View1&TileMatrix={zoom}&TileRow={y}&TileCol={x}', {
                        kfticket: scope.ticket,
                        attribution: "Geodatastyrelsen",
                        continuousWorld: true,
                        maxZoom: 13,
                        zoom: function (layer) {
                            if (layer.z < 10) {
                                return 'L0' + layer.z;
                            } else {
                                return 'L' + layer.z;
                            }
                        }
                    }).addTo(map);
                    map.setView(L.latLng(55.9, 11.8), 1);*/

                    scope.$watch(attrs.options, function (value) {
                        if (value) {
                            var bounds;
                            try {
                                bounds = map.getBounds();
                            } catch (err) {}
                            map.remove();
                            var baselayer;
                            if (value.epsg === "25832") {
                                map = new L.Map(element[0], {
                                    crs: new L.Proj.CRS.TMS('EPSG:25832',
                                        '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                                            resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1]
                                        }) //,
                                    //center: L.latLng(55.9, 11.8),
                                    //zoom: 1
                                });
                                baselayer = L.tileLayer('http://{s}.kortforsyningen.kms.dk/topo_skaermkort?ticket={kfticket}&request=GetTile&version=1.0.0&service=WMTS&Layer=dtk_skaermkort&style=default&format=image/jpeg&TileMatrixSet=View1&TileMatrix={zoom}&TileRow={y}&TileCol={x}', {
                                    kfticket: scope.ticket,
                                    attribution: "Geodatastyrelsen",
                                    continuousWorld: true,
                                    maxZoom: 13,
                                    zoom: function (layer) {
                                        if (layer.z < 10) {
                                            return 'L0' + layer.z;
                                        } else {
                                            return 'L' + layer.z;
                                        }
                                    }
                                });
                            } else {
                                map = new L.Map(element[0], {
                                    //center: L.latLng(55.9, 11.8),
                                    //zoom: 6
                                });
                                baselayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
                            }
                            if (bounds) {
                                map.fitBounds(bounds);
                            }
                            var jsonTransformed = {};
                            if (value.options) {
                                jsonTransformed = JSON.parse(value.options, function (key, value) {
                                    if (value && (typeof value === 'string') && value.indexOf("function") === 0) {
                                        // we can only pass a function as string in JSON ==> doing a real function
                                        //eval("var jsFunc = " + value);
                                        var jsFunc = new Function('return ' + value)();
                                        return jsFunc;
                                    }
                                    return value;
                                });
                            }
                            jsonTransformed.ticket = scope.ticket;

                            if (value.mapType === 'xyz') {
                                L.tileLayer(value.url, jsonTransformed).addTo(map);
                            } else if (value.mapType === 'wms') {
                                jsonTransformed = angular.extend(jsonTransformed, value.wms);
                                L.tileLayer.wms(value.url, jsonTransformed).addTo(map);
                            } else if (value.mapType === 'geojson') {
                                map.addLayer(baselayer);
                                $http.get('/couchdb/db-' + value.database + '/_all_docs?include_docs=true').
                                success(function (data, status, headers, config) {
                                    console.log(data);

                                    var layer = L.geoJson(null, jsonTransformed).addTo(map);
                                    for (var i = 0; i < data.rows.length; i++) {
                                        var doc = data.rows[i].doc;
                                        if (doc._id !== "_design/security") {
                                            layer.addData(doc);
                                        }
                                    }
                                }).
                                error(function (data, status, headers, config) {
                                    console.log(data);
                                });
                            } else if (value.mapType === 'mbtiles') {
                                //http://tilestream.maproller.org/api/Tileset
                                //jsonTransformed.tms = true;
                                if (value.minzoom) {
                                    jsonTransformed.minZoom = value.minzoom;
                                }
                                if (value.maxzoom) {
                                    jsonTransformed.maxZoom = value.maxzoom;
                                }
                                if (value.bounds) {
                                    var bounds2 = value.bounds.split(',');
                                    if (bounds2.length == 4) {
                                        jsonTransformed.bounds = [[bounds2[1], bounds2[0]], [bounds2[3], bounds2[2]]];
                                    }
                                }
                                L.tileLayer('http://{s}.tilestream.data.kosgis.dk/v2/' + value._id + '/{z}/{x}/{y}.' + value.format, jsonTransformed).addTo(map);
                                //L.tileLayer('http://localhost:8888/v2/' + value._id + '/{z}/{x}/{y}.' + value.format, jsonTransformed).addTo(map);
                            }
                        }
                    });
                }
            };
        }
    ]);
})(this, this.angular, this.console, this.L);