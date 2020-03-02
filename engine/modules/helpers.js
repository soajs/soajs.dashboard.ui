"use strict";

/**
 * build the access permissions of a module from permissionsObj
 */
function constructModulePermissions(scope, access, permissionsObj, forceEnv) {
	var exclude = ['urac', 'dashboard'];
	for (var permission in permissionsObj) {
		if (Array.isArray(permissionsObj[permission])) {
			var env;
			if (forceEnv) {
				env = forceEnv;
			}
			else {
				env = 'dashboard';
				if (exclude.indexOf(permissionsObj[permission][0]) === -1) {
					if (scope.$parent.currentSelectedEnvironment) {
						env = scope.$parent.currentSelectedEnvironment.toLowerCase();
					}
				}
			}
			
			env = env.toLowerCase();
			scope.buildPermittedEnvOperation(permissionsObj[permission][0], permissionsObj[permission][1], permissionsObj[permission][2], env, function (hasAccess) {
				access[permission] = hasAccess;
				if (!scope.$$phase) {
					scope.$apply();
				}
			});
		}
		else if (typeof(permissionsObj[permission]) === 'object') {
			access[permission] = {};
			constructModulePermissions(scope, access[permission], permissionsObj[permission], forceEnv);
		}
	}
}

/*
 common function calls ngDataAPI angular service to connect and send/get data to api
 */
function getSendDataFromServer($scope, ngDataApi, options, callback) {
	var apiOptions = {
		url: (options.url) ? options.url + options.routeName : apiConfiguration.domain + options.routeName,
		headers: {
			'Content-Type': 'application/json'
		}
	};
	
	var pathParams = options.routeName.split("/");
	var exclude = ['urac', 'dashboard', 'oauth', 'repositories', 'key', 'multitenant', 'proxy'];
	if (exclude.indexOf(pathParams[1]) !== -1) {
		if (options.proxy && $scope.checkAuthEnvCookie()) {
			apiOptions.url = (options.url) ? options.url + "/soajs/proxy" : apiConfiguration.domain + "/soajs/proxy";
			apiOptions.url += "?proxyRoute=" + encodeURIComponent(options.routeName);
			apiOptions.proxy = true;
		}
	}
	else if ($scope.checkAuthEnvCookie()) {
		apiOptions.url = (options.url) ? options.url + "/soajs/proxy" : apiConfiguration.domain + "/soajs/proxy";
		//apiOptions.url += "?proxyRoute=" + encodeURIComponent(options.routeName);
		//apiOptions.proxy = true;
	}
	
	if (Object.hasOwnProperty.call(options, 'token')) {
		apiOptions.token = options.token;
	}
	else {
		apiOptions.token = true;
	}
	
	if (options.jsonp) {
		apiOptions.jsonp = true;
	}
	
	if (options.params) {
		apiOptions.params = options.params;
	}
	
	if (options.data) {
		apiOptions.data = options.data;
	}
	
	if (options.method) {
		apiOptions.method = options.method;
	}
	
	if (options.responseType) {
		apiOptions.responseType = options.responseType;
	}
	
	if (options.upload) {
		apiOptions.upload = options.upload;
		if (options.file) {
			apiOptions.file = options.file;
		}
	}
	
	if (options.headers) {
		for (var i in options.headers) {
			if (options.headers.hasOwnProperty(i)) {
				if (options.headers[i] === null) {
					delete apiOptions.headers[i];
				}
				else {
					apiOptions.headers[i] = options.headers[i];
				}
			}
		}
	}
	
	ngDataApi[options.method]($scope, apiOptions, callback);
}

function redirectToLogin(scope) {
	scope.enableInterface = false;
	scope.go("/login");
}