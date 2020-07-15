"use strict";
let daemonkubeServicesSrv = soajsApp.components;
daemonkubeServicesSrv.service('daemonkubeServicesSrv', ['ngDataApi', '$cookies', '$modal', '$timeout', function (ngDataApi, $cookies, $modal, $timeout) {
	
	function inspectItem(currentScope, item) {
		let formConfig = angular.copy(soajsDeployCatalogConfig.form.serviceInfo);
		formConfig.entries[0].value = item;
		let options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: item.metadata.name + ' | Info',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function autoRefreshMetrics($scope, $modalInstance, currentScope, pod) {
		let autoRefreshTimeoutMetrics;
		
		$scope.refreshIntervals = [
			{
				v: 5,
				l: '5 Seconds'
			},
			{
				v: 10,
				l: '10 Seconds'
			},
			{
				v: 30,
				l: '30 Seconds'
			},
			{
				v: 60,
				l: '1 Minute'
			}
		];
		let tValue = $scope.selectedInterval.v * 1000;
		$scope.changeInterval = function (oneInt) {
			$scope.refreshIntervals.forEach(function (oneInterval) {
				if (oneInterval.v === oneInt.v) {
					if (oneInt.v !== $scope.selectedInterval.v) {
						$scope.selectedInterval = oneInt;
						$cookies.putObject('selectedInterval', oneInt, {'domain': interfaceDomain});
						$timeout.cancel(autoRefreshTimeoutMetrics);
						autoRefreshMetrics($scope, $modalInstance, currentScope, pod);
					}
				}
			});
		};
		
		$scope.close = function () {
			$timeout.cancel(autoRefreshTimeoutMetrics);
			$modalInstance.dismiss('cancel');
		};
		
		$modalInstance.result.then(function () {
		}, function () {
			$timeout.cancel(autoRefreshTimeoutMetrics);
		});
		
		autoRefreshTimeoutMetrics = $timeout(function () {
			getMetrics($scope, $modalInstance, currentScope, pod, function (error) {
				if (!currentScope.destroyed && !error) {
					autoRefreshMetrics($scope, $modalInstance, currentScope, pod);
				} else {
					$timeout.cancel(autoRefreshTimeoutMetrics);
				}
			});
		}, tValue);
	}
	
	function getMetrics($scope, $modalInstance, currentScope, pod, cb) {
		$scope.instanceName = pod.metadata.name;
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/infra/kubernetes/pods/metrics",
			"params": {
				configuration: {
					env: currentScope.selectedEnvironment.code,
				},
				name: pod.metadata.name,
				process: true
			}
		}, function (error, oldMetrics) {
			$scope.showMetrics = true;
			if (error || !oldMetrics) {
				overlayLoading.hide();
				return cb(true);
			} else {
				let usage = {
					cpu: 0,
					memory: 0
				};
				let metrics = {};
				oldMetrics.containers.forEach((oneContainer) => {
					try {
						usage.cpu += parseInt(oneContainer.usage.cpu.replace("m", ""));
						// convert memory from ki to Bytes.
						usage.memory += parseInt(oneContainer.usage.memory.replace("ki", "")) * 1024;
						usage.timestamp = oldMetrics.metadata.creationTimestamp;
						metrics[oldMetrics.metadata.name] = usage;
					} catch (e) {
						console.log(e);
					}
				});
				var containers = Object.keys(metrics);
				containers.forEach(function (oneContainer) {
					if (!$scope.servicesMetrics) {
						$scope.servicesMetrics = {};
					}
					
					if (!$scope.servicesMetrics[oneContainer]) {
						$scope.servicesMetrics[oneContainer] = {};
					}
					
					if (!$scope.chartOptions) {
						$scope.chartOptions = {};
					}
					
					if (!$scope.chartOptions[oneContainer]) {
						$scope.chartOptions[oneContainer] = {};
					}
					
					$scope.servicesMetrics[oneContainer].online_cpus = 1;
					if (metrics[oneContainer]) {
						if (metrics[oneContainer].hasOwnProperty('online_cpus')) {
							$scope.servicesMetrics[oneContainer].online_cpus = metrics[oneContainer].online_cpus;
						}
						
						if (metrics[oneContainer].hasOwnProperty('timestamp')) {
							var ts = new Date(metrics[oneContainer].timestamp).toLocaleString('en-US', {
								hour: 'numeric',
								minute: 'numeric',
								second: 'numeric',
								hour12: false
							});
							if (!$scope.servicesMetrics[oneContainer].timestamp) {
								$scope.servicesMetrics[oneContainer].timestamp = []
							}
							$scope.servicesMetrics[oneContainer].timestamp.push(ts);
							// if ($scope.servicesMetrics[oneContainer].timestamp.length > maxData) {
							// 	$scope.servicesMetrics[oneContainer].timestamp.shift();
							// }
						}
						
						if (metrics[oneContainer].hasOwnProperty('memory')) {
							overlayLoading.hide();
							if (!$scope.servicesMetrics[oneContainer].memory) {
								$scope.servicesMetrics[oneContainer].memory = [];
								$scope.chartOptions[oneContainer].memory = {
									override: {
										borderColor: "rgba(51, 110, 230, 1)",
										backgroundColor: "rgba(51, 110, 230, 0.3)",
										borderWidth: 3,
										pointRadius: 0,
										pointHitRadius: 5
									},
									options: {
										title: {
											display: true,
											text: (metrics[oneContainer].memoryLimit) ? "Memory usage out of " + convertBytes(metrics[oneContainer].memoryLimit) : 'Memory usage'
										},
										animation: {
											duration: 0,
										},
										tooltips: {
											callbacks: {
												label: function (tooltipItem) {
													return convertBytes(tooltipItem.yLabel);
												}
											}
										},
										scales: {
											yAxes: [
												{
													id: 'memory',
													type: 'linear',
													display: true,
													position: 'left',
													scaleLabel: {
														labelString: 'Memory (Bytes)',
														display: true,
														
													},
													ticks: {
														callback: function (bytes) {
															return convertBytes(bytes);
														},
														beginAtZero: true
													}
												}
											],
											xAxes: [
												{
													scaleLabel: {
														labelString: 'Time',
														display: true,
														
													}
												}
											]
										}
									}
								}
							}
							$scope.servicesMetrics[oneContainer].memory.push(metrics[oneContainer].memory);
							$scope.servicesMetrics[oneContainer].currentMemory = convertBytes(metrics[oneContainer].memory);
							// if ($scope.servicesMetrics[oneContainer].memory.length > maxData) {
							// 	$scope.servicesMetrics[oneContainer].memory.shift();
							// }
						}
						
						if (metrics[oneContainer].hasOwnProperty('cpu')) {
							overlayLoading.hide();
							if (!$scope.servicesMetrics[oneContainer].cpu) {
								$scope.servicesMetrics[oneContainer].cpu = [];
								$scope.chartOptions[oneContainer].cpu = {
									override: {
										borderColor: "rgba(0, 199, 82, 1)",
										backgroundColor: "rgba(0, 199, 82, 0.3)",
										borderWidth: 3,
										pointRadius: 0,
										pointHitRadius: 5
									},
									options: {
										title: {
											display: true,
											text: "CPU usage"
										},
										animation: {
											duration: 0,
										},
										scales: {
											yAxes: [
												{
													id: 'cpu',
													type: 'linear',
													display: true,
													position: 'left',
													scaleLabel: {
														labelString: 'CPU (milliCores)',
														display: true,
														
													},
													ticks: {
														beginAtZero: true
													}
												}
											],
											xAxes: [
												{
													scaleLabel: {
														labelString: 'Time',
														display: true,
														
													}
												}
											]
										}
									}
								}
							}
							$scope.servicesMetrics[oneContainer].cpu.push(metrics[oneContainer].cpu);
							$scope.servicesMetrics[oneContainer].currentCpu = metrics[oneContainer].cpu;
							// if ($scope.servicesMetrics[oneContainer].cpu.length > maxData) {
							// 	$scope.servicesMetrics[oneContainer].cpu.shift();
							// }
						}
					}
				});
				if (cb) {
					return cb();
				}
			}
		});
		
	}
	
	function convertBytes(bytes) {
		if (bytes < 1024) {
			return (bytes) + ' B';
		} else if (bytes < 1024 * 1024) {
			return (bytes / 1024).toFixed(2) + ' ki';
		} else if (bytes < 1024 * 1024 * 1024) {
			return (bytes / 1024 / 1024).toFixed(2) + ' Mi';
		} else {
			return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' Gi';
		}
	}
	
	function execCommand($scope, $modalInstance, currentScope, pod, service, version, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(soajsDeployCatalogConfig.form.addExecCommand);
		
		let actions = [
			{
				'type': 'submit',
				'label': "Exec Command",
				'btn': 'primary',
				action: function (formData) {
					$scope.save(formData);
				}
			},
			{
				type: 'reset',
				label: 'Cancel',
				btn: 'danger',
				action: function () {
					$modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		];
		
		if (service.deploy && service.deploy[currentScope.selectedEnvironment.code.toLowerCase()] && service.deploy[currentScope.selectedEnvironment.code.toLowerCase()].length > 0) {
			service.deploy[currentScope.selectedEnvironment.code.toLowerCase()].forEach((item) => {
				if (item.version === version.version) {
					$scope.configuration = item;
				}
			});
		}
		if ($scope.configuration && $scope.configuration.recipe && $scope.configuration.recipe.id) {
			let opts = {
				method: "get",
				routeName: '/dashboard/catalog/recipes/get',
				params: {
					id: $scope.configuration.recipe.id
				}
			};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert($scope, 'danger', error.message);
				} else {
					let execCommands =
						{
							'name': 'catalogCommands',
							'label': 'Catalog Commands',
							'type': 'select',
							'value': [],
							"onAction": function (id, data, form) {
								form.formData.execCommands = data;
							}
						};
					if (response && response.recipe && response.recipe.deployOptions && response.recipe.deployOptions.execCommands && Object.keys(response.recipe.deployOptions.execCommands).length > 0) {
						for (let exec in response.recipe.deployOptions.execCommands) {
							if (exec && response.recipe.deployOptions.execCommands.hasOwnProperty(exec) && response.recipe.deployOptions.execCommands[exec]) {
								execCommands.value.push({
									"l": exec,
									"v": response.recipe.deployOptions.execCommands[exec]
								});
							}
						}
					}
					if (execCommands.value.length > 0) {
						formConfig.unshift(execCommands)
					}
				}
			});
		}
		
		$scope.save = function (formData) {
			overlayLoading.show();
			$scope.$valid = true;
			let input = {
				configuration: {
					env: currentScope.selectedEnvironment.code,
				},
				name: pod.metadata.name,
				commands: [formData.execCommands]
			};
			let routeName = '/infra/kubernetes/pod/exec';
			if ($scope.$valid && $modalInstance) {
				
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'put',
					routeName: routeName,
					data: input
				}, function (error, res) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert($scope, 'danger', error.message);
					} else {
						$scope.form.formData['response'] = res.response;
					}
				});
			}
		};
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			name: 'newCommand',
			actions: actions
		};
		buildForm($scope, $modalInstance, options, function () {
			
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	function execCommands($scope, $modalInstance, currentScope, service, version, cb) {
		
		let formConfig = angular.copy(soajsDeployCatalogConfig.form.addExecCommands);
		
		let actions = [
			{
				'type': 'submit',
				'label': "Exec Command",
				'btn': 'primary',
				action: function (formData) {
					$scope.save(formData);
				}
			},
			{
				type: 'reset',
				label: 'Cancel',
				btn: 'danger',
				action: function () {
					$modalInstance.dismiss('cancel');
					$scope.form.formData = {};
				}
			}
		];
		if (service.deploy && service.deploy[currentScope.selectedEnvironment.code.toLowerCase()] && service.deploy[currentScope.selectedEnvironment.code.toLowerCase()].length > 0) {
			service.deploy[currentScope.selectedEnvironment.code.toLowerCase()].forEach((item) => {
				if (item.version === version.version) {
					$scope.configuration = item;
				}
			});
		}
		if ($scope.configuration && $scope.configuration.recipe && $scope.configuration.recipe.id) {
			let opts = {
				method: "get",
				routeName: '/dashboard/catalog/recipes/get',
				params: {
					id: $scope.configuration.recipe.id
				}
			};
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert($scope, 'danger', error.message);
				} else {
					let execCommands =
						{
							'name': 'catalogCommands',
							'label': 'Catalog Commands',
							'type': 'select',
							'value': [],
							"onAction": function (id, data, form) {
								form.formData.execCommands = data;
							}
						};
					if (response && response.recipe && response.recipe.deployOptions && response.recipe.deployOptions.execCommands && Object.keys(response.recipe.deployOptions.execCommands).length > 0) {
						for (let exec in response.recipe.deployOptions.execCommands) {
							if (exec && response.recipe.deployOptions.execCommands.hasOwnProperty(exec) && response.recipe.deployOptions.execCommands[exec]) {
								execCommands.value.push({
									"l": exec,
									"v": response.recipe.deployOptions.execCommands[exec]
								});
							}
						}
					}
					if (execCommands.value.length > 0) {
						formConfig.unshift(execCommands)
					}
				}
			});
		}
		
		$scope.save = function (formData) {
			overlayLoading.show();
			$scope.$valid = true;
			let input = {
				configuration: {
					env: currentScope.selectedEnvironment.code.toLowerCase(),
				},
				filter: {
					labelSelector: 'soajs.env.code=' + currentScope.selectedEnvironment.code.toLowerCase() +
						', soajs.service.name=' + service.name + ', soajs.service.version=' + version.version
				},
				commands: [formData.execCommands]
			};
			let routeName = '/infra/kubernetes/pods/exec';
			if ($scope.$valid && $modalInstance) {
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'put',
					routeName: routeName,
					data: input
				}, function (error, res) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert($scope, 'danger', error.message);
					} else {
						$scope.hosts = [];
						$scope.responses = {};
						res.forEach(function (host, index) {
							$scope.hosts.push({
								'l': host.id,
								'v': host.id,
								'selected': index === 0
							});
							$scope.responses[host.id] = host.response;
						});
						formConfig.push(
							{
								'name': 'podSelector',
								'label': 'Select Pod',
								'type': 'select',
								'value': $scope.hosts,
								onAction: function (id, value, form) {
									form.formData['response'] = $scope.responses[value];
								},
							}
						);
						formConfig.push(
							{
								'name': 'response',
								'label': 'Response',
								'type': 'textarea',
								'required': false,
							}
						);
						$scope.form.formData['response'] = res[0].response;
					}
				});
			}
		};
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			name: 'newCommand',
			actions: actions
		};
		buildForm($scope, $modalInstance, options, function () {
			
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	function getLogs($scope, pod) {
		overlayLoading.show();
		$scope.pauseRefresh = true;
		let currentScope = $scope;
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/infra/kubernetes/pod/log',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: pod.metadata.name
			},
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.$parent.displayAlert('danger', error.message);
			} else {
				//var autoRefreshPromise;
				
				var evtSource = null;
				
				let terminateTailing = () => {
					if (evtSource) {
						evtSource.close();
						evtSource = null;
					}
				};
				
				let currentScope = $scope;
				var mInstance = $modal.open({
					templateUrl: "logBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: false,
					windowClass: 'large-Modal',
					controller: function ($scope, $modalInstance) {
						$scope.title = "Host Logs of " + pod.metadata.name;
						fixBackDrop();
						terminateTailing();
						
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
						
						$scope.tailLogs = function () {
							terminateTailing();
							// handles the callback from the received event
							var handleOpenCallback = function (response) {
								$scope.isTailing = true;
								$scope.data = remove_special(response.data).replace("undefined", "").toString();
								$scope.data += "\n";
								if (!$scope.$$phase) {
									$scope.$apply();
								}
							};
							var handleKeepaliveCallback = function (response) {
								$scope.isTailing = true;
							};
							var handleCallback = function (response) {
								$scope.data += remove_special(response.data).replace("undefined", "").toString();
								$scope.data += "\n";
								if (!$scope.$$phase) {
									$scope.$apply();
								}
								highlightMyCode();
							};
							var handleEndCallback = function (response) {
								$scope.isTailing = false;
								$scope.data += "\n";
								$scope.data += "Error tailing log, please click refresh or tail again!";
								$scope.data += "\n";
								terminateTailing();
							};
							
							var uri = apiConfiguration.domain + '/infra/kubernetes/pod/log?';
							uri += "configuration=%7B%22env%22:%22" + currentScope.selectedEnvironment.code + "%22%7D";
							uri += "&follow=true";
							uri += "&access_token=" + $cookies.get('access_token', {'domain': interfaceDomain});
							uri += "&name=" + pod.metadata.name;
							uri += "&key=" + apiConfiguration.key;
							
							evtSource = new EventSource(uri);
							evtSource.addEventListener('open', handleOpenCallback, false);
							evtSource.addEventListener('keepalive', handleKeepaliveCallback, false);
							evtSource.addEventListener('message', handleCallback, false);
							evtSource.addEventListener('error', handleEndCallback, false);
							evtSource.addEventListener('end', handleEndCallback, false);
						};
						
						$scope.refreshLogs = function () {
							$scope.isTailing = false;
							terminateTailing();
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: '/infra/kubernetes/pod/log',
								params: {
									configuration: {
										env: $scope.selectedEnvironment.code,
									},
									name: pod.metadata.name
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert($scope, 'danger', error.message);
								} else {
									$scope.data = remove_special(response.data).replace("undefined", "").toString();
									if (!$scope.$$phase) {
										$scope.$apply();
									}
									
									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);
								}
							});
						};
						
						if (error) {
							$scope.message = {
								warning: 'Instance logs are not available at the moment. Make sure that the instance is <strong style="color:green;">running</strong> and healthy.<br> If this is a newly deployed instance, please try again in a few moments.'
							};
						} else {
							$scope.data = remove_special(response.data);
							$timeout(function () {
								highlightMyCode()
							}, 500);
						}
					}
				});
				
				mInstance.result.then(function () {
					//Get triggers when modal is closed
					terminateTailing();
				}, function () {
					//gets triggers when modal is dismissed.
					terminateTailing();
				});
			}
		});
		
		function remove_special(str) {
			if (!str) {
				return 'No logs found for this instance'; //in case container has no logs, return message to display
			}
			var rExps = [/[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
				/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
				/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
				/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
				/[\xD9-\xDB]/g, /[\xF9-\xFB]/g,
				/\xD1/, /\xF1/g,
				"/[\u00a0|\u1680|[\u2000-\u2009]|u200a|\u200b|\u2028|\u2029|\u202f|\u205f|\u3000|\xa0]/g",
				/\uFFFD/g,
				/\u000b/g, '/[\u180e|\u000c]/g',
				/\u2013/g, /\u2014/g,
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g,
				/</g, />/g
			];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...', '&lt;', '&gt;'];
			for (var i = 0; i < rExps.length; i++) {
				str = str.replace(rExps[i], repChar[i]);
			}
			for (var x = 0; x < str.length; x++) {
				var charcode = str.charCodeAt(x);
				if ((charcode < 32 || charcode > 126) && charcode != 10 && charcode != 13) {
					str = str.replace(str.charAt(x), "");
				}
			}
			return str;
		}
	}
	
	function configureDeployment($scope, currentScope, service, v, $modalInstance) {
		$scope.alerts = [];
		$scope.access = currentScope.access;
		$scope.isDeployed = currentScope.deployments[service.name][v.version].deployed;
		$scope.selectedEnvironment = currentScope.selectedEnvironment;
		$scope.envDeployer = currentScope.envDeployer;
		$scope.envDeployeType = currentScope.envDeployeType;
		$scope.envDeployeTechnology = currentScope.envDeployeTechnology;
		$scope.version = v.version;
		$scope.maintenance = v.maintenance;
		$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
		$scope.service = service;
		$scope.deployedImage = currentScope.deployments[service.name][v.version].deployedImage;
		$scope.deploymentModes = ['Deployment', 'DaemonSet', 'CronJob'];
		$scope.concurrencyPolicy = ['Allow', 'Forbid', 'Replace'];
		$scope.externalTrafficPolicy= ['Local', 'Cluster'];
		$scope.restartPolicy = ["OnFailure", "Never"];
		$scope.configuration = {};
		let opts = {
			method: "get",
			routeName: '/dashboard/catalog/recipes/list',
			params: {
				soajs: false
			}
		};
		if (service.settings && service.settings && service.settings.recipes && service.settings.recipes.length > 0) {
			opts.method = "post";
			opts.data = {
				ids: service.settings.recipes
			};
		}
		if (service.deploy && service.deploy[$scope.selectedEnvironment.code.toLowerCase()] && service.deploy[$scope.selectedEnvironment.code.toLowerCase()].length > 0) {
			service.deploy[$scope.selectedEnvironment.code.toLowerCase()].forEach((item) => {
				if (item.version === v.version) {
					$scope.configuration = item;
				}
			});
		}
		overlayLoading.show();
		$scope.loadingRecipes = true;
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			$scope.loadingRecipes = false;
			if (error) {
				currentScope.displayAlert($scope, 'danger', error.message);
			} else {
				$scope.catalogRecipe = response;
				if ($scope.configuration.recipe && $scope.configuration.recipe.id) {
					$scope.catalogRecipe.forEach((recipe) => {
						if (recipe._id.toString() === $scope.configuration.recipe.id) {
							$scope.configuration.recipe.value = recipe;
						}
					});
					if ($scope.configuration.recipe.value) {
						$scope.injectCatalogEntries($scope.configuration.recipe.value);
					}
				}
			}
		});
		
		$scope.injectCatalogEntries = function (catalog) {
			$scope.getSecrets(function () {
				$scope.getConfigurationCatalogs(catalog, function () {
					$scope.configuration.recipe.id = catalog._id.toString();
					$scope.allowedBranches = v.branches;
					$scope.allowedTags = v.tags;
					
					if (catalog.recipe && catalog.recipe.buildOptions) {
						if (catalog.recipe.buildOptions.env) {
							$scope.userInputVariable = [];
							$scope.secretVariable = [];
							if (!$scope.configuration.recipe.env){
								$scope.configuration.recipe.env = {};
							}
							for (let envVariable in catalog.recipe.buildOptions.env) {
								if (envVariable && catalog.recipe.buildOptions.env.hasOwnProperty(envVariable) && catalog.recipe.buildOptions.env[envVariable]) {
									if (catalog.recipe.buildOptions.env[envVariable].type === 'userInput') {
										let temp = {
											label: catalog.recipe.buildOptions.env[envVariable].label || envVariable,
											name: envVariable,
											value: catalog.recipe.buildOptions.env[envVariable].default || "",
											fieldMsg: catalog.recipe.buildOptions.env[envVariable].fieldMsg,
											required: false
										};
										if ($scope.configuration.recipe && $scope.configuration.recipe.env && $scope.configuration.recipe.env[envVariable]) {
										
											if (typeof $scope.configuration.recipe.env[envVariable] !== 'string') {
												$scope.configuration.recipe.env[envVariable] = catalog.recipe.buildOptions.env[envVariable].default || "";
											}
										}
										else {
											$scope.configuration.recipe.env[envVariable] = catalog.recipe.buildOptions.env[envVariable].default || "";
										}
										$scope.userInputVariable.push(temp);
									}
									if (catalog.recipe.buildOptions.env[envVariable].type === 'secret') {
										let temp = {
											name: envVariable,
											fields: [
												{
													label: "Secret",
													name: "secretName",
													value: $scope.secrets.secret,
													fieldMsg: "Enter the value of the secret",
													required: true,
												},
												{
													label: "Secret Key",
													name: "secretKey",
													value: catalog.recipe.buildOptions.env[envVariable].key || "",
													fieldMsg: "Enter the value of the secret key",
													required: false,
												}
											]
										};
										if ($scope.configuration.recipe && $scope.configuration.recipe.env && $scope.configuration.recipe.env[envVariable]) {
											if (typeof $scope.configuration.recipe.env[envVariable] !== 'object') {
												$scope.configuration.recipe.env[envVariable] = {
													name: catalog.recipe.buildOptions.env[envVariable].secret || "",
													key: catalog.recipe.buildOptions.env[envVariable].key || ""
												};
											}
										}
										else {
											$scope.configuration.recipe.env[envVariable] = {
												name: catalog.recipe.buildOptions.env[envVariable].secret || "",
												key: catalog.recipe.buildOptions.env[envVariable].key || ""
											};
										}
										$scope.secretVariable.push(temp);
									}
								}
							}
							if (Object.keys($scope.configuration.recipe.env).length === 0) {
								delete $scope.configuration.recipe.env;
							}
						}
					}
					
					//image
					if (catalog.recipe && catalog.recipe.deployOptions) {
						if (catalog.recipe.deployOptions.image) {
							$scope.showBranches = !catalog.recipe.deployOptions.image.binary && v.branches;
							$scope.showTags = !catalog.recipe.deployOptions.image.binary && v.tags;
							$scope.showImages = catalog.recipe.deployOptions.image.override;
							$scope.privateImage = catalog.recipe.deployOptions.image.repositoryType === "private";
							$scope.configuration.recipe.image = {
								prefix: catalog.recipe.deployOptions.image.prefix,
								name: catalog.recipe.deployOptions.image.name,
								tag: catalog.recipe.deployOptions.image.tag
							};
						}
						
						if (catalog.recipe.deployOptions.ports && catalog.recipe.deployOptions.ports.length > 0) {
							if (!$scope.configuration.recipe.ports) {
								$scope.configuration.recipe.ports = {
									type: "kubernetes"
								};
								
							}
							$scope.ports = angular.copy(catalog.recipe.deployOptions.ports);
							if ($scope.configuration.recipe.ports.values){
								$scope.ports = angular.copy($scope.configuration.recipe.ports.values);
							}
							$scope.externalTrafficPolicy = $scope.configuration.recipe.ports.externalTrafficPolicy === "Cluster";
							$scope.ports.forEach((port) => {
								if (port.isPublished) {
									$scope.isPublished = true;
									if (!$scope.configuration.recipe.ports.portType) {
										if (port.published) {
											$scope.configuration.recipe.ports.portType = "NodePort";
										} else {
											$scope.configuration.recipe.ports.portType = "LoadBalancer";
										}
									}
									$scope.loadBalancer = $scope.configuration.recipe.ports.portType === "LoadBalancer";
								}
							});
							if (!$scope.configuration.recipe.ports.values) {
								$scope.configuration.recipe.ports.values = angular.copy($scope.ports);
							}
							$scope.showPorts = true;
							if (!$scope.isPublished || $scope.service.type === "service") {
								$scope.configuration.recipe.ports.portType = "Internal";
							}
						} else {
							$scope.showPorts = false;
						}
						if (catalog.recipe.deployOptions.sourceCode) {
							if (catalog.recipe.deployOptions.sourceCode.configuration) {
								$scope.showSourceConfig = true;
								$scope.requiredSourceConfig = !!catalog.recipe.deployOptions.sourceCode.configuration;
								$scope.editSourceConfig = true;
								$scope.fetchConfigVersion(catalog.recipe.deployOptions.sourceCode.configuration.catalog
									|| $scope.configuration.recipe.sourceCode.catalog);
								$scope.fetchConfigBranchesTags(catalog.recipe.deployOptions.sourceCode.configuration.version
									|| $scope.configuration.recipe.sourceCode.version);
								
								if (catalog.recipe.deployOptions.sourceCode.configuration.catalog !== '') {
									$scope.editSourceConfig = false;
									$scope.configuration.recipe.sourceCode = {
										label: catalog.recipe.deployOptions.sourceCode.configuration.label,
										catalog: catalog.recipe.deployOptions.sourceCode.configuration.catalog,
										version: catalog.recipe.deployOptions.sourceCode.configuration.version,
										tag: catalog.recipe.deployOptions.sourceCode.configuration.tag,
										branch: catalog.recipe.deployOptions.sourceCode.configuration.branch,
										id: $scope.fetchConfigId(catalog.recipe.deployOptions.sourceCode.configuration.catalog)
									};
									if (!$scope.configuration.recipe.sourceCode.id) {
										$scope.showSourceConfig = false;
									}
								} else if (!catalog.recipe.deployOptions.sourceCode) {
									$scope.configuration.recipe.sourceCode = {
										label: catalog.recipe.deployOptions.sourceCode.configuration.label,
									}
								}
								if (catalog.recipe.deployOptions.sourceCode.configuration.branch) {
									$scope.updateGitConfigBranch(catalog.recipe.deployOptions.sourceCode.configuration.branch)
								}
							} else {
								delete $scope.configuration.recipe.sourceCode;
							}
						} else {
							delete $scope.configuration.recipe.sourceCode;
						}
					}
				});
			});
		};
		
		$scope.updateGitBranch = function (branch) {
			if ($scope.showBranches && service.src && service.src.provider && service.src.provider !== 'manual') {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, {
					method: 'get',
					routeName: '/repositories/git/branch/',
					params: {
						"repo": service.src.repo,
						"owner": service.src.owner,
						"provider": service.src.provider,
						"branch": branch
					}
				}, function (error, branch) {
					overlayLoading.hide();
					$scope.loadingRecipes = false;
					if (error) {
						currentScope.displayAlert($scope, 'danger', error.message);
					} else {
						if ($scope.configuration && $scope.configuration.src) {
							$scope.configuration.src.commit = branch.commit;
							$scope.configuration.src.id = branch.repo.id;
						}
					}
				});
			}
		};
		$scope.updateGitConfigBranch = function (branch) {
			if ($scope.selectedConfigurationCatalogs) {
				overlayLoading.show();
				let opts = {
					"branch": branch
				};
				opts.repo = $scope.selectedConfigurationCatalogs.src.repo;
				opts.owner = $scope.selectedConfigurationCatalogs.src.owner;
				opts.provider = $scope.selectedConfigurationCatalogs.src.provider;
				getSendDataFromServer($scope, ngDataApi, {
					method: 'get',
					routeName: '/repositories/git/branch/',
					params: opts
				}, function (error, branch) {
					overlayLoading.hide();
					$scope.loadingRecipes = false;
					if (error) {
						currentScope.displayAlert($scope, 'danger', error.message);
					} else {
						if ($scope.configuration && $scope.configuration.recipe && $scope.configuration.recipe.sourceCode) {
							$scope.configuration.recipe.sourceCode.commit = branch.commit;
							$scope.configuration.recipe.sourceCode.id = branch.repo.id;
						}
					}
				});
			}
		};
		$scope.getRepo = function () {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/repositories/git/repos/',
				params: {
					"repo": service.src.repo,
					"owner": [service.src.owner],
					"provider": [service.src.provider],
					"active": true
				}
			}, function (error, res) {
				overlayLoading.hide();
				$scope.loadingRecipes = false;
				if (error) {
					currentScope.displayAlert($scope, 'danger', error.message);
				} else {
					if (res && res.items && res.items.length > 0) {
						if ($scope.configuration && $scope.configuration.src) {
							$scope.configuration.src.id = res.items[0]._id.toString();
						}
					}
				}
			});
		};
		$scope.getSecrets = function (cb) {
			if ($scope.defaultWizardSecretValues) {
				$scope.secrets = $scope.defaultWizardSecretValues;
				return cb();
			}
			let opts = {
				"method": 'get',
				"routeName": '/infra/kubernetes/configurations/Secret',
				"params": {
					"configuration": {
						"env": $scope.selectedEnvironment.code,
					},
					"limit": 500
				}
			};
			getSendDataFromServer($scope, ngDataApi, opts, function (error, secrets) {
				if (error) {
					currentScope.displayAlert($scope, 'danger', error.message);
				} else {
					delete secrets.soajsauth;
					$scope.secrets = {
						"secret": [],
						"registry": []
					};
					if (secrets.items && secrets.items.length > 0) {
						secrets.items.forEach((item) => {
							if (item.type === "kubernetes.io/dockercfg") {
								$scope.secrets.registry.push(item.metadata.name);
							} else {
								$scope.secrets.secret.push(item.metadata.name);
							}
						});
					}
					$scope.defaultWizardSecretValues = angular.copy($scope.secrets);
					return cb();
				}
			});
		};
		
		$scope.getConfigurationCatalogs = function (catalog, cb) {
			if (!catalog.recipe.deployOptions.sourceCode || !catalog.recipe.deployOptions.sourceCode.configuration) {
				return cb();
			}
			getSendDataFromServer($scope, ngDataApi, {
				'method': 'get',
				'routeName': '/marketplace/items',
				'params': {
					'type': 'config',
				},
			}, function (error, response) {
				if (error) {
					$scope.displayAlert($scope, 'danger', error.message);
				} else {
					if (response && response.records) {
						$scope.configurationCatalogs = response.records;
					} else {
						$scope.displayAlert($scope, 'danger', 'No Config Catalogs found');
					}
					return cb();
				}
			});
		};
		
		$scope.fetchConfigBranchesTags = function (version) {
			if ($scope.configurationCatalogsVersions) {
				let v;
				$scope.configurationCatalogsVersions.forEach((one) => {
					if (one.version === version) {
						v = one;
					}
				});
				if (v) {
					if (v.tags) {
						$scope.configurationCatalogsTags = v.tags;
					} else {
						$scope.configurationCatalogsBranches = v.branches;
					}
				}
			}
		};
		
		$scope.fetchConfigVersion = function (catalog) {
			if ($scope.configurationCatalogs) {
				$scope.configurationCatalogsVersions = [];
				$scope.configurationCatalogs.forEach((one) => {
					if (one.name === catalog) {
						$scope.selectedConfigurationCatalogs = one;
						$scope.configurationCatalogsVersions = one.versions;
					}
				});
			}
		};
		
		$scope.fetchConfigId = function (catalog) {
			let id = '';
			if ($scope.configurationCatalogs) {
				$scope.configurationCatalogs.forEach((one) => {
					if (one.name === catalog) {
						id = one._id.toString();
					}
				});
			}
			return id;
		};
		
		$scope.appendExposedPortType = function (loadBalanceer) {
			$scope.configuration.recipe.ports.portType = loadBalanceer ? "LoadBalancer" : "NodePort";
		};
		$scope.appendExternalTrafficPolicy = function (ExternalTrafficPolicy) {
			$scope.configuration.recipe.ports.externalTrafficPolicy = ExternalTrafficPolicy ? "Cluster" : "Local";
		};
		
		$scope.addToCustomPorts = function (exposedPorts) {
			$scope.configuration.recipe.ports.values.forEach((custom) => {
				if (exposedPorts.target === custom.target) {
					custom.published = exposedPorts.published;
				}
			});
		};
		
		$scope.gotoSecrets = function () {
			if ($modalInstance) {
				$modalInstance.close();
			}
			$location.path("/environments-clouds-deployments");
		};
	}
	
	function reConfigureDeployment($scope, currentScope, service, v) {
		$scope.alerts = [];
		$scope.access = currentScope.access;
		$scope.isDeployed = currentScope.deployments[service.name][v.version].deployed;
		$scope.selectedEnvironment = currentScope.selectedEnvironment;
		$scope.envDeployer = currentScope.envDeployer;
		$scope.envDeployeTechnology = currentScope.envDeployeTechnology;
		$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
		$scope.service = service;
		$scope.version = v.version;
		$scope.deployedImage = currentScope.deployments[service.name][v.version].deployedImage;
		$scope.allowedBranches = v.branches;
		$scope.allowedTags = v.tags;
		let opts = {
			method: "get",
			routeName: '/dashboard/catalog/recipes/list',
			params: {
				soajs: false
			}
		};
		if (service.settings && service.settings && service.settings.recipes && service.settings.recipes.length > 0) {
			opts.method = "post";
			opts.data = {
				ids: service.settings.recipes
			};
		}
		if (service.deploy && service.deploy[$scope.selectedEnvironment.code.toLowerCase()] && service.deploy[$scope.selectedEnvironment.code.toLowerCase()].length > 0) {
			service.deploy[$scope.selectedEnvironment.code.toLowerCase()].forEach((item) => {
				if (item.version === v.version) {
					$scope.configuration = item;
				}
			});
		}
		if (!$scope.configuration) {
			currentScope.displayAlert($scope, 'danger', "No configuration found for this deployment.");
		} else {
			$scope.image = $scope.configuration.recipe.image;
			if ($scope.configuration.src) {
				$scope.src = $scope.configuration.src;
			}
		}
		$scope.updateGitBranch = function (branch) {
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'get',
				routeName: '/repositories/git/branch/',
				params: {
					"repo": service.src.repo,
					"owner": [service.src.owner],
					"provider": [service.src.provider],
					"branch": branch
				}
			}, function (error, branch) {
				overlayLoading.hide();
				$scope.loadingRecipes = false;
				if (error) {
					currentScope.displayAlert($scope, 'danger', error.message);
				} else {
					$scope.src.commit = branch.commit;
				}
			});
		};
	}
	
	function saveConfiguration(service, version, $scope, currentScope, $modalInstance, cb) {
		overlayLoading.show();
		let opts = {
			"method": 'put',
			"routeName": '/marketplace/item/deploy/configure',
			"params": {
				"name": service.name,
				"type": service.type
			}
		};
		let config = angular.copy($scope.configuration);
		if (config.recipe && config.recipe.value) {
			config.recipe.id = config.recipe.value._id.toString();
			delete config.recipe.value;
		}
		config.version = $scope.version;
		config.env = $scope.selectedEnvironment.code.toLowerCase();
		if (config.src) {
			let src = {
				id: config.src.id
			};
			delete config.src.id;
			src.from = angular.copy(config.src);
			config.src = src;
		}
		opts.data = {
			config
		};
		
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert($scope, 'danger', error.message);
			} else {
				currentScope.$parent.displayAlert('success', "Item Configuration Saved Successfully!");
				$modalInstance.close();
				return cb();
			}
		});
	}
	
	function buildConfiguration(service, version, $scope, currentScope, $modalInstance, cb) {
		overlayLoading.show();
		let opts = {
			"method": 'put',
			"routeName": '/marketplace/item/deploy/build',
			"params": {
				"name": service.name,
				"type": service.type,
				"version": version
			},
		};
		let config = angular.copy($scope.configuration);
		if (config.recipe && config.recipe.value) {
			config.recipe.id = config.recipe.value._id.toString();
			delete config.recipe.value;
		}
		config.env = $scope.selectedEnvironment.code.toLowerCase();
		config.version = $scope.version;
		if (config.src) {
			let src = {
				id: config.src.id
			};
			delete config.src.id;
			src.from = angular.copy(config.src);
			config.src = src;
		}
		opts.data = {
			config
		};
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert($scope, 'danger', error.message);
			} else {
				currentScope.$parent.displayAlert('success', "Item Built Successfully!");
				$modalInstance.close();
				return cb();
			}
		});
	}
	
	function redeploy(service, version, $scope, currentScope, $modalInstance) {
		overlayLoading.show();
		let opts = {
			"method": 'put',
			"routeName": '/marketplace/item/deploy/redeploy',
			"params": {
				"name": service.name,
				"type": service.type,
				"version": 1,
				"env": $scope.selectedEnvironment.code.toLowerCase(),
				
			},
			"data": {
				"image": {
					"tag": $scope.image.tag
				}
			}
		};
		if ($scope.src) {
			opts.data.src = {
				from: {}
			};
			if ($scope.src.branch) {
				opts.data.src.from.branch = $scope.src.branch;
				opts.data.src.from.commit = $scope.src.commit;
			}
			if ($scope.src.tag) {
				opts.data.src.from.tag = $scope.src.branch;
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert($scope, 'danger', error.message);
			} else {
				currentScope.$parent.displayAlert('success', "Item Redeployed Successfully!");
				$modalInstance.close();
			}
		});
	}
	
	return {
		'inspectItem': inspectItem,
		'execCommand': execCommand,
		'execCommands': execCommands,
		'autoRefreshMetrics': autoRefreshMetrics,
		'getLogs': getLogs,
		'configureDeployment': configureDeployment,
		'saveConfiguration': saveConfiguration,
		'buildConfiguration': buildConfiguration,
		'reConfigureDeployment': reConfigureDeployment,
		'redeploy': redeploy
		
	};
}]);
