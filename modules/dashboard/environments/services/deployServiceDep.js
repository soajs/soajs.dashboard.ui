"use strict";
var deployService = soajsApp.components;
deployService.service('deployServiceDep', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function getServiceBranches(currentScope, opts, cb) {
		currentScope.loadingBranches = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				'id': opts.gitAccount._id,
				'provider': opts.gitAccount.provider,
				'name': opts.repo.full_name,
				'type': 'repo'
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (opts.cd) {
					currentScope.branches = response.branches;
				}
			}
			if (opts.cd) {
				currentScope.loadingBranches = false;
				cb();
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getServiceInEnv(currentScope, env, serviceName, cb) {
		buildFormData(currentScope, env, serviceName, cb)
	}
	
	function getCDRecipe(currentScope, oneRepo, cb) {
		currentScope.cdConfiguration = null;
		var defaultCD = {
			"branch": "master",
			"strategy": "notify",
			"default": true
		};
		currentScope.cdData = {};
		currentScope.cdData[currentScope.oneEnv] = {};
		if (currentScope.version === 'Default') {
			currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv] = (currentScope.services[currentScope.oneSrv].deploySettings) ? currentScope.services[currentScope.oneSrv].deploySettings : {};
		}
		else {
			currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv] = {};
			if (currentScope.serviceType === 'daemon') {
				currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv][currentScope.version] = (currentScope.services[currentScope.oneSrv].deploySettings && currentScope.services[currentScope.oneSrv].deploySettings[currentScope.daemonGrpConf] ) ? currentScope.services[currentScope.oneSrv].deploySettings[currentScope.daemonGrpConf] : {};
			} else {
				currentScope.cdData[currentScope.oneEnv][currentScope.oneSrv][currentScope.version] = (currentScope.services[currentScope.oneSrv].deploySettings) ? currentScope.services[currentScope.oneSrv].deploySettings : {};
			}
		}
		currentScope.cdConfiguration = {};
		currentScope.cdConfiguration[currentScope.oneSrv] = {
			type: currentScope.serviceType,
			icon: 'minus'
		};
		
		var max = Object.keys(currentScope.cdConfiguration).length;
		currentScope.maxEntries = 0;
		var repoCount = 0;
		populateServiceInEnvironments(currentScope.oneSrv, defaultCD, function () {
			repoCount++;
			if (repoCount === max) {
				for (var oneService in currentScope.cdConfiguration) {
					if (currentScope.cdConfiguration[oneService].display) {
						currentScope.maxEntries++;
					}
				}
				getServiceBranches(currentScope, {
					gitAccount: currentScope.gitAccount,
					repo: oneRepo,
					cd: true
				}, function () {
					return cb();
				});
			}
		});
		
		function populateServiceInEnvironments(serviceName, defaultCD, mCb) {
			var oneCDEnv = currentScope.oneEnv;
			var types = ['service', 'daemon', 'other'];
			if (serviceName && currentScope.cdConfiguration[serviceName] && currentScope.cdConfiguration[serviceName].type && types.indexOf(currentScope.cdConfiguration[serviceName].type) !== -1) {
				if (!currentScope.cdData[oneCDEnv.toUpperCase()]) {
					currentScope.cdData[oneCDEnv.toUpperCase()] = defaultCD;
				}
				currentScope.cdConfiguration[serviceName].name = serviceName;
				if (!Object.hasOwnProperty.call(currentScope.cdConfiguration[serviceName], 'display')) {
					currentScope.cdConfiguration[serviceName].display = false;
				}
				currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()] = {
					"cdData": {},
					"display": false
				};
				currentScope.cdConfiguration[serviceName][oneCDEnv.toUpperCase()].cdData.versions = {};
				getEnvServices(oneCDEnv, serviceName, function () {
					return mCb();
				});
			} else {
				mCb();
			}
		}
		
		function getEnvServices(envCode, serviceName, mCb) {
			getServiceInEnv(currentScope, envCode, serviceName, mCb);
		}
	}
	
	function buildFormData(currentScope, env, serviceName, cb) {
		var dashboardServices = ['dashboard', 'proxy'];
		if (dashboardServices.indexOf(serviceName) !== -1) {
			return cb();
		}
		
		if (!currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj) {
			currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj = {
				branches: [],
				ha: {}
			};
		}
		//cdData was saved before, fill entries from arriving db of cdData
		if (currentScope.cdData[env.toUpperCase()][serviceName]) {
			currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			var cdData = currentScope.cdConfiguration[serviceName][env.toUpperCase()].cdData;
			if (!cdData.versions) {
				cdData.versions = {};
			}
			if (cdData.branch || cdData.strategy || cdData.options) {
				cdData.versions['Default'] = {'active': true};
			}
			if (cdData.branch) {
				cdData.versions['Default'].branch = cdData.branch;
				delete cdData.branch;
			}
			if (cdData.strategy) {
				cdData.versions['Default'].strategy = cdData.strategy;
				delete cdData.strategy;
			}
			if (cdData.options) {
				cdData.versions['Default'].options = cdData.options;
				delete cdData.options;
			}
			if (cdData.deploy) {
				cdData.versions['Default'].deploy = cdData.deploy;
				// currentScope.setDeploy(env.toUpperCase(), 'Default', serviceName);
				delete cdData.deploy;
			}
			var cdDataClone = angular.copy(currentScope.cdData[env.toUpperCase()][serviceName]);
			delete cdDataClone.branch;
			delete cdDataClone.strategy;
			delete cdDataClone.options;
			delete cdDataClone.deploy;
			delete cdDataClone.type;
			if (Object.keys(cdDataClone).length > 0) {
				for (var version in cdDataClone) {
					var v = version.replace('v', '');
					cdData.versions[v] = cdDataClone[version];
					cdData.versions[v].active = true;
				}
			}
			if (cdData.versions && Object.keys(cdData.versions).length === 0) {
				delete cdData.versions;
			}
		}
		currentScope.cdConfiguration[serviceName][env.toUpperCase()].obj.ha[version] = currentScope.services[serviceName];
		currentScope.cdConfiguration[serviceName].display = true;
		currentScope.cdConfiguration[serviceName][env.toUpperCase()].display = true;
		return cb();
		
	}
	
	function buildDeployForm($scope, currentScope, oneRepo, service, version, gitAccount, daemonGrpConf, isKubernetes, cb) {
		if(isKubernetes === undefined){
			//re-calculate isKubernetes
			var envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
			var envPlatform = envDeployer.selected.split('.')[1];
			isKubernetes = (envPlatform && envPlatform.toLowerCase() === "kubernetes");
		}
		
		$scope.controllerScope = currentScope;
		$scope.isKubernetes = isKubernetes;
		$scope.deployNewService = true;
		$scope.version = version.v || 'Default';
		if(!$scope.oneEnv){
			$scope.oneEnv = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code.toUpperCase();
		}
		$scope.secretsAllowed = 'none';
		$scope.cdEnvs = [$scope.oneEnv];
		$scope.deployed = false;
		$scope.recipes = angular.copy(currentScope.recipes);
		
		$scope.oneSrv = (service && service.name) ? service.name : oneRepo.name;
		$scope.serviceType = (service && service.type) ? service.type : 'other';
		$scope.showCD = true;
		$scope.isAutoScalable = currentScope.isAutoScalable || false;
		$scope.autoScale = false;
		if (daemonGrpConf) {
			$scope.daemonGrpConf = daemonGrpConf;
		}
		if (SOAJSRMS.indexOf(oneRepo.name) !== -1) {
			$scope.showCD = false;
		}
		$scope.services = {};
		if ($scope.version === 'Default') {
			$scope.services[$scope.oneSrv] = service || oneRepo;
		} else {
			$scope.services[$scope.oneSrv] = version;
		}
		if (($scope.services[$scope.oneSrv].deployed && $scope.serviceType !== 'daemon') || (daemonGrpConf && $scope.services[$scope.oneSrv][daemonGrpConf] && $scope.services[$scope.oneSrv][daemonGrpConf].deployed)) {
			$scope.serviceId = ($scope.serviceType === 'daemon' && daemonGrpConf && $scope.services[$scope.oneSrv][daemonGrpConf]) ? $scope.services[$scope.oneSrv][daemonGrpConf].serviceId : $scope.services[$scope.oneSrv].serviceId;
			$scope.deployed = true;
		}
		$scope.default = false;
		$scope.gitAccount = gitAccount;
		$scope.alerts = [];
		$scope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
		
		$scope.updateGitBranch = function (oneSrv, oneEnv, version) {
			if($scope.branches){
				$scope.branches.forEach(function (oneBranch) {
					if (oneBranch.name === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch){
						if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch;
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.commit = oneBranch.commit.sha;
						}
					}
				});
			}
		};
		
		$scope.displayAlert = function (type, msg, isCode, service, orgMesg) {
			$scope.alerts = [];
			if (isCode) {
				var msgT = getCodeMessage(msg, service, orgMesg);
				if (msgT) {
					msg = msgT;
				}
			}
			$scope.alerts.push({'type': type, 'msg': msg});
		};
		
		$scope.closeAlert = function (index) {
			$scope.alerts.splice(index, 1);
		};
		
		$scope.showHide = function (oneService, name) {
			if (oneService.icon === 'minus') {
				oneService.icon = 'plus';
				jQuery('#cd_' + name).slideUp();
			}
			else {
				oneService.icon = 'minus';
				jQuery('#cd_' + name).slideDown()
			}
		};
		
		$scope.cdShowHide = function (oneSrv, name) {
			if ($scope.cdConfiguration[oneSrv].icon === 'minus') {
				$scope.cdConfiguration[oneSrv].icon = 'plus';
				jQuery('#cdc_' + name).slideUp();
			}
			else {
				$scope.cdConfiguration[oneSrv].icon = 'minus';
				jQuery('#cdc_' + name).slideDown()
			}
		};
		
		$scope.activateAutoScale = function () {
			$scope.autoScale = !$scope.autoScale;
		};
		
		$scope.setDeploy = function (oneEnv, version, oneSrv) {
			var deployedBranch = '';
			if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch) {
				deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.branch;
			}
			if ($scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version] && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels && $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch']) {
				deployedBranch = $scope.cdConfiguration[oneSrv][oneEnv].obj.ha[version].labels['service.branch'];
			}
			if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active) {
				delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active;
			}
			else if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions || !$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions = {};
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version] = {
					branch: deployedBranch,
					active: true
				};
			}
			else {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].active = true;
			}
			
			if(!$scope.noCDoverride){
				$scope.myRecipes = [];
				for (var type in $scope.recipes) {
					$scope.recipes[type].forEach(function (oneRecipe) {
						if (oneRecipe.recipe && ['service', 'daemon', 'other'].indexOf(oneRecipe.type) !== -1) {
							$scope.myRecipes.push(oneRecipe);
						}
					});
				}
			}
			
			if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options = {'deployConfig': {'replication': {}}};
			}
			if ($scope.isAutoScalable && !$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.autoScale) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.autoScale = {
					"replicas": {},
					"metrics": {
						"cpu": {}
					}
				}
			}
			else if (!$scope.noCDoverride && $scope.isAutoScalable
				&& $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig
				&& $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication
				&& $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode
				&& $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode === 'deployment'
			) {
				$scope.autoScale = true;
			}
			if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource = {};
			}
			
			$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.owner = (oneRepo.owner && oneRepo.owner.login) ? oneRepo.owner.login : oneRepo.owner;
			$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.gitSource.repo = oneRepo.name;
			if (isKubernetes) {
				$scope.deploymentModes = ['deployment', 'daemonset'];
				if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) {
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode = 'deployment';
				}
			}
			else {
				$scope.deploymentModes = ['replicated', 'global'];
				if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode) {
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.replication.mode = 'replicated';
				}
			}
			var service = $scope.services[oneSrv];
			$scope.groupConfigs = '';
			if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit) {
				if (service && service.prerequisites) {
					if (service.prerequisites.memory && service.prerequisites.memory.trim().length > 0) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = parseFloat(service.prerequisites.memory);
					}
					else {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
					}
					if (service.prerequisites.cpu && service.prerequisites.cpu.trim().length > 0 && isKubernetes) {
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.cpuLimit = service.prerequisites.cpu;
					}
				} else {
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
				}
			}
			else {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit /= 1048576;
				if ($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit < 1) {
					$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.deployConfig.memoryLimit = 500;
				}
			}
			if (service && $scope.serviceType === 'daemon' && service.grpConf) {
				$scope.groupConfigs = service.grpConf;
			}
			
			// on load if u need edit cicd
			
			$scope.injectCatalogEntries(oneEnv, version, oneSrv);
		};
		
		$scope.injectCatalogEntries = function (oneEnv, version, oneSrv) {
			$scope.allowGitOverride = false;
			if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom = {};
			}
			if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env = {};
			}
			$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].custom = {};
			if ($scope.serviceType === 'daemon' && $scope.daemonGrpConf) {
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.daemonGroup = $scope.daemonGrpConf;
			}
			for (var type in $scope.recipes) {
				$scope.recipes[type].forEach(function (catalogRecipe) {
					if (catalogRecipe._id === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.recipe) {
						if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image && catalogRecipe.recipe.deployOptions.image.override) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image = {};
						}
						if (catalogRecipe.recipe.deployOptions.image.override) {
							if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.prefix)
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.prefix = catalogRecipe.recipe.deployOptions.image.prefix;
							
							if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.name)
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.name = catalogRecipe.recipe.deployOptions.image.name;
							
							if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.tag)
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image.tag = catalogRecipe.recipe.deployOptions.image.tag;
						}
						else if (!catalogRecipe.recipe.deployOptions.image.override) {
							delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.image;
						}
						//append inputs whose type is userInput
						for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
							if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
								var newCatalogInput = {
									label: catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
									name: envVariable,
									value: catalogRecipe.recipe.buildOptions.env[envVariable].default || "",
									fieldMsg: catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg,
									required: false,
								};
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].custom[envVariable] = newCatalogInput;
								if (!$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env[envVariable]) {
									$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env[envVariable] = catalogRecipe.recipe.buildOptions.env[envVariable].default || "";
								}
							}
						}
						if (Object.keys($scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env).length === 0) {
							delete $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.env;
						}
						
						$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.env = oneEnv;
						if (['service', 'daemon', 'other'].indexOf(catalogRecipe.type) !== -1) {
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.name = oneSrv;
							$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.type = $scope.cdConfiguration[oneSrv].type;
							if (version !== 'Default') {
								$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.version = version;
							}
							$scope.allowGitOverride = true;
						}
						
						//add check, if recipe does not support certificates, do not show the secrets input at all
						$scope.secretsAllowed = 'none';
						if(catalogRecipe.recipe.deployOptions.certificates && catalogRecipe.recipe.deployOptions.certificates !== 'none'){
							$scope.secretsAllowed = catalogRecipe.recipe.deployOptions.certificates;
						}
					}
				});
			}
			
			let selectedRecipe;
			let recipes = $scope.recipes;
			
			for (let type in $scope.recipes) {
				recipes[type].forEach(function (catalogRecipe) {
					if (catalogRecipe._id === $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.recipe) {
						selectedRecipe = catalogRecipe;
					}
				});
			}
			$scope.setExposedPorts(oneEnv, version, oneSrv, selectedRecipe, cb);
			$scope.setSourceCodeData(oneEnv, version, oneSrv, selectedRecipe);
		};
		
		$scope.setExposedPorts = function (oneEnv, version, oneSrv, selectedRecipe, cb) {
			let ports;
			let recipe = false;
			if ($scope.services && $scope.services[oneSrv] && $scope.services[oneSrv].deploySettings
				&& $scope.services[oneSrv].deploySettings.options
				&& $scope.services[oneSrv].deploySettings.options.custom
				&& $scope.services[oneSrv].deploySettings.options.custom.ports
				&& $scope.services[oneSrv].deploySettings.options.custom.ports.length > 0){
				ports = angular.copy($scope.services[oneSrv].deploySettings.options.custom.ports);
			}
			let formDataRoot = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options;
			if(selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.ports
				&& Array.isArray(selectedRecipe.recipe.deployOptions.ports)
				&& selectedRecipe.recipe.deployOptions.ports.length > 0 ) {
				//check if at least of the ports is exposed
				if (!ports){
					recipe = true;
					ports = selectedRecipe.recipe.deployOptions.ports;
				}
				if (!formDataRoot.custom){
					formDataRoot.custom = {};
				}
				if (recipe){
					formDataRoot.custom.ports = [];
				}
				//check if there port mismatch in type
				let nodePort =0, loadBalancer=0;
				selectedRecipe.recipe.deployOptions.ports.forEach(function (onePort) {
					if (recipe){
						formDataRoot.custom.ports.push(onePort);
					}
					if(onePort.isPublished || onePort.published){
						formDataRoot.custom.loadBalancer = true;
						formDataRoot.custom.ports.push(onePort);
						if (onePort.published){
							if (recipe) {
								formDataRoot.custom.loadBalancer = false;
							}
							nodePort++;
						}
						else {
							loadBalancer++;
						}
					}
				});
				if (loadBalancer !== 0 && nodePort !==0){
					// todo fix this!
					// return cb(new Error("Invalid Port Configuration Detected"));
				}
				if (ports && !recipe){
					//get the type of the ports
					formDataRoot.custom.ports = [];
					ports.forEach(function (onePort) {
						formDataRoot.custom.ports.push(onePort);
						if(onePort.isPublished || onePort.published){
							formDataRoot.custom.loadBalancer = true;
							if (onePort.published){
								formDataRoot.custom.loadBalancer = false;
							}
						}
					});
				}
			}
		};
		
		$scope.useLoadBalancer = function (oneSrv, oneEnv, version){
			if ($scope.cdConfiguration[oneSrv] && $scope.cdConfiguration[oneSrv][oneEnv] && $scope.cdConfiguration[oneSrv] && $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version]){
				$scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options.custom.ports.forEach(function (onePort) {
					delete onePort.published;
				});
			}
		};
		
		$scope.setSourceCodeData = function (oneEnv, version, oneSrv, selectedRecipe) {
			
			let formDataRoot = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options;
			let formData = formDataRoot.custom;
			$scope.sourceCodeConfig = {
				configuration: {
					isEnabled: false,
					repoAndBranch: {
						disabled: false,
						required: false
					}
				}
			};
			
			if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
				let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				let conf = sourceCode.configuration;
				
				$scope.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;
				
				if (!formData.sourceCode) {
					formData.sourceCode = {};
				}
				
				if (conf) {
					$scope.sourceCodeConfig.configuration.isEnabled = true;
					$scope.sourceCodeConfig.configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
					$scope.sourceCodeConfig.configuration.repoAndBranch.required = conf.required;
					
					if (conf.repo && conf.repo !== '') {
						if (!formData.sourceCode.configuration) {
							formData.sourceCode.configuration = {};
						}
						
						formData.sourceCode.configuration.repo = conf.repo;
						formData.sourceCode.configuration.branch = conf.branch;
					} else {
						if (formData.sourceCode.configuration && (!formData.sourceCode.configuration.repo || formData.sourceCode.configuration.repo === '')) {
							formData.sourceCode.configuration.repo = '-- Leave Empty --';
						}
					}
				}
				
				if (conf) {
					$scope.listAccounts(oneEnv, version, oneSrv, function () {
						// special case: if the form was overwritten from cicd we have to load the branch
						if (formData.sourceCode) {
							if (formData.sourceCode.configuration && formData.sourceCode.configuration.repo) {
								if (!$scope.configReposBranches[formData.sourceCode.configuration.repo]) {
									$scope.fetchBranches(oneEnv, version, oneSrv, 'conf');
								}
							}
						}
					});
				}
			} else {
				if (!formData) {
					formData = {};
				}
				formData.sourceCode = {}; // clear
			}
		};
		
		$scope.listAccounts = function (oneEnv, version, oneSrv, callback) {
			getSendDataFromServer($scope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/gitAccounts/accounts/list',
				params: {
					fullList: true
				}
			}, function (error, response) {
				if (error) {
					$scope.displayAlert('danger', error.message);
				} else {
					let configRecords = [];
					
					configRecords.push({name: "-- Leave Empty --"});
					
					if (response) {
						response.forEach(function (eachAccount) {
							if (eachAccount.repos) {
								eachAccount.repos.forEach(function (eachRepo) {
									// eachRepo : name, serviceName, type
									if (eachRepo.type === 'config') {
										configRecords.push({
											owner: eachAccount.owner,
											provider: eachAccount.provider,
											accountId: eachAccount._id.toString(),
											name: eachRepo.name,
											type: eachRepo.type,
											configSHA: eachRepo.configSHA
										});
									}
								});
							}
						});
					}
					
					$scope.configRepos.config = configRecords;
					
					callback();
				}
			});
		};
		
		$scope.fetchBranches = function (oneEnv, version, oneSrv) {
			let formDataRoot = $scope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options;
			let formData = formDataRoot.custom;
			
			let selectedRepo = formData.sourceCode.configuration.repo;
			
			if (!selectedRepo || selectedRepo === '' || selectedRepo === '-- Leave Empty --') {
				return;
			}
			
			let accountData = {};
			$scope.configRepos.config.forEach(function (eachAcc) {
				if (eachAcc.name === selectedRepo) {
					accountData = eachAcc;
				}
			});
			
			$scope.configReposBranchesStatus[selectedRepo] = 'loading';
			getSendDataFromServer($scope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/gitAccounts/getBranches',
				params: {
					id: accountData.accountId,
					name: selectedRepo,
					type: 'repo',
					provider: accountData.provider
				}
			}, function (error, response) {
				if (error) {
					$scope.configReposBranchesStatus[selectedRepo] = 'failed';
					$scope.displayAlert('danger', error.message);
				} else {
					$scope.configReposBranchesStatus[selectedRepo] = 'loaded';
					$scope.configReposBranches[selectedRepo] = response.branches;
				}
			});
		};
		
		$scope.getSecrets = function (oneEnv, cb) {
			if($scope.kubeEnv && $scope.kubeEnv === 'invalid'){
				if($scope.defaultWizardSecretValues){
					$scope.secrets = $scope.defaultWizardSecretValues;
				}
				return cb();
			}
			
			let params = {
				env: ($scope.kubeEnv)? $scope.kubeEnv.toUpperCase() : oneEnv.toUpperCase()
			};
			
			if(isKubernetes && $scope.kubeNamespace){
				params.namespace = $scope.kubeNamespace;
			}
			
			getSendDataFromServer($scope, ngDataApi, {
				'method': 'get',
				'routeName': '/dashboard/secrets/list',
				params: params
			}, function (error, secrets) {
				if (error) {
					$scope.displayAlert('danger', error.message);
				} else {
					delete secrets.soajsauth;
					$scope.secrets = $scope.defaultWizardSecretValues || [];
					if (secrets && Array.isArray(secrets) && secrets.length > 0) {
						secrets.forEach((oneSecret) => {
							let found = false;
							$scope.secrets.forEach((oneExistingSecret) => {
								if(oneExistingSecret.name === oneSecret.name){
									found = true;
								}
							});
							
							if(!found){
								$scope.secrets.push(oneSecret);
							}
						});
					}
					return cb();
				}
			});
		};
		
		if(!$scope.noCDoverride){
			getCDRecipe($scope, oneRepo, function () {
				$scope.getSecrets($scope.oneEnv, function (){
					$scope.setDeploy($scope.oneEnv, $scope.version, $scope.oneSrv, cb)
				});
			});
		}
		else{
			getServiceBranches($scope, {gitAccount: $scope.gitAccount, repo: oneRepo, cd: true}, function (cb) {
				getServiceInEnv($scope, $scope.oneEnv, $scope.oneSrv, () => {
					$scope.getSecrets($scope.oneEnv, function () {
						$scope.setDeploy($scope.oneEnv, $scope.version, $scope.oneSrv, cb);
					});
				});
			});
		}
		
		// source code updates
		$scope.configRepos = [];
		$scope.configReposBranches = {};
		$scope.configReposBranchesStatus = {};
		
	}
	
	return {
		'buildDeployForm': buildDeployForm
	}
	
}]);