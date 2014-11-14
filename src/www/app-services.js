(function (window, angular, console) {

    'use strict';

    /* Services */


    // Demonstrate how to register services
    // In this case it is a simple value service.
    angular.module('myApp.services', []).value('version', '0.1').factory('admin', ['$rootScope',
        function ($rootScope) {
            return {
                allowed: function (menu) {
                    if ($rootScope.user.roles.indexOf('sys') === -1 && menu === "delete") {
                        return false;
                    }
                    return true;
                }
            };
        }
    ]).factory('auth', ['$q', '$http', 'md5', '$rootScope',
        function ($q, $http, md5, $rootScope) {
            $rootScope.profile = null;
            var avatar = function (user, $route) {
                $rootScope.profile = {
                    user: user,
                    hash: md5.createHash(user.name)
                };
                checkOrganization();
                $http.jsonp("http://www.gravatar.com/" + $rootScope.profile.hash + ".json?callback=JSON_CALLBACK").
                success(function (data, status, headers, config) {
                    if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                        $rootScope.profile.gravatar = data.entry[0].name.formatted;
                    }
                }).
                error(function (data, status, headers, config) {
                    $rootScope.profile.gravatar = "";
                });
            };
            var checkOrganization = function () {
                $rootScope.admin = $rootScope.profile.user.roles.indexOf('sys') !== -1;
                if ($rootScope.organizationId) {
                    for (var i = 0; i < $rootScope.profile.user.organizations.length; i++) {
                        var organization = $rootScope.profile.user.organizations[i];
                        if (organization.id === $rootScope.organizationId) {
                            $rootScope.organization = organization;
                            $rootScope.admin = $rootScope.profile.user.roles.indexOf('sys') !== -1 || $rootScope.profile.user.roles.indexOf('admin_' + organization.id) !== -1;
                            break;
                        }
                    }
                }
            };
            return {
                getUser: function () {
                    var deferred = $q.defer();
                    if ($rootScope.profile) {
                        checkOrganization();
                        return true;
                    } else {
                        $http.get("/api/session").
                        success(function (data, status, headers, config) {
                            console.log(data);
                            avatar(data.user);
                            deferred.resolve();
                        }).
                        error(function (data, status, headers, config) {
                            deferred.reject();
                        });
                    }
                    return deferred.promise;
                },
                setUser: function (data) {
                    avatar(data);
                },
                authorize: function () {
                    var deferred = $q.defer();
                    /**if ($rootScope.profile) {
                        checkOrganization();
                        window.setTimeout(function () {
                            deferred.resolve();
                        }, 0);
                    } else {*/
                        $http.get("/api/session").
                        success(function (data, status, headers, config) {
                            console.log(data);
                            avatar(data.user);
                            deferred.resolve();
                        }).
                        error(function (data, status, headers, config) {
                            deferred.reject();
                        });
                    //}
                    return deferred.promise;
                }
            };
        }]);
})(this, this.angular, this.console);