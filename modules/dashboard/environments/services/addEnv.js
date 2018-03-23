"use strict";
var dbServices = soajsApp.components;
dbServices.service('addEnv', ['ngDataApi', '$timeout', '$cookies', '$localStorage', 'Upload', function (ngDataApi, $timeout, $cookies, $localStorage, Upload) {
	
	function createEnvironment(currentScope, cb) {
		let data = currentScope.wizard.gi;
		data.deploy = currentScope.wizard.deploy;
		
		if (currentScope.portalDeployment) {
			data.deployPortal = true;
		}
		
		let template = angular.copy(currentScope.wizard);
		if(currentScope.wizard.gi.code == 'PORTAL'){
			currentScope.wizard.user = {
				username: currentScope.wizard.gi.username,
				password: currentScope.wizard.gi.password,
				email: currentScope.wizard.gi.email
			};
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/environment/add',
			data: {
				data: data,
				template: template
			}
		}, (error, response) => {
			if (response) {
				currentScope.envId = response.data;
			}
			return cb(error, response);
		});
	}
	
	function checkDeploymentStatus(currentScope, params, cb) {
		let opts = {
			method: 'get',
			routeName: '/dashboard/environment/status',
			params: {
				code: currentScope.wizard.gi.code.toUpperCase()
			}
		};
		if(params) {
			for(let i in params){
				opts.params[i] = params[i];
			}
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, cb);
	}
	
	function getPermissions(currentScope, cb) {
		var options = {
			"method": "get",
			"routeName": "/dashboard/environment/list",
			"params": {}
		};
		getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				$localStorage.environments = response;
				response.forEach(function (oneEnv) {
					if (oneEnv.code.toLowerCase() === currentScope.wizard.gi.code.toLowerCase()) {
						currentScope.$parent.currentDeployer.type = oneEnv.deployer.type;
						
						var data = {
							"_id": oneEnv._id,
							"code": oneEnv.code,
							"sensitive": oneEnv.sensitive,
							"domain": oneEnv.domain,
							"profile": oneEnv.profile,
							"sitePrefix": oneEnv.sitePrefix,
							"apiPrefix": oneEnv.apiPrefix,
							"description": oneEnv.description,
							"deployer": oneEnv.deployer
						};
						for(let container in data.deployer.container){
							for(let driver in data.deployer.container[container]){
								if(data.deployer.container[container][driver].auth && data.deployer.container[container][driver].auth.token){
									delete data.deployer.container[container][driver].auth.token;
								}
							}
						}
						$cookies.putObject('myEnv', data, {'domain': interfaceDomain});
					}
				});
				return cb();
			}
		});
	}
	
	function removeEnvironment(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/delete",
			"params": {"id": currentScope.envId, "force": true}
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			return cb();
		});
	}
	
	function listServers(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources/list',
			params: {
				env: currentScope.wizard.gi.code.toUpperCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				let servers = [];
				response.forEach((oneResource) => {
					if (oneResource.type === 'cluster' && oneResource.category === 'mongo' && oneResource.plugged && oneResource.shared && (!oneResource.sharedEnvs || oneResource.sharedEnvs[currentScope.wizard.gi.code.toUpperCase()])) {
						servers.push(oneResource);
					}
				});
				
				return cb(servers);
			}
		});
	}
	
	return {
		'createEnvironment': createEnvironment,
		
		'checkDeploymentStatus': checkDeploymentStatus,
		
		'getPermissions': getPermissions,
		
		'removeEnvironment': removeEnvironment,
		
		'listServers': listServers
	};
	
}]);
