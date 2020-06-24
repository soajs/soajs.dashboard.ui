"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('podService', ['ngDataApi', '$timeout', '$window', '$cookies', function (ngDataApi, $timeout, $window, $cookies) {
	
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
				console.log(translation.unableRetrieveServicesMetrics[LANG]);
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
	
	function execCommand($scope, $modalInstance, currentScope, pod, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(cloudsDeploymentConfig.form.addExecCommand);
		
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
		
		
		$scope.save = function (formData) {
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
					if (error) {
						currentScope.displayAlert('danger', error.message);
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
	
	return {
		'execCommand': execCommand,
		'autoRefreshMetrics': autoRefreshMetrics
	}
}]);
