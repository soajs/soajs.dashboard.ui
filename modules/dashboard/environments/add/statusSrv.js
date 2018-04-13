"use strict";
var statusServices = soajsApp.components;
statusServices.service('statusSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$compile', '$cookies', function (ngDataApi, $timeout, $modal, $localStorage, $compile, $cookies) {
	
	function addEnvironment(currentScope){
		currentScope.statusType = "info";
		currentScope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
		currentScope.showProgress = false;
		
		let options = {
			method: 'post',
			routeName: '/dashboard/environment/add',
			data: {
				data: currentScope.overview.data,
				template: currentScope.overview.template
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, options, (error, response) => {
			if(error){
				currentScope.displayAlert('danger', error.message);
				currentScope.form.actions = renderButtonDisplay(currentScope, 3);
			}
			else{
				currentScope.envId = response.data;
				console.log(currentScope.envId);
				//call check status
				checkEnvironmentStatus(currentScope, null, (error) => {
					if (error) {
						currentScope.displayAlert('danger', error);
						currentScope.form.actions = renderButtonDisplay(currentScope, 3);
					}
				});
			}
		});
	}
	
	function checkDeploymentStatus(currentScope, params, cb) {
		let opts = {
			method: 'get',
			routeName: '/dashboard/environment/status',
			params: {
				code: currentScope.overview.data.code.toUpperCase()
			}
		};
		if(params) {
			for(let i in params){
				opts.params[i] = params[i];
			}
		}
		getSendDataFromServer(currentScope, ngDataApi, opts, cb);
	}
	
	function checkEnvironmentStatus(currentScope, params, cb){
		currentScope.showProgress = true;
		
		let autoRefreshTimeoutProgress = $timeout(() => {
			checkDeploymentStatus(currentScope, params, (error, response) => {
				if (error) {
					currentScope.showProgress = false;
					return cb(error);
				}
				else {
					delete response.soajsauth;
					
					if (response.error) {
						currentScope.progressCounter = 0;
						return cb(response.error);
					}
					else {
						currentScope.response = response;
						
						for(let step in currentScope.response){
							if(step.indexOf(".") !== -1){
								let path = step.split(".");
								
								let child = path[path.length -1];
								path.pop();
								
								let parent = path[path.length -1];
								
								if(!currentScope.response[parent]){
									currentScope.response[parent] = {
										multi: true,
										children: []
									};
								}
								
								currentScope.response[parent].children.push({
									child: child,
									data: angular.copy(currentScope.response[step])
								});
								delete currentScope.response[step];
							}
						}
						
						//only triggered on refresh and if all is working
						if(response.completed){
							currentScope.showProgress = true;
							currentScope.statusType = "success";
							currentScope.statusMsg = "Your environment has been deployed.";
							currentScope.form.actions = renderButtonDisplay(currentScope, 2);
						}
						else {
							checkEnvironmentStatus(currentScope, params, cb);
						}
					}
				}
			});
		}, 5000);
		
		currentScope.$on("$destroy", function () {
			$timeout.cancel(autoRefreshTimeoutProgress);
		});
	}
	
	function rollbackEnvironment(currentScope, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/delete",
			"params": {"code": currentScope.overview.data.code.toUpperCase(), "force": true}
		}, function (error) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			return cb();
		});
	}
	
	function finalResponse(currentScope) {
		function getPermissions(cb) {
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
		
		getPermissions(() => {
			delete $localStorage.addEnv;
			currentScope.form.formData = {};
			delete currentScope.wizard;
			currentScope.displayAlert('success', "Environment Created");
			$timeout(function () {
				currentScope.$parent.go("#/environments");
			}, 1000);
		});
	}
	
	function renderButtonDisplay(currentScope, type){
		//default
		
		let actions = [
			{
				'type': 'button',
				'label': "Back",
				'btn': 'success',
				'action': function () {
					currentScope.form.formData = {};
					//got back to last step !
					currentScope.previousStep();
				}
			},
			{
				'type': 'submit',
				'label': "Create Environment",
				'btn': 'primary',
				'action': function (formData) {
					currentScope.showProgress = true;
					addEnvironment(currentScope);
				}
			},
			{
				'type': 'reset',
				'label': translation.cancel[LANG],
				'btn': 'danger',
				'action': function () {
					delete $localStorage.addEnv;
					currentScope.form.formData = {};
					currentScope.remoteCertificates = {};
					delete currentScope.wizard;
					currentScope.$parent.go("/environments");
				}
			}
		];
		
		//if all ok
		if (type === 2) {
			actions = [
				{
					'type': 'submit',
					'label': "Finalize & Proceed",
					'btn': 'primary',
					'action': function () {
						currentScope.showProgress = true;
						currentScope.status = {};
						finalResponse(currentScope);
					}
				}
			];
		}
		
		// if error during deployment
		if (type === 3) {
			actions = [
				{
					'type': 'submit',
					'label': "Keep What was created & Finalize",
					'btn': 'primary',
					'action': function () {
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "get",
							"routeName": "/dashboard/environment/status",
							"params": {"code": currentScope.wizard.gi.code.toUpperCase(), 'activate': true}
						}, function (error) {
							overlayLoading.hide();
							if (error) {
								currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
							}
							else {
								currentScope.showProgress = true;
								currentScope.status = {};
								finalResponse(currentScope);
							}
						});
					}
				},
				{
					'type': 'submit',
					'label': "Remove Everything",
					'btn': 'danger',
					'action': function () {
						overlayLoading.show();
						checkDeploymentStatus(currentScope, {rollback: 0}, (error, response) => {
							if (error) {
								overlayLoading.hide();
								currentScope.displayAlert("danger", error.message);
							}
							
							rollbackEnvironment(currentScope, (error) => {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error.message);
								}
								else {
									currentScope.status = {};
									currentScope.displayAlert("success", "Environment Deployment has been reverted.");
									currentScope.previousStep();
								}
							});
							
						});
					}
				}
			];
		}
		
		return actions;
	}
	
	function mapUserInputsToOverview(currentScope) {
		return currentScope.mapUserInputsToOverview();
	}
	
	function go(currentScope){
		/**
		 * automatically make call to environment/add
		 *
		 * upon response
		 *
		 *  if error
		 *      display error with buttons style 2
		 *
		 *  else
		 *
		 *      call check status
		 *
		 *          if error
		 *              display error with buttons style 2
		 *
		 *          else
		 *
		 *              if done
		 *                  display error with buttons style 3
		 *
		 *              else
		 *                  wait 5 seconds then
		 *                  call check status again
		 *
		 */
		if(!currentScope.form){
			currentScope.form = {};
			buildForm(currentScope, null, {
				timeout: $timeout,
				entries: [],
				name: 'addEnvironment',
				actions: []
			});
		}
		currentScope.statusType = "info";
		currentScope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
		currentScope.showProgress = true;

		console.log(currentScope.environmentId);
		//only available if an error or pending or refresh were triggered
		if(currentScope.environmentId){
			currentScope.overview = mapUserInputsToOverview(currentScope);
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/environment',
				params: {
					id: currentScope.environmentId
				}
			}, function (error, pendingEnvironment) {
				overlayLoading.hide();
				console.log(error, pendingEnvironment);
				if(error){
					addEnvironment(currentScope);
				}
				else if(pendingEnvironment){
					currentScope.envId = currentScope.environmentId;

					//call check status
					checkEnvironmentStatus(currentScope, null, (error) => {
						if (error) {
							currentScope.displayAlert('danger', error);
							currentScope.form.actions = renderButtonDisplay(currentScope, 3);
						}
					});
				}
				else{
					delete currentScope.environmentId;
				}
			});
		}
		else{
			addEnvironment(currentScope);
		}
	}
	
	return {
		"go": go
	}
	
}]);