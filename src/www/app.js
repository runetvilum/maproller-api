(function (window, angular, console) {
    'use strict';


    // Declare app level module which depends on filters, and services
    angular.module('myApp', [
        'ui.router',
        'ui.bootstrap',
        'ui.sortable',
        'myApp.filters',
        'myApp.services',
        'myApp.directives',
        'myApp.controllers',
        'angular-md5',
        'angularFileUpload',
        'ncy-angular-breadcrumb'
    ]).
    config(['$stateProvider', '$urlRouterProvider', '$breadcrumbProvider',
        function ($stateProvider, $urlRouterProvider, $breadcrumbProvider) {
            $breadcrumbProvider.setOptions({
                template: '<ol class="breadcrumb">' +
                    '<li ng-repeat="step in steps" ng-class="{active: $last}" ng-switch="$last || !!step.abstract">' +
                    '<a ng-switch-when="false" href="#{{step.ncyBreadcrumbLink}}">{{step.ncyBreadcrumbLabel}}</a> ' +
                    '<span ng-switch-when="true">{{step.ncyBreadcrumbLabel}}</span>' +
                    '</li>' +
                    '</ol>'
            });
            $urlRouterProvider.when('/organizations', '/organizations/list');
            $urlRouterProvider.when('/templates', '/templates/list');
            $urlRouterProvider.when('/organizations/:organization/databases', '/organizations/:organization/databases/list');
            $urlRouterProvider.when('/organizations/:organization/users', '/organizations/:organization/users/list');
            //$urlRouterProvider.when('/organizations/:organization/databases/:database', '/organizations/:organization/databases/:database/info');
            $urlRouterProvider.otherwise("/");
            $stateProvider.state('login', {
                url: '/login',
                templateUrl: 'login/login.html',
                controller: 'login'
            });
            $stateProvider.state('frontpage', {
                url: '/',
                templateUrl: 'frontpage/frontpage.html',
                controller: 'frontpage'
            });
            $stateProvider.state('home', {
                url: '#'
            });
            /*$stateProvider.state('home', {
                templateUrl: 'home/home.html',
                controller: 'home',
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                },
                data: {
                    icon: 'home',
                    ncyBreadcrumbLabel: 'Home'
                }
            });
            $stateProvider.state('home.dashboard', {
                url: '/home',
                views: {
                    profile: {
                        templateUrl: "home/profile/profile.html",
                        controller: 'profile'
                    },
                    organizations: {
                        templateUrl: "organizations/list/list.html",
                        controller: 'organizations-list'
                    },
                    templates: {
                        templateUrl: "templates/list/list.html",
                        controller: 'templates-list'
                    }
                },
                data: {
                    ncyBreadcrumbLabel: 'Dashboard'
                }
            });*/
            $stateProvider.state('organizations', {
                url: '/organizations',
                templateUrl: 'organizations/organizations.html',
                data: {
                    ncyBreadcrumbLabel: 'Organisationer',
                },
                controller: 'organizations',
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                }
            });
            $stateProvider.state('organizations.list', {
                url: '/list',
                templateUrl: 'organizations/list/list.html',
                controller: 'organizations-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste'
                }
            });
            $stateProvider.state('organizations.create', {
                url: '/create',
                templateUrl: 'organizations/create/create.html',
                controller: 'organizations-create',
                data: {
                    ncyBreadcrumbLabel: 'Opret'
                }
            });
            $stateProvider.state('organization', {
                url: '/organizations/:organization',
                templateUrl: 'organization/organization.html',
                controller: 'organization',
                data: {
                    ncyBreadcrumbLabel: '{{organization.name}}',
                    ncyBreadcrumbParent: 'organizations'
                },
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                }
            });

            $stateProvider.state('organization.info', {
                url: '/info',
                templateUrl: 'organization/info/info.html',
                controller: 'organization-info',
                data: {
                    ncyBreadcrumbLabel: 'Info'
                }
            });
            $stateProvider.state('organization.delete', {
                url: '/delete',
                templateUrl: 'organization/delete/delete.html',
                controller: 'organization-delete',
                data: {
                    ncyBreadcrumbLabel: 'Slet'
                }
            });
            $stateProvider.state('organization.apps', {
                url: '/apps',
                templateUrl: 'organization/apps/apps.html',
                controller: 'organization-apps',
                data: {
                    ncyBreadcrumbLabel: 'Apps'
                }
            });

            $stateProvider.state('organization.databases', {
                url: '/databases',
                templateUrl: 'organization/databases/databases.html',
                controller: 'organization-databases',
                data: {
                    ncyBreadcrumbLabel: 'Databaser'
                }
            });
            $stateProvider.state('organization.databases.list', {
                url: '/list',
                templateUrl: 'organization/databases/list/list.html',
                controller: 'databases-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste'
                }
            });
            $stateProvider.state('organization.databases.create', {
                url: '/create',
                templateUrl: 'organization/databases/create/create.html',
                controller: 'databases-create',
                data: {
                    ncyBreadcrumbLabel: 'Opret'
                }
            });
            $stateProvider.state('organization.layouts', {
                url: '/layouts',
                templateUrl: 'organization/layouts/layouts.html',
                controller: 'organization-layouts',
                data: {
                    ncyBreadcrumbLabel: 'Layouts'
                }
            });
            $stateProvider.state('organization.layouts.list', {
                url: '/list',
                templateUrl: 'organization/layouts/list/list.html',
                controller: 'layouts-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste'
                }
            });
            $stateProvider.state('organization.layouts.create', {
                url: '/create',
                templateUrl: 'organization/layouts/create/create.html',
                controller: 'layouts-create',
                data: {
                    ncyBreadcrumbLabel: 'Opret'
                }
            });
            $stateProvider.state('layout', {
                url: '/organizations/:organization/layouts/:layout',
                templateUrl: 'layout/layout.html',
                controller: 'layout',
                data: {
                    ncyBreadcrumbLabel: '{{layout.name}}',
                    ncyBreadcrumbParent: 'organization.layouts'
                },
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    },
                    layout: function ($http, $stateParams, $q) {
                        return $http.get('/api/layout/' + $stateParams.layout);
                    }
                }
            });
            $stateProvider.state('layout.info', {
                url: '/info',
                templateUrl: 'layout/info/info.html',
                controller: 'layout-info',
                data: {
                    ncyBreadcrumbLabel: 'Information'
                },
                resolve: {
                    ticket: 'kfticket'
                }
            });
            $stateProvider.state('layout.delete', {
                url: '/delete',
                templateUrl: 'layout/delete/delete.html',
                controller: 'layout-delete',
                data: {
                    ncyBreadcrumbLabel: 'Slet'
                }
            });

            $stateProvider.state('organization.maps', {
                url: '/maps',
                templateUrl: 'organization/maps/maps.html',
                controller: 'organization-maps',
                data: {
                    ncyBreadcrumbLabel: 'Kort'
                }
            });
            /*$stateProvider.state('organization.maps.show', {
                url: '/show',
                data: {
                    ncyBreadcrumbLabel: 'Vis'
                },
                views: {
                    "edit": {
                        templateUrl: "organization/maps/edit/edit.html",
                        controller: 'maps-edit'
                    },
                    "list": {
                        templateUrl: "organization/maps/list/list.html",
                        controller: 'maps-list'
                    },
                    "map": {
                        templateUrl: "organization/maps/map/map.html",
                        controller: 'maps-map',
                        resolve: {
                            kfticket: function (kfticket) {
                                return kfticket.getTicket();
                            }
                        }
                    },
                    "editView@organization.maps.show": {
                        templateUrl: 'organization/maps/edit/wms/wms.html'
                        //controller: 'edit-xyz'
                    }
                }
            });*/
            $stateProvider.state('organization.maps.list', {
                url: '/list',
                templateUrl: 'organization/maps/list/list.html',
                controller: 'maps-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste'
                }
            });
            $stateProvider.state('organization.maps.edit', {
                url: '/edit',
                templateUrl: 'organization/maps/edit/edit.html',
                controller: 'maps-edit',
                data: {
                    ncyBreadcrumbLabel: 'Rediger'
                },
                resolve: {
                    ticket: 'kfticket'
                }
            });



            $stateProvider.state('organization.maps.edit.xyz', {
                url: '/xyz',
                templateUrl: 'organization/maps/edit/xyz/xyz.html',
                controller: 'edit-xyz',
                data: {
                    ncyBreadcrumbLabel: 'XYZ'
                }
            });

            $stateProvider.state('organization.maps.edit.wms', {
                url: '/wms',
                templateUrl: 'organization/maps/edit/wms/wms.html',
                controller: 'edit-wms',
                data: {
                    ncyBreadcrumbLabel: 'WMS'
                }
            });
            $stateProvider.state('organization.maps.edit.mbtiles', {
                url: '/mbtiles',
                templateUrl: 'organization/maps/edit/mbtiles/mbtiles.html',
                controller: 'edit-mbtiles',
                data: {
                    ncyBreadcrumbLabel: 'MBTiles'
                }
            });
            $stateProvider.state('organization.maps.edit.geojson', {
                url: '/geojson',
                templateUrl: 'organization/maps/edit/geojson/geojson.html',
                controller: 'edit-geojson',
                data: {
                    ncyBreadcrumbLabel: 'GeoJSON'
                }
            });
            $stateProvider.state('database', {
                url: '/organizations/:organization/databases/:database',
                templateUrl: 'database/database.html',
                controller: 'database',
                data: {
                    ncyBreadcrumbLabel: '{{data.database.name}}',
                    ncyBreadcrumbParent: 'organization.databases'
                },
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    },
                    data: function ($http, $stateParams, $q) {
                        var deferred = $q.defer();
                        $http.get('/api/database/' + $stateParams.database).
                        success(function (data, status, headers, config) {
                            deferred.resolve(data);
                        }).
                        error(function (data, status, headers, config) {
                            deferred.reject();
                        });
                        return deferred.promise;
                    }
                }

            });
            $stateProvider.state('database.info', {
                url: '/info',
                templateUrl: 'database/info/info.html',
                controller: 'database-info',
                data: {
                    ncyBreadcrumbLabel: 'Info'
                }
            });
            $stateProvider.state('database.security', {
                url: '/security',
                templateUrl: 'database/security/security.html',
                controller: 'database-security',
                data: {
                    ncyBreadcrumbLabel: 'Sikkerhed'
                }
            });
            $stateProvider.state('database.fulltext', {
                url: '/fulltext',
                templateUrl: 'database/fulltext/fulltext.html',
                controller: 'database-fulltext',
                data: {
                    ncyBreadcrumbLabel: 'Fulltext index'
                }
            });
            $stateProvider.state('database.schema', {
                url: '/schema',
                templateUrl: 'database/schema/schema.html',
                controller: 'database-schema',
                data: {
                    ncyBreadcrumbLabel: 'Skema'
                }
            });
            $stateProvider.state('database.schema.wizard', {
                url: '/wizard',
                templateUrl: 'database/schema/wizard/wizard.html',
                controller: 'schema-wizard',
                data: {
                    ncyBreadcrumbLabel: 'Wizard'
                }
            });
            $stateProvider.state('database.schema.test', {
                url: '/test',
                templateUrl: 'database/schema/test/test.html',
                controller: 'schema-test',
                data: {
                    ncyBreadcrumbLabel: 'Test'
                }
            });
            $stateProvider.state('database.schema.text', {
                url: '/text',
                templateUrl: 'database/schema/text/text.html',
                controller: 'schema-text',
                data: {
                    ncyBreadcrumbLabel: 'Tekst'
                }
            });
            $stateProvider.state('database.schema.desktop', {
                url: '/desktop',
                templateUrl: 'database/schema/desktop/desktop.html',
                controller: 'schema-desktop',
                data: {
                    ncyBreadcrumbLabel: 'Desktop'
                }
            });
            $stateProvider.state('database.schema.mobile', {
                url: '/mobile',
                templateUrl: 'database/schema/mobile/mobile.html',
                controller: 'schema-mobile',
                data: {
                    ncyBreadcrumbLabel: 'Mobile'
                }
            });
            $stateProvider.state('database.data', {
                url: '/data',
                templateUrl: 'database/data/data.html',
                controller: 'database-data',
                data: {
                    ncyBreadcrumbLabel: 'Data'
                }
            });
            $stateProvider.state('database.upload', {
                url: '/upload',
                templateUrl: 'database/upload/upload.html',
                controller: 'database-upload',
                data: {
                    ncyBreadcrumbLabel: 'Upload'
                }
            });
            $stateProvider.state('database.delete', {
                url: '/delete',
                templateUrl: 'database/delete/delete.html',
                controller: 'database-delete',
                data: {
                    ncyBreadcrumbLabel: 'Slet'
                }
            });
            $stateProvider.state('organization.users', {
                url: '/users',
                templateUrl: 'organization/users/users.html',
                controller: 'organization-users',
                data: {
                    ncyBreadcrumbLabel: 'Brugere'
                }
            });
            $stateProvider.state('organization.users.list', {
                url: '/list',
                templateUrl: 'organization/users/list/list.html',
                controller: 'users-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste'
                }
            });
            $stateProvider.state('organization.users.create', {
                url: '/create',
                templateUrl: 'organization/users/create/create.html',
                controller: 'users-create',
                data: {
                    ncyBreadcrumbLabel: 'Opret'
                }
            });
            $stateProvider.state('user', {
                url: '/organizations/:organization/users/:user',
                templateUrl: 'user/user.html',
                controller: 'user',
                data: {
                    ncyBreadcrumbLabel: '{{user.name}}',
                    ncyBreadcrumbParent: 'organization.users'
                },
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                }
            });
            $stateProvider.state('user.info', {
                url: '/info',
                templateUrl: 'user/info/info.html',
                controller: 'user-info',
                data: {
                    ncyBreadcrumbLabel: 'Info'
                }
            });
            $stateProvider.state('user.delete', {
                url: '/delete',
                templateUrl: 'user/delete/delete.html',
                controller: 'user-delete',
                data: {
                    ncyBreadcrumbLabel: 'Delete'
                }
            });
            $stateProvider.state('templates', {
                url: '/templates',
                templateUrl: 'templates/templates.html',
                controller: 'templates',
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                },
                data: {
                    ncyBreadcrumbLabel: 'Templates'
                }

            });
            $stateProvider.state('templates.list', {
                url: '/list',
                templateUrl: 'templates/list/list.html',
                controller: 'templates-list',
                data: {
                    ncyBreadcrumbLabel: 'Liste',
                }
            });
            $stateProvider.state('templates.create', {
                url: '/create',
                templateUrl: 'templates/create/create.html',
                controller: 'templates-create',
                data: {
                    ncyBreadcrumbLabel: 'Opret',
                }
            });
            $stateProvider.state('template', {
                url: '/templates/:template',
                templateUrl: 'template/template.html',
                controller: 'template',
                resolve: {
                    profile: function (auth) {
                        return auth.authorize();
                    }
                },
                data: {
                    ncyBreadcrumbLabel: '{{template.name}}',
                    ncyBreadcrumbParent: 'templates'
                }
            });
            $stateProvider.state('template.info', {
                url: '/info',
                templateUrl: 'template/info/info.html',
                controller: 'template-info',
                data: {
                    ncyBreadcrumbLabel: 'Info',
                }
            });
            $stateProvider.state('template.security', {
                url: '/security',
                templateUrl: 'template/security/security.html',
                controller: 'template-security',
                data: {
                    ncyBreadcrumbLabel: 'Sikkerhed',
                }
            });
            $stateProvider.state('template.delete', {
                url: '/delete',
                templateUrl: 'template/delete/delete.html',
                controller: 'template-delete',
                data: {
                    ncyBreadcrumbLabel: 'Slet',
                }
            });
            $stateProvider.state('verify', {
                url: '/verify/:code',
                templateUrl: 'verify/verify.html',
                controller: 'verify'
            });
                    }
                    ]).run(['$rootScope', '$location', 'auth', '$stateParams', '$state',
    function ($rootScope, $location, auth, $stateParams, $state) {
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;

            /*var states = $state.get();
            var map = {};


            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                var paths = state.name.split('.');
                var map2 = map;
                for (var j = 0; j < paths.length; j++) {
                    var path = paths[j];
                    if (!map2.hasOwnProperty(path)) {
                        map2[path] = {};
                    }
                    map2 = map2[path];
                }
                map2 = state;
            }*/
            /*$rootScope.$on('$stateChangeSuccess',
                function (event, toState, toParams, fromState, fromParams) {
                    console.log(event);
                });*/
            $rootScope.$on('$stateChangeError',
                function (event, toState, toParams, fromState, fromParams, error) {
                    console.log("rejected");
                    $state.go('login');
                });
            $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
                if (toParams && toParams.organization) {
                    $rootScope.organizationId = toParams.organization;
                } else {
                    delete $rootScope.organizationId;
                }
                if (toState.name !== 'login') {
                    $rootScope.lastState = toState.name;
                }
                /*console.log(event);
                event.preventDefault();
                if (toState.name === "login") {
                    $urlRouter.sync();
                }*/
                /*else {
                    
                    auth.authorize(toState).then(function () {
                        //$urlRouter.sync();
                    }, function () {
                        $rootScope.lastState = toState.name;
                        $state.go('login');
                    });
                }*/
            });
}]);
})(this, this.angular, this.console);