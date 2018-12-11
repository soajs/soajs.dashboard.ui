"use strict";
var hostsServices = soajsApp.components;
hostsServices.service('envHosts', ['ngDataApi', '$timeout', '$modal', '$compile', function (ngDataApi, $timeout, $modal, $compile) {

	function getEnvironment(currentScope, envCode, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment",
			"params":{
				"code": envCode
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				currentScope.myEnvironment = response;
				return cb();
			}
		});
	}
	
	function listHosts(currentScope, env, noPopulate) {
		let controllers = [];
		var servicesList = [];
		var daemonsList = [];
		let controllerCount = 0;
		let latestTs =0;
		let awarenessResponse = {};
		
		currentScope.showCtrlHosts = true;
		currentScope.hostList = [];
		currentScope.hosts = [];
		if (currentScope.access.listHosts) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/list",
				"params": {
					"env": env
				}
			}, function (error, result) {
				if (error || !result) {
					currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
				}
				else {
					getMaintenanceObj(result, (err, response) => {
						if (err) {
							currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
						}
						currentScope.profile = response.profile;
						currentScope.deployer = response.deployer;
						currentScope.hostList = response.hosts;
						if (response.hosts && response.hosts.length > 0) {
							currentScope.hosts = {
								'controller': {
									'color': 'red',
									'heartbeat': false,
									'port': currentScope.myEnvironment.services.config.ports.controller,
									'ips': []
								}
							};
							for (var j = 0; j < response.hosts.length; j++) {
								if (response.hosts[j].name === 'controller') {
									var info = {
										'name': 'controller',
										'hostname': response.hosts[j].hostname,
										'ip': response.hosts[j].ip,
										'cid': response.hosts[j].cid,
										'version': response.hosts[j].version,
										'color': 'red',
										'port': currentScope.myEnvironment.services.config.ports.controller,
										'type': 'service',
										'maintenance': response.hosts[j].maintenance
									};
									if (response.hosts[j].src && response.hosts[j].src.branch) {
										info.branch = response.hosts[j].src.branch;
									}
									controllers.push(info);
								}
							}
							if (controllers.length > 0) {
								controllers.forEach(function (oneController) {
									getControllerAwarenessFromDB(oneController);
									currentScope.hosts.controller.ips.push(oneController);
								});
								
							} else {
								delete currentScope.hosts.controller;
							}
						}
					});
				}
			});
		}
		function getMaintenanceObj(response, cb){
			let serviceNames = [];
			if (response && response.hosts) {
				response.hosts.forEach((service) => {
					serviceNames.push(service.name);
				});
				getSendDataFromServer(currentScope, ngDataApi, {
					"method": "post",
					"routeName": "/dashboard/services/list",
					"params": {
						"includeEnvs": false,
						"serviceNames": serviceNames
					}
				}, function (error, result) {
					if (result && result.records && result.records.length > 0) {
						for (let i = 0; i < response.hosts.length; i++) {
							for (let j = 0; j < result.records.length; j++) {
								if (response.hosts[i].name === 'controller' && result.records[j] && response.hosts[i].name === result.records[j].name) {
									response.hosts[i].maintenance = extractMaintenanceInfo(result.records[j].maintenance);
									break;
								}
							}
						}
					}
					return cb(null, response)
				});
			} else {
				return cb(null, response)
			}
		}
		function extractMaintenanceInfo(maintenance){
			if (!maintenance){
				return [];
			}
			let mainArray = [];
			if (readiness && maintenance.readiness === "/heartbeat"){
				mainArray.push({
					icon: iconsAllowed.heartbeat,
					title: translation.executeHeartbeatOperation[LANG],
					action: function (envCode, oneIp){
						showDialogBox (currentScope, envCode, oneIp.name, oneIp.version, maintenance.readiness.replace(/\//, ""));
					}
				});
			}
			if (maintenance.commands) {
				maintenance.commands.forEach((onCom) => {
					if (onCom){
						if (onCom.path && onCom.icon && iconsAllowed[onCom.icon]){
							mainArray.push({
								icon: iconsAllowed[onCom.icon],
								title: onCom.label,
								action: function (envCode, oneIp){
									showDialogBox (currentScope, envCode, oneIp.name, oneIp.version, onCom.path.replace(/\//, ""));
								}
							});
						}
					}
				})
			}
			return mainArray
		}
		
		function updateParent() {
			var color = 'red';
			var healthy = false;
			var count = 0;
			currentScope.hosts.controller.ips.forEach(function (oneHost) {
				if (oneHost.heartbeat) {
					count++;
				}
			});
			
			if (count === currentScope.hosts.controller.ips.length) {
				color = 'green';
				healthy = true;
			}
			else if (count > 0) {
				healthy = true;
				color = 'yellow';
			}
			
			currentScope.hosts.controller.color = color;
			currentScope.hosts.controller.healthy = healthy;
		}

		function getControllerAwarenessFromDB(defaultControllerHost) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/awareness",
				"params": {
					"env": env.toLowerCase()
				}
			}, function (error, response) {
				if (error) {
					currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
				}
				else {
					controllerCount++;
					defaultControllerHost.heartbeat = true;
					for(let i =0; i < response.length; i++){
						let oneAwareness = response[i];
						if(oneAwareness.ip === defaultControllerHost.ip){
							let dottedIP = defaultControllerHost.ip.replace(/\./g,'_dot_');
							if(oneAwareness.data.services.controller.awarenessStats && !oneAwareness.data.services.controller.awarenessStats[dottedIP].healthy){
								defaultControllerHost.heartbeat = false;
								continue;
							}
						}
					}
					
					if(defaultControllerHost.heartbeat){
						defaultControllerHost.color = 'green';
						response.forEach((oneAwareness) => {
							if(oneAwareness.ip === defaultControllerHost.ip && oneAwareness.ts > latestTs){
								latestTs = oneAwareness.ts;
								awarenessResponse = oneAwareness;
							}
						});
					}
					else{
						defaultControllerHost.color = 'red';
					}
					
					
					if(controllerCount === controllers.length){
						updateParent();
						printServices();
					}
				}
			});
		}
		
		function printServices(){
			if(awarenessResponse.data && awarenessResponse.data.services) {
				servicesList = Object.keys(awarenessResponse.data.services);
				for (let oneService in servicesList) {
					for (let as1 in awarenessResponse.data.services[servicesList[oneService]].awarenessStats) {
						let as2 = as1.replace(/_dot_/g, ".");
						awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as2] = angular.copy(awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as1]);
						delete awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as1];
					}
				}
			}
			
			if(awarenessResponse.data && awarenessResponse.data.daemons){
				daemonsList = Object.keys(awarenessResponse.data.daemons);
				for (let oneDaemon in daemonsList) {
					
					for (let as1 in awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats) {
						let as2 = as1.replace(/_dot_/g, ".");
						awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as2] = angular.copy(awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as1]);
						delete awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as1];
					}
				}
			}
			
			if(awarenessResponse.data && (awarenessResponse.data.services || awarenessResponse.data.daemons)){
				var list = {};
				servicesList.forEach(function (sKey) {
					list[sKey] = awarenessResponse.data.services[sKey];
					list[sKey].type = "service";
				});
				daemonsList.forEach(function (dKey) {
					list[dKey] = awarenessResponse.data.daemons[dKey];
					list[dKey].type = "daemon";
				});
				propulateServices(list);
			}
		}
		
		function buildGroupsDisplay(renderedHosts) {
			currentScope.groups = {};
			for (var hostName in renderedHosts) {
				if (!renderedHosts[hostName].group || renderedHosts[hostName].group === "service" || renderedHosts[hostName].group === "daemon" || renderedHosts[hostName].group === "") {
					renderedHosts[hostName].group = "Misc. Services/Daemons";
				}
				if (currentScope.groups[renderedHosts[hostName].group]) {
					currentScope.groups[renderedHosts[hostName].group].services.push(hostName);
				} else {
					currentScope.groups[renderedHosts[hostName].group] = {
						services: [],
						showContent: true
					};
					currentScope.groups[renderedHosts[hostName].group].services.push(hostName);
				}
			}
		}
		
		function propulateServices(regServices) {
			var renderedHosts = {};
			var services = Object.keys(regServices);
			services.forEach(function (serviceName) {
				var oneService = regServices[serviceName];

				if (oneService.hosts) {
					for (var version in oneService.hosts) {
						//oneService.hosts = oneService.hosts[oneService.hosts.latest];
						if (Array.isArray(oneService.hosts[version]) && oneService.hosts[version].length > 0) {
							if (serviceName !== 'controller') {
								if (!renderedHosts[serviceName]) {
									renderedHosts[serviceName] = {
										'name': serviceName,
										'port': regServices[serviceName].port,
										'group': regServices[serviceName].group,
										'ips': {},
										'color': 'red',
										'healthy': false,
										'type': regServices[serviceName].type
									};
								}
								renderedHosts[serviceName].ips[version] = [];
							}
							
							let hostsCount = 0;
							regServices[serviceName].hosts[version].forEach(function (oneHostIP) {
								if (serviceName !== 'controller') {
									var oneHost = {
										'controllers': controllers,
										'ip': oneHostIP,
										'name': serviceName,
										'healthy': false,
										'color': 'red',
										'downCount': 'N/A',
										'downSince': 'N/A',
										'port': regServices[serviceName].port,
										'type': regServices[serviceName].type,
										'version': version,
										'maintenance': extractMaintenanceInfo(regServices[serviceName].maintenance)
									};

									currentScope.hostList.forEach(function (origHostRec) {
										if (origHostRec.name === oneHost.name && origHostRec.ip === oneHost.ip) {
											oneHost.hostname = origHostRec.hostname;
											oneHost.cid = origHostRec.cid;
											if (origHostRec.src) {
												oneHost.commit = origHostRec.src.commit;
												oneHost.branch = origHostRec.src.branch;
											}
											if (origHostRec.grpConfName) {
												oneHost.grpConfName = origHostRec.grpConfName;
											}
										}
									});
									if (oneHost.hostname && oneHost.ip) {
										renderedHosts[serviceName].ips[version].push(oneHost);
									}
									
									for(let serviceCtrl in regServices[serviceName].awarenessStats){
										if(parseInt(regServices[serviceName].awarenessStats[serviceCtrl].version) === parseInt(version)){
											if(!regServices[serviceName].awarenessStats[serviceCtrl].healthy){
												oneHost.color= "red";
												oneHost.healthy = false;
												oneHost.downCount = regServices[serviceName].awarenessStats[oneHostIP].downCount;
												oneHost.downSince = regServices[serviceName].awarenessStats[oneHostIP].downSince;
											}
										}
									}
									
									if((!oneHost.downCount || oneHost.downCount === 'N/A' ) && (!oneHost.downSince || oneHost.downSince === 'N/A')){
										oneHost.color= "green";
										oneHost.healthy = true;
										hostsCount++;
									}
									else{
										oneHost.downSince = new Date(oneHost.downSince).toISOString();
									}
									
									if(hostsCount >= regServices[serviceName].hosts[version].length){
										renderedHosts[serviceName].color = 'green';
										renderedHosts[serviceName].healthy = true;
									}
									else if(hostsCount > 0 && hostsCount < regServices[serviceName].hosts[version].length){
										renderedHosts[serviceName].color = 'yellow';
										renderedHosts[serviceName].healthy = true;
									}
									else{
										renderedHosts[serviceName].color = 'red';
										renderedHosts[serviceName].healthy = false;
									}
								}
							});
						}
					}
				}
			});

			if (Object.keys(renderedHosts).length > 0) {
				for (var sN in renderedHosts) {
					currentScope.hosts[sN] = renderedHosts[sN];
				}
			}
			buildGroupsDisplay(renderedHosts);
		}
	}

	function executeHeartbeatTest(currentScope, env, oneHost) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'heartbeat');
	}

	function executeAwarenessTest(currentScope, env, oneHost) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'awarenessStat');
	}

	//ok from down here
	function reloadRegistry(currentScope, env, oneHost, cb) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'reloadRegistry');
	}

	function loadProvisioning(currentScope, env, oneHost) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'loadProvision');
	}

	function loadDaemonStats(currentScope, env, oneHost) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'daemonStats');
	}
	
	function loadDaemonGroupConfig(currentScope, env, oneHost) {
		showDialogBox(currentScope, env, oneHost.name, oneHost.version, 'reloadDaemonConf');
	}
	
	function showDialogBox(currentScope, env, serviceName, serviceVersion, operation){
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/hosts/maintenance',
			"params": {
				"env": currentScope.envCode,
				"serviceName": serviceName,
				"serviceVersion": parseInt(serviceVersion),
				"operation": operation
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				
				let formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				formConfig.entries = [
					{
						'name': serviceName,
						'type': 'jsoneditor',
						'height': '200px',
						"value": response.data || response
					}
				];
				
				let options = {
					timeout: $timeout,
					form: formConfig,
					name: operation,
					label: serviceName + ": " + operation,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.form.formData = {};
							}
						}
					]
				};
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function downloadProfile(currentScope, env) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/profile"
		}, function (error, response) {
			if (error || !response) {
				currentScope.generateNewMsg(env, 'danger', translation.unableToDownloadProfile[LANG]);
			}
			else {
				var contentType = "application/javascript; charset=utf-8";
				delete response.registryLocation;
				delete response.timeConnected;
				delete response.soajsauth;
				var data = "\"use strict\";\n\n module.exports = " + JSON.stringify(response, null, 2) + ";";
				openSaveAsDialog("Profile-" + env + ".js", data, contentType);
			}
		});
	}

	return {
		'getEnvironment': getEnvironment,
		'listHosts': listHosts,
		'executeHeartbeatTest': executeHeartbeatTest,
		'executeAwarenessTest': executeAwarenessTest,
		'reloadRegistry': reloadRegistry,
		'loadProvisioning': loadProvisioning,
		'loadDaemonStats': loadDaemonStats,
		'loadDaemonGroupConfig': loadDaemonGroupConfig,
		'downloadProfile': downloadProfile
	};

}]);
