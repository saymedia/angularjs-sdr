/*
Copyright (c) 2013 Say Media Ltd

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

(function (angular) {

    // FIXME: For Angular 1.2 we have to depend on ngRoute here to ensure that
    // it loads before us and we can get the ng-view directive but override $route.
    // But if we do that then we'll break 1.0 where the route stuff is part of 'ng'.
    // We'll stick with 1.0 compatibility for now but expect to switch to 1.2-only pretty
    // soon.
    var sdr = angular.module('sdr', []);

    sdr.provider(
        '$route',
        function () {
            var routes = {};
            var sdrPrefix = '/:';

            this.when = function (path, route) {
                routes[path] = angular.extend(
                    {
                        reloadOnSearch: true,
                        originalPath: path
                    },
                    route
                );

                if (path) {
                    var redirectPath = (path[path.length-1] == '/')
                        ? path.substr(0, path.length-1)
                        : path +'/';

                    routes[redirectPath] = {
                        redirectTo: path,
                        originalPath: redirectPath
                    };
                };

                return this;
            };

            this.otherwise = function (params) {
                this.when(null, params);
                return this;
            };

            this.setSdrPrefix = function (prefix) {
                sdrPrefix = prefix;
            };

            this.$get = function ($rootScope, $location, $window, $injector, $q, $routeParams, $http) {

                var $route = {};

                function updateRoute() {
                    var last = $route.current;

                    // In the normal client-defined case we'd be able to find the route
                    // synchronously, but since we have to ask the server for this one
                    // we have to emit the $routeChangeStart event before we actually
                    // know the route, so any listener to that event had better be
                    // prepared to accept an empty route here.
                    var next = {};
                    $rootScope.$broadcast('$routeChangeStart', next, last);
                    $route.current = next;

                    function completeRouteChange(serverRoute) {
                        var path = serverRoute.path;
                        var clientRoute = routes[path];
                        next.controller = serverRoute.controller;
                        next.template = serverRoute.template;
                        next.pathParams = serverRoute.pathParams;
                        next.params = angular.copy(next.pathParams);
                        next.locals = serverRoute.locals;
                        next.locals.$template = next.template;
                        next.$$route = clientRoute;
                        var resolveKey;
                        if (serverRoute.localServices) {
                            for (resolveKey in serverRoute.localServices) {
                                next.locals[resolveKey] = $injector.get(
                                    serverRoute.localServices[resolveKey]
                                );
                            }
                        }
                        if (clientRoute && clientRoute.resolve) {
                            for (resolveKey in clientRoute.resolve) {
                                if (next.locals[resolveKey] === undefined) {
                                    next.locals[resolveKey] = (
                                        locals[key] = angular.isString(value) ?
                                            $injector.get(value) :
                                            $injector.invoke(value)
                                    );
                                }
                            }
                        }

                        $q.all(next.locals).then(
                            function () {
                                if (next == $route.current) {
                                    if (next) {
                                        angular.copy(next.params, $routeParams);
                                    }
                                    $rootScope.$broadcast('$routeChangeSuccess', next, last);
                                }
                            }
                        );
                    }

                    // if we're rendering the result of an HTML snapshot response then
                    // the server will have told us what route to use already.
                    if ($window.initialRoute) {
                        var initialRoute = window.initialRoute;
                        $window.setTimeout(
                            function () {
                                completeRouteChange(initialRoute);
                            },
                            1
                        );
                        // make sure we don't try to use this again next time
                        $window.initialRoute = undefined;
                    }
                    else {
                        var apiUrl = sdrPrefix + $location.path() + $window.location.search;

                        $http.get(apiUrl).then(
                            function (response) {
                                var data = response.data;
                                completeRouteChange(data.route);
                            }
                        );
                    }
                }

                $rootScope.$on('$locationChangeSuccess', updateRoute);

                return $route;

            };
        }
    );
})(angular);
