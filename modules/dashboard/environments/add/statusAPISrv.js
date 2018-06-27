"use strict";
var statusServices = soajsApp.components;
statusServices.service('statusAPISrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$compile', '$cookies', function (ngDataApi, $timeout, $modal, $localStorage, $compile, $cookies) {
	
	function displayStickError(currentScope, error){
		currentScope.statusType = "danger";
		currentScope.statusMsg = error.message;
	}
	
	function addEnvironment(currentScope){
		currentScope.statusType = "info";
		currentScope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
		currentScope.showProgress = true;
		currentScope.response = {};
		
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
				displayStickError(currentScope, error);
				currentScope.form.actions = renderButtonDisplay(currentScope, 3);
			}
			else{
				currentScope.envId = response.data;
				//call check status
				checkEnvironmentStatus(currentScope, null, (error) => {
					if (error) {
						displayStickError(currentScope, error);
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
					return cb(error);
				}
				else {
					delete response.soajsauth;
					
					currentScope.response = response;
					for(let step in currentScope.response){
						if(step.indexOf(".") !== -1){
							let path = step.split(".");
							
							let child = path[path.length -1];
							path.pop();
							
							let parent = path[path.length -1];
							
							if(step.includes("infra.vms.deploy")){
								child = "Deploying Virtual Machine Layer " + child;
							}
							
							if(!currentScope.response[parent]){
								currentScope.response[parent] = {
									multi: true,
									children: []
								};
							}
							
							if (currentScope.response[step].data && currentScope.response[step].data.length > 0) {
								let finalData = {};
								currentScope.response[step].data.forEach((oneData) => {
									for(let s in oneData){
										finalData[s] = oneData[s];
										if (child === 'dns' && s === 'dns' && finalData[s].msg) {
											finalData[s].msg = finalData[s].msg.replace("%domain%", currentScope.wizard.nginx.domain.toLowerCase());
										}
									}
								});
								currentScope.response[step].data = [finalData];
							}
							
							currentScope.response[parent].children.push({
								child: child,
								data: angular.copy(currentScope.response[step])
							});
							delete currentScope.response[step];
						}
					}
					
					if (response.error) {
						return cb(response.error);
					}
					else {
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
		}, 15000);
		
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
			delete currentScope.environmentId;
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
					displayStickError(currentScope, error);
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
								displayStickError(currentScope, error);
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
						checkDeploymentStatus(currentScope, {rollback: 1}, (error, response) => {
							if (error) {
								overlayLoading.hide();
								displayStickError(currentScope, error);
							}
							
							rollbackEnvironment(currentScope, (error) => {
								overlayLoading.hide();
								if (error) {
									displayStickError(currentScope, error);
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
		return currentScope.mapUserInputsToOverview(false);
	}
	
	function go(currentScope){
		currentScope.addEnvCounter = currentScope.steps.length -1;
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
		currentScope.form.actions = [];
		currentScope.statusType = "info";
		currentScope.statusMsg = "Deploying your environment might take a few minutes to finish, please be patient, progress logs will display soon.";
		currentScope.showProgress = true;
		
		//only available if an error or pending or refresh were triggered
		if(currentScope.environmentId){
			currentScope.overview = mapUserInputsToOverview(currentScope);
			currentScope.envId = currentScope.environmentId;
			
			//resume deployment
			checkDeploymentStatus(currentScope, {'resume': true}, (error) => {
				if (error) {
					displayStickError(currentScope, error);
					currentScope.form.actions = renderButtonDisplay(currentScope, 3);
				}
				else{
					//print status
					checkEnvironmentStatus(currentScope, null, (error) => {
						if (error) {
							displayStickError(currentScope, error);
							currentScope.form.actions = renderButtonDisplay(currentScope, 3);
						}
					});
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