"use strict";
var metricsServices = soajsApp.components;
metricsServices.service('metricsSrv', ['ngDataApi', function (ngDataApi) {

	function getServicesMetrics(currentScope, cb) {
		var env = currentScope.envCode.toLowerCase();
		var maxData = 900000/currentScope.metricsRefreshInterval;
		
		if (currentScope.hosts && currentScope.access.hacloud.services.list && currentScope.access.hacloud.services.metrics && currentScope.isMetricsServerDeployed && !currentScope.pauseRefresh) {
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/metrics/services",
				"params": {
					"env": env
				}
			}, function (error, metrics) {
				if (error || !metrics) {
					console.log(translation.unableRetrieveServicesMetrics[LANG]);
				}
				else {
					var containers = Object.keys(metrics);
					containers.forEach(function (oneContainer) {
						if (!currentScope.servicesMetrics) {
							currentScope.servicesMetrics = {};
						}

						if (!currentScope.servicesMetrics[oneContainer]) {
							currentScope.servicesMetrics[oneContainer] = {};
						}

						if (!currentScope.chartOptions) {
							currentScope.chartOptions = {};
						}

						if (!currentScope.chartOptions[oneContainer]) {
							currentScope.chartOptions[oneContainer] = {};
						}

						currentScope.servicesMetrics[oneContainer].online_cpus = 1;
						if(metrics[oneContainer]) {
							if (metrics[oneContainer].hasOwnProperty('online_cpus')) {
								currentScope.servicesMetrics[oneContainer].online_cpus = metrics[oneContainer].online_cpus;
							}

							if (metrics[oneContainer].hasOwnProperty('timestamp')) {
								var ts = new Date(metrics[oneContainer].timestamp).toLocaleString('en-US', {
									hour: 'numeric',
									minute: 'numeric',
									second: 'numeric',
									hour12: false
								});
								if (!currentScope.servicesMetrics[oneContainer].timestamp) {
									currentScope.servicesMetrics[oneContainer].timestamp = []
								}
								currentScope.servicesMetrics[oneContainer].timestamp.push(ts);
								if (currentScope.servicesMetrics[oneContainer].timestamp.length > maxData) {
									currentScope.servicesMetrics[oneContainer].timestamp.shift();
								}
							}

							if (metrics[oneContainer].hasOwnProperty('memory')) {
								if (!currentScope.servicesMetrics[oneContainer].memory) {
									currentScope.servicesMetrics[oneContainer].memory = [];
									currentScope.chartOptions[oneContainer].memory = {
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
								currentScope.servicesMetrics[oneContainer].memory.push(metrics[oneContainer].memory);
								currentScope.servicesMetrics[oneContainer].currentMemory = convertBytes(metrics[oneContainer].memory);
								if (currentScope.servicesMetrics[oneContainer].memory.length > maxData) {
									currentScope.servicesMetrics[oneContainer].memory.shift();
								}
							}

							if (metrics[oneContainer].hasOwnProperty('cpu')) {
								if (!currentScope.servicesMetrics[oneContainer].cpu) {
									currentScope.servicesMetrics[oneContainer].cpu = [];
									currentScope.chartOptions[oneContainer].cpu = {
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
								currentScope.servicesMetrics[oneContainer].cpu.push(metrics[oneContainer].cpu);
								currentScope.servicesMetrics[oneContainer].currentCpu = metrics[oneContainer].cpu;
								if (currentScope.servicesMetrics[oneContainer].cpu.length > maxData) {
									currentScope.servicesMetrics[oneContainer].cpu.shift();
								}
							}

							if (metrics[oneContainer].hasOwnProperty('cpuPercent')) {
								if (!currentScope.servicesMetrics[oneContainer].cpuPercent) {
									currentScope.servicesMetrics[oneContainer].cpuPercent = [];
									currentScope.chartOptions[oneContainer].cpuPercent = {
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
												text: "CPU usage (" + currentScope.servicesMetrics[oneContainer].online_cpus + " Cores)"
											},
											animation: {
												duration: 0,
											},
											tooltips: {
												callbacks: {
													label: function (tooltipItem) {
														return tooltipItem.yLabel + '%';
													}
												}
											},
											scales: {
												yAxes: [
													{
														id: 'cpuPercent',
														type: 'linear',
														display: true,
														position: 'left',
														scaleLabel: {
															labelString: 'CPU (%)',
															display: true,

														},
														ticks: {
															callback: function (percent) {
																return percent.toFixed(2);
															},
															beginAtZero: true,
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
								currentScope.servicesMetrics[oneContainer].cpuPercent.push(metrics[oneContainer].cpuPercent);
								currentScope.servicesMetrics[oneContainer].currentCpuPercent = metrics[oneContainer].cpuPercent;
								if (currentScope.servicesMetrics[oneContainer].cpuPercent.length > maxData) {
									currentScope.servicesMetrics[oneContainer].cpuPercent.shift();
								}
							}

							if (metrics[oneContainer].hasOwnProperty('memPercent')) {
								if (!currentScope.servicesMetrics[oneContainer].memPercent) {
									currentScope.servicesMetrics[oneContainer].memPercent = [];
									currentScope.chartOptions[oneContainer].memPercent = {
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
												text: "Memory usage"
											},
											animation: {
												duration: 0,
											},
											tooltips: {
												callbacks: {
													label: function (tooltipItem) {
														return tooltipItem.yLabel + '%';
													}
												}
											},
											scales: {
												yAxes: [
													{
														id: 'memPercent',
														type: 'linear',
														display: true,
														position: 'left',
														scaleLabel: {
															labelString: 'Memory (%)',
															display: true,

														},
														ticks: {
															callback: function (percent) {
																return percent.toFixed(2);
															},
															beginAtZero: true,
															min: 0,
															max: 100,
															stepSize: 10
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
								currentScope.servicesMetrics[oneContainer].memPercent.push(metrics[oneContainer].memPercent);
								currentScope.servicesMetrics[oneContainer].currentMemPercent = metrics[oneContainer].memPercent;
								if (currentScope.servicesMetrics[oneContainer].memPercent.length > maxData) {
									currentScope.servicesMetrics[oneContainer].memPercent.shift();
								}
							}

							if (metrics[oneContainer].hasOwnProperty('memoryLimit')) {
								currentScope.servicesMetrics[oneContainer].memoryLimit = convertBytes(metrics[oneContainer].memoryLimit);
							}

							if (currentScope.envPlatform === 'docker') {
								if (!currentScope.servicesMetrics[oneContainer].blkIO) {
									currentScope.servicesMetrics[oneContainer].blkIO = [[], []];
									currentScope.chartOptions[oneContainer].blkIO = {
										series: [
											"Input",
											"Output"
										],
										override: [
											{
												borderColor: "rgba(0, 199, 82, 1)",
												backgroundColor: "rgba(0, 199, 82, 0.6)",
												pointHoverBackgroundColor: "rgba(0, 199, 82, 0.6)",
												pointHoverBorderColor: "rgba(0, 199, 82, 1)",
												borderWidth: 3,
												pointRadius: 0,
												pointHitRadius: 5,
												fill: false
											},
											{
												borderColor: "rgba(51, 110, 230, 1)",
												backgroundColor: "rgba(51, 110, 230, 0.6)",
												pointHoverBackgroundColor: "rgba(51, 110, 230, 0.6)",
												pointHoverBorderColor: "rgba(51, 110, 230, 1)",
												borderWidth: 3,
												pointRadius: 0,
												pointHitRadius: 5,
												fill: false
											}
										],
										options: {
											legend: {
												display: true
											},
											title: {
												display: true,
												text: 'Block I/O'
											},
											animation: {
												duration: 0,
											},
											tooltips: {
												callbacks: {
													label: function (tooltipItem) {
														return currentScope.chartOptions[oneContainer].blkIO.series[tooltipItem.datasetIndex] + ": " + convertToMetric(tooltipItem.yLabel);
													}
												}
											},
											scales: {
												yAxes: [
													{
														id: 'blkIO',
														type: 'linear',
														display: true,
														position: 'left',
														scaleLabel: {
															labelString: 'Bytes',
															display: true,

														},
														ticks: {
															callback: function (bytes) {
																return convertToMetric(bytes);
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
								currentScope.servicesMetrics[oneContainer].blkIO[0].push((metrics[oneContainer].hasOwnProperty('blkRead')) ? metrics[oneContainer].blkRead : 0);
								currentScope.servicesMetrics[oneContainer].blkIO[1].push((metrics[oneContainer].hasOwnProperty('blkWrite')) ? metrics[oneContainer].blkWrite : 0);
								if (currentScope.servicesMetrics[oneContainer].blkIO[0].length > maxData) {
									currentScope.servicesMetrics[oneContainer].blkIO[0].shift();
									currentScope.servicesMetrics[oneContainer].blkIO[1].shift();
								}

								if (!currentScope.servicesMetrics[oneContainer].netIO) {
									currentScope.servicesMetrics[oneContainer].netIO = [[], []];
									currentScope.chartOptions[oneContainer].netIO = {
										series: [
											"Input",
											"Output"
										],
										override: [
											{
												borderColor: "rgba(0, 199, 82, 1)",
												backgroundColor: "rgba(0, 199, 82, 0.6)",
												pointHoverBackgroundColor: "rgba(0, 199, 82, 0.6)",
												pointHoverBorderColor: "rgba(0, 199, 82, 1)",
												borderWidth: 3,
												pointRadius: 0,
												pointHitRadius: 5,
												fill: false
											},
											{
												borderColor: "rgba(51, 110, 230, 1)",
												backgroundColor: "rgba(51, 110, 230, 0.6)",
												pointHoverBackgroundColor: "rgba(51, 110, 230, 0.6)",
												pointHoverBorderColor: "rgba(51, 110, 230, 1)",
												borderWidth: 3,
												pointRadius: 0,
												pointHitRadius: 5,
												fill: false
											}
										],
										options: {
											legend: {
												display: true
											},
											title: {
												display: true,
												text: 'Network I/O'
											},
											animation: {
												duration: 0,
											},
											tooltips: {
												callbacks: {
													label: function (tooltipItem) {
														return currentScope.chartOptions[oneContainer].netIO.series[tooltipItem.datasetIndex] + ": " + convertToMetric(tooltipItem.yLabel);
													}
												}
											},
											scales: {
												yAxes: [
													{
														id: 'netIO',
														type: 'linear',
														display: true,
														position: 'left',
														scaleLabel: {
															labelString: 'Bytes',
															display: true,

														},
														ticks: {
															callback: function (bytes) {
																return convertToMetric(bytes);
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
								currentScope.servicesMetrics[oneContainer].netIO[0].push((metrics[oneContainer].hasOwnProperty('netIn')) ? metrics[oneContainer].netIn : 0);
								currentScope.servicesMetrics[oneContainer].netIO[1].push((metrics[oneContainer].hasOwnProperty('netOut')) ? metrics[oneContainer].netOut : 0);
								if (currentScope.servicesMetrics[oneContainer].netIO[0].length > maxData) {
									currentScope.servicesMetrics[oneContainer].netIO[0].shift();
									currentScope.servicesMetrics[oneContainer].netIO[1].shift();
								}

							}
						}
					});
					
				}
				if (currentScope.envPlatform === 'kubernetes' && currentScope.access.hacloud.nodes.metrics) {
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "get",
						"routeName": "/dashboard/cloud/metrics/nodes",
						"params": {
							"env": env
						}
					}, function (error, metrics) {
						if (error || !metrics) {
							console.log(translation.unableRetrieveNodesMetrics[LANG]);
						}
						var nodes = Object.keys(metrics);
						nodes.forEach(function (oneNode) {
							if (!currentScope.nodesMetrics) {
								currentScope.nodesMetrics = {};
							}
							
							if (!currentScope.nodesMetrics[oneNode]) {
								currentScope.nodesMetrics[oneNode] = {};
							}
							
							if (!currentScope.chartOptions) {
								currentScope.chartOptions = {};
							}
							
							if (!currentScope.chartOptions[oneNode]) {
								currentScope.chartOptions[oneNode] = {};
							}
							if(metrics[oneNode]) {
								if (metrics[oneNode].hasOwnProperty('timestamp')) {
									var ts = new Date(metrics[oneNode].timestamp).toLocaleString('en-US', {
										hour: 'numeric',
										minute: 'numeric',
										second: 'numeric',
										hour12: false
									});
									if (!currentScope.nodesMetrics[oneNode].timestamp) {
										currentScope.nodesMetrics[oneNode].timestamp = []
									}
									currentScope.nodesMetrics[oneNode].timestamp.push(ts);
									if (currentScope.nodesMetrics[oneNode].timestamp.length > maxData) {
										currentScope.nodesMetrics[oneNode].timestamp.shift();
									}
								}
								
								if (metrics[oneNode].hasOwnProperty('memory')) {
									if (!currentScope.nodesMetrics[oneNode].memory) {
										currentScope.nodesMetrics[oneNode].memory = [];
										currentScope.chartOptions[oneNode].memory = {
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
													text: (metrics[oneNode].memoryLimit) ? "Memory usage out of " + convertBytes(metrics[oneNode].memoryLimit) : 'Memory usage'
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
									currentScope.nodesMetrics[oneNode].memory.push(metrics[oneNode].memory);
									currentScope.nodesMetrics[oneNode].currentMemory = convertBytes(metrics[oneNode].memory);
									if (currentScope.nodesMetrics[oneNode].memory.length > maxData) {
										currentScope.nodesMetrics[oneNode].memory.shift();
									}
								}
								
								if (metrics[oneNode].hasOwnProperty('cpu')) {
									if (!currentScope.nodesMetrics[oneNode].cpu) {
										currentScope.nodesMetrics[oneNode].cpu = [];
										currentScope.chartOptions[oneNode].cpu = {
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
																labelString: 'CPU (nanoCores)',
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
									currentScope.nodesMetrics[oneNode].cpu.push(metrics[oneNode].cpu);
									currentScope.nodesMetrics[oneNode].currentCpu = metrics[oneNode].cpu;
									if (currentScope.nodesMetrics[oneNode].cpu.length > maxData) {
										currentScope.nodesMetrics[oneNode].cpu.shift();
									}
								}
							}
						});
						
					});
				}
				if (cb) {
					return cb();
				}
			});
		}
		else {
			if (cb) {
				return cb();
			}
		}
		
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
	
	function convertToMetric(bytes) {
		if (bytes < 1000) {
			return (bytes) + ' B';
		} else if (bytes < 1000000) {
			return (bytes / 1000).toFixed(2) + ' kB';
		} else if (bytes < 1000000000) {
			return (bytes / 1000000).toFixed(2) + ' MB';
		} else {
			return (bytes / 1000000000).toFixed(2) + ' GB';
		}
	}

	function checkMetricsServer(currentScope, cb) {
		if(currentScope.envPlatform !== 'kubernetes') {
			currentScope.isMetricsServerDeployed = true;
			if(cb) return cb();
		}
		else{
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cloud/resource',
				params: {
					"env": currentScope.envCode,
					"resource": "metrics-server",
					"namespace": "kube-system"
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.getServicesMetrics(function () {
						currentScope.isMetricsServerDeployed = response.deployed;
						if(cb) return cb();
					});
				}
			});
		}
	}
	
	return {
		'checkMetricsServer': checkMetricsServer,
		"getServicesMetrics" : getServicesMetrics
	};
}]);
