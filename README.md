angularjs-sdr
=============

This is an alternative implementation of the AngularJS `$route` service that resolves routes via a server. It stands for "Server-Defined Routes".

When this module is loaded, any nagivation will cause a single request to the server with the request URL, and the server is expected to return
a description of the matching route including the name of its controller, its template, and its 'locals' that will get injected into the
controller.

One way to use this is to combine it with [angularjs-server](https://github.com/saymedia/angularjs-server) to execute route resolve steps
on the server rather than the client and potentially reduce the number of round-trips necessary to render a page.

This module is **experimental** and has not yet been deployed in any production application. It has, however, been deployed in a prototype
capacity and is believed to work correctly for most common `$route` use-cases.


