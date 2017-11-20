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
		var controllers = [];
		currentScope.showCtrlHosts = true;
		currentScope.hostList = [];
		if (currentScope.access.listHosts) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/hosts/list",
				"params": {
					"env": env
				}
			}, function (error, response) {
				if (error || !response) {
					currentScope.generateNewMsg(env, 'danger', translation.unableRetrieveServicesHostsInformation[LANG]);
				}
				else {
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
									'type': 'service'
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
						}
						else {
							delete currentScope.hosts.controller;
						}
					}
				}
			});
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
					let awarenessResponse = {};
					response.forEach((oneAwareness) => {
						if(oneAwareness.ip === defaultControllerHost.ip){
							awarenessResponse = oneAwareness;
						}
					});
					
					if(Object.keys(awarenessResponse).length > 0){
						defaultControllerHost.heartbeat = true;
						defaultControllerHost.color = 'green';
						updateParent();
						
						var servicesList = Object.keys(awarenessResponse.data.services);
						for (let oneService in servicesList) {
							for (let as1 in awarenessResponse.data.services[servicesList[oneService]].awarenessStats) {
								let as2 = as1.replace(/_dot_/g, ".");
								awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as2] = angular.copy(awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as1]);
								delete awarenessResponse.data.services[servicesList[oneService]].awarenessStats[as1];
							}
						}
						
						var daemonsList = Object.keys(awarenessResponse.data.daemons);
						for (let oneDaemon in daemonsList) {
							
							for (let as1 in awarenessResponse.data.daemons[daemonsList[oneDaemon].awarenessStats]) {
								let as2 = as1.replace(/_dot_/g, ".");
								awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as2] = angular.copy(awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as1]);
								delete awarenessResponse.data.daemons[daemonsList[oneDaemon]].awarenessStats[as1];
							}
						}
						
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
					else{
						updateParent();
					}
				}
			});
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
										'type': regServices[serviceName].type
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
									
									if(regServices[serviceName].awarenessStats[oneHostIP]){
										if(parseInt(regServices[serviceName].awarenessStats[oneHostIP].version) === parseInt(version)){
											if(regServices[serviceName].awarenessStats[oneHostIP].healthy){
												oneHost.color= "green";
												oneHost.healthy = true;
												hostsCount++;
											}
											else{
												oneHost.downCount = regServices[serviceName].awarenessStats[oneHostIP].downCount;
												oneHost.downSince = regServices[serviceName].awarenessStats[oneHostIP].downSince;
											}
										}
									}
								}
							});
							
							if(hostsCount === regServices[serviceName].hosts[version].length){
								renderedHosts[serviceName].color = 'green';
								renderedHosts[serviceName].healthy = true;
							}
							else if(hostsCount > 0 && hostsCount < regServices[serviceName].hosts[version].length){
								renderedHosts[serviceName].color = 'yellow';
								renderedHosts[serviceName].healthy = true;
							}
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
		let curlCommand = "http://" + oneHost.ip + ":" + (oneHost.port + currentScope.myEnvironment.services.config.ports.maintenanceInc) + "/heartbeat";
		showDialogBox(currentScope, env, curlCommand, oneHost.name);
	}

	function executeAwarenessTest(currentScope, env, oneHost) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/hosts/awareness",
			"params": {
				"env": env.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(env, 'danger', translation.errorExecutingAwarnessTestControllerIP[LANG] + oneHost.ip + ":" + oneHost.port + " @ " + new Date().toISOString());
			}
			else {
				let awarenessResponse = {};
				response.forEach((oneAwareness) => {
					if(oneAwareness.ip === oneHost.ip){
						awarenessResponse = oneAwareness.data.services;
					}
				});
				for (var oneService in awarenessResponse) {
					
					for(let as1 in awarenessResponse[oneService].awarenessStats){
						let as2 = as1.replace(/_dot_/g, ".");
						awarenessResponse[oneService].awarenessStats[as2] = angular.copy(awarenessResponse[oneService].awarenessStats[as1]);
						delete awarenessResponse[oneService].awarenessStats[as1];
					}
					
					if (awarenessResponse.hasOwnProperty(oneService)) {
						if (oneService === 'controller') {
							continue;
						}

						if (awarenessResponse[oneService].awarenessStats) {
							var ips = Object.keys(awarenessResponse[oneService].awarenessStats);
							ips.forEach(function (serviceIp) {
								updateService(awarenessResponse, oneService, serviceIp);
							});
						}
					}
				}
			}
		});

		function updateService(response, oneService, serviceIp) {
			var count = 0, max = 0;

			for (var version in currentScope.hosts[oneService].ips) {
				for (var i = 0; i < currentScope.hosts[oneService].ips[version].length; i++) {
					max++;
					console.log(currentScope.hosts[oneService].ips[version][i].ip , serviceIp);
					if (currentScope.hosts[oneService].ips[version][i].ip === serviceIp) {
						if (response[oneService].awarenessStats[serviceIp].healthy) {
							currentScope.hosts[oneService].ips[version][i].healthy = true;
							currentScope.hosts[oneService].ips[version][i].color = 'green';
						}
						else {
							currentScope.hosts[oneService].ips[version][i].healthy = false;
							currentScope.hosts[oneService].ips[version][i].color = 'red';
						}

						var lc = response[oneService].awarenessStats[serviceIp].lastCheck;
						currentScope.hosts[oneService].ips[version][i].lastCheck = getTimeAgo(lc);

						if (response[oneService].awarenessStats[serviceIp].downSince) {
							currentScope.hosts[oneService].ips[version][i].downSince = new Date(response[oneService].awarenessStats[serviceIp].downSince).toISOString();
						}
						if (response[oneService].awarenessStats[serviceIp].downCount) {
							currentScope.hosts[oneService].ips[version][i].downCount = response[oneService].awarenessStats[serviceIp].downCount;
						}
					}
				}


				currentScope.hosts[oneService].ips[version].forEach(function (oneIP) {
					if (oneIP.healthy) {
						count++;
					}
				});
			}

			var healthy, color;
			if (count === max) {
				//if (count === currentScope.hosts[oneService].ips.length) {
				color = 'green';
				healthy = true;
			}
			else if (count === 0) {
				color = 'red';
				healthy = false;
			}
			else {
				color = 'yellow';
				healthy = false;
			}
			currentScope.hosts[oneService].healthy = healthy;
			currentScope.hosts[oneService].color = color;
			currentScope.generateNewMsg(env, 'success', translation.awarenessTestControllerIP[LANG] + " " + oneHost.ip + ":" + oneHost.port + " " + translation.wasSuccesful[LANG] + " @ " + new Date().toISOString());
		}
	}

	//ok from down here
	function reloadRegistry(currentScope, env, oneHost, cb) {
		let curlCommand = "http://" + oneHost.ip + ":" + (oneHost.port + currentScope.myEnvironment.services.config.ports.maintenanceInc) + "/reloadRegistry";
		showDialogBox(currentScope, env, curlCommand, oneHost.name);
	}

	function loadProvisioning(currentScope, env, oneHost) {
		let curlCommand = "http://" + oneHost.ip + ":" + (oneHost.port + currentScope.myEnvironment.services.config.ports.maintenanceInc) + "/loadProvision";
		showDialogBox(currentScope, env, curlCommand, oneHost.name);
	}

	function loadDaemonStats(currentScope, env, oneHost) {
		let curlCommand = "http://" + oneHost.ip + ":" + (oneHost.port + currentScope.myEnvironment.services.config.ports.maintenanceInc) + "/daemonStats";
		showDialogBox(currentScope, env, curlCommand, oneHost.name);
	}
	
	function loadDaemonGroupConfig(currentScope, env, oneHost) {
		let curlCommand = "http://" + oneHost.ip + ":" + (oneHost.port + currentScope.myEnvironment.services.config.ports.maintenanceInc) + "/reloadDaemonConf";
		showDialogBox(currentScope, env, curlCommand, oneHost.name);
	}
	
	function showDialogBox(currentScope, env, curlCommand, oneHostName){
		var formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = "Please run the following command on the machine hosting the " + env + " environment" + curlCommand;
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'reloadDaemonConf',
			label: "Reloaded Daemon Group Configuration for " + oneHostName,
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.provisionInfo = [];
						currentScope.form.formData = {};
					}
				}
			]
		};
		
		buildFormWithModal(currentScope, $modal, options);
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
