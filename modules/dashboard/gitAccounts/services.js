"use strict";
var repoService = soajsApp.components;
repoService.service('repoSrv', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$compile', 'detectBrowser', function (ngDataApi, $timeout, $modal, $cookies, $window, $compile, detectBrowser) {

	function configureRepo(currentScope, oneRepo, gitAccount, config) {
		var envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
		var envPlatform = envDeployer.selected.split('.')[1];
		currentScope.configureRepoEditor = true;
		var exceptionProviders = ['drone'];
		currentScope.services = {};
		currentScope.tabLabel = 'Version ';
		currentScope.default = false;
		currentScope.gitAccount = gitAccount;
		currentScope.alerts = [];
		currentScope.imagePath = 'themes/' + themeToUse + '/img/loading.gif';
		currentScope.images = {
			travis: "./themes/" + themeToUse + "/img/travis_logo.png",
			drone: "./themes/" + themeToUse + "/img/drone_logo.png",
			jenkins: "./themes/" + themeToUse + "/img/jenkins_logo.png",
			teamcity: "./themes/" + themeToUse + "/img/teamcity_logo.png"
		};
		currentScope.myBrowser = detectBrowser();
		currentScope.activatedRepo = false;

		currentScope.showBuildLogs = function(oneBuild){
			oneBuild.hide = !oneBuild.hide;
			
			if(oneBuild.hide){
				jQuery("#build_" + oneBuild.id).slideUp();
			}
			else{
				jQuery("#build_" + oneBuild.id).slideDown();
			}
		};
		
		currentScope.aceLoaded = function (_editor) {
			_editor.setShowPrintMargin(false);
			_editor.$blockScrolling = Infinity;
			_editor.renderer.setScrollMargin(20, 20, 20, 50);
		};
		
		currentScope.goTOCI = function () {
			currentScope.$parent.go('#/continuous-integration');
			configureRepo.close();
		};

		currentScope.cancel = function () {
			currentScope.configureRepoEditor = false;
			//currentScope.listAccounts();
		};

		currentScope.toggleStatus = function (provider, status) {
			if(!currentScope.access.enableDisableCIRepo){
				currentScope.form.displayAlert('danger', "You do not have access to Turn ON/Off a repo at CI provider.");
			}
			else{
				toggleStatus(currentScope, status, oneRepo, provider, function () {
					currentScope.activatedRepo = !status;
					if (status) {
						currentScope.showCIConfigForm(provider);
					}
					else {
						currentScope.form = {};
					}
				});
			}
		};

		currentScope.displayAlert = function (type, msg, isCode, service, orgMesg) {
			currentScope.alerts = [];
			if (isCode) {
				var msgT = getCodeMessage(msg, service, orgMesg);
				if (msgT) {
					msg = msgT;
				}
			}
			currentScope.alerts.push({'type': type, 'msg': msg});
		};

		currentScope.closeAlert = function (index) {
			currentScope.alerts.splice(index, 1);
		};

		currentScope.showCIConfigForm = function (oneProvider) {
			currentScope.ciRepoName = oneRepo.full_name;
			currentScope.activatedRepo = false;
			currentScope.noCiConfig = (oneProvider) ? false : true;
			
			if (currentScope.noCiConfig) {
				currentScope.activatedRepo = true;
				return false;
			}
			$timeout(function(){
				overlayLoading.show();
				getRepoCIBuildDetails(currentScope, oneProvider, () => {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/ci/settings',
						params: {
							'id': oneRepo.full_name,
							"provider": oneProvider.provider,
							"owner": oneProvider.owner
						}
					}, function (error, response) {
						overlayLoading.hide();
						if (error) {
							if(error.code === 976){
								currentScope.activatedRepo = true;
							}
							else{
								currentScope.displayAlert('danger', error.message);
							}
						}
						else {
							currentScope.activatedRepo = !response.settings.active;
							
							var customEnvs = response.envs;
							var formConfig = angular.copy(config.form.settings);
							
							var providerSettings = angular.copy(config.providers[oneProvider.provider]);
							formConfig.entries[0].entries = providerSettings;
							
							for (var oneVar in oneProvider.variables) {
								formConfig.entries[1].entries.push({
									'name': oneVar,
									'label': oneVar,
									'value': oneProvider.variables[oneVar],
									'disabled': true,
									'type': 'text'
								});
							}
							
							formConfig.entries[1].entries.push({
								"type": "html",
								"value": "<br /><p><em>Once you submit this form, the above SOAJS environment variables will be added to your repository configuration.</em></p>"
							});
							
							var count = 0;
							formConfig.entries[2].entries = [];
							customEnvs.forEach(function (enVar) {
								if (!oneProvider.variables[enVar.name]) {
									var oneClone = angular.copy(config.form.envVar);
									for (var i = 0; i < oneClone.length; i++) {
										oneClone[i].name = oneClone[i].name.replace("%count%", count);
										if (oneClone[i].name.indexOf('envName') !== -1) {
											oneClone[i].value = enVar.name;
										}
										if (oneClone[i].name.indexOf('envVal') !== -1) {
											oneClone[i].value = enVar.value;
										}
										
										if(exceptionProviders.indexOf(oneProvider.provider) !== -1 && !oneClone[i].value || oneClone[i].value === ''){
											oneClone[i].required = false;
											oneClone[i].fieldMsg = "If you don't want to modify this environment variable, Leave its value empty.";
										}
									}
									formConfig.entries[2].entries = formConfig.entries[2].entries.concat(oneClone);
									count++;
								}
							});
							
							
							var oneClone = angular.copy(config.form.envVar);
							for (var i = 0; i < oneClone.length; i++) {
								oneClone[i].name = oneClone[i].name.replace("%count%", count);
							}
							formConfig.entries[2].entries = formConfig.entries[2].entries.concat(oneClone);
							count++;
							
							formConfig.entries.push({
								"name": "addEnv",
								"type": "html",
								"value": '<span class="f-left"><input type="button" class="btn btn-sm btn-success" value="Add New Variable"></span>',
								"onAction": function (id, data, form) {
									var oneClone = angular.copy(config.form.envVar);
									for (var i = 0; i < oneClone.length; i++) {
										oneClone[i].name = oneClone[i].name.replace("%count%", count);
									}
									form.entries[2].entries = form.entries[2].entries.concat(oneClone);
									count++;
								}
							});
							
							formConfig.entries.push({
								type: "html",
								value: "<hr />"
							});
							
							if(currentScope.access.getCIProviders) {
								getProviderRecipes(currentScope, {
									'provider': oneProvider.provider,
									'owner': oneProvider.owner
								}, function (providerRecipes) {
									
									currentScope.providerRecipes = providerRecipes[oneProvider.provider];
									var recipesGroup = {
										"type": "accordion",
										"name": "providerRecipes",
										"label": "Available " + oneProvider.provider + " Recipes",
										"collapsed": true,
										"entries": [
											{
												"type": "html",
												"value": "<div id='recipebuttons' class='table w-100 c-both'></div>"
											}
										],
										"fieldMsg": "The following Recipes are available at <b>" + oneProvider.provider + "</b>, and might be compatible to run the build of your repository code."
									};
									var recipes = [];
									providerRecipes[oneProvider.provider].forEach(function (oneRecipe) {
										recipes.push({
											"type": "html",
											"value": "<a id='recipe" + oneRecipe._id.toString() + "' class='btn btn-default recipeButtons' tooltip='Click to Download Recipe'>" + oneRecipe.name +
											"<span class='f-right' style='top:0;'>&nbsp;Download</span>" +
											"<span class='icon icon-download3 f-right'></span>" +
											"</a>",
											"onAction": function (id, data, form) {
												currentScope.downloadRecipe(oneRecipe._id);
												return false;
											}
										});
									});
									
									recipesGroup.entries = recipesGroup.entries.concat(recipes);
									formConfig.entries.push(recipesGroup);
									if(currentScope.access.getCIRepoCustomRecipe){
										getRepoRecipeFromBranch(currentScope, gitAccount, oneProvider, oneRepo, providerRecipes, function (branchInput) {
											formConfig.entries.push({
												"type": "accordion",
												"name": "repoRecipe",
												"label": "Repository Recipe",
												"entries": [branchInput]
											});
											
											var options = {
												timeout: $timeout,
												entries: formConfig.entries,
												name: 'repoSettings',
												data: response.settings,
												actions: [
													{
														type: 'submit',
														label: "Update Settings",
														btn: 'primary',
														action: function (formData) {
															var data = {
																"port": (mydomainport || 80)
															};
															data.port = data.port.toString();
															switch(oneProvider.provider){
																case 'travis':
																	data.settings = {
																		"build_pull_requests": formData.build_pull_requests,
																		"build_pushes": formData.build_pushes,
																		"builds_only_with_travis_yml": formData.builds_only_with_travis_yml,
																		"maximum_number_of_builds": formData.maximum_number_of_builds
																	};
																	break;
																case 'drone':
																	data.settings = {
																		"allow_push": formData.allow_push,
																		"allow_pr": formData.allow_pr,
																		"allow_tags": formData.allow_tags,
																		"allow_tag": formData.allow_tag,
																		"allow_deploys": formData.allow_deploys,
																		"allow_deploy": formData.allow_deploys,
																		"gated": formData.gated
																	};
																	response.settings.repoCiId = response.settings.full_name;
																	break;
															}
															
															data.variables = {};
															for (var i = 0; i < count; i++) {
																if (!oneProvider.variables[formData['envName' + i]]) {
																	data.variables[formData['envName' + i]] = formData['envVal' + i];
																}
															}
															
															if (currentScope.access.updateCIRepoSettings) {
																// overlayLoading.show();
																// getSendDataFromServer(currentScope, ngDataApi, {
																// 	method: 'put',
																// 	routeName: '/dashboard/ci/settings',
																// 	params: {
																// 		'id': response.settings.repoCiId,
																// 		"provider": oneProvider.provider,
																// 		"owner": oneProvider.owner
																// 	},
																// 	data: data
																// }, function (error, response) {
																// 	overlayLoading.hide();
																// 	if (error) {
																// 		currentScope.form.displayAlert('danger', error.message);
																// 	}
																// 	else {
																currentScope.displayAlert('success', 'Repository Settings Updated.');
																currentScope.form.formData = {};
																currentScope.showCIConfigForm(oneProvider);
																// }
																// });
															}
															else {
																currentScope.displayAlert('danger', "You Do not have access to update the Repo CI Settings.");
															}
														}
													},
													{
														type: 'reset',
														label: 'Cancel',
														btn: 'danger',
														action: function () {
															currentScope.form.formData = {};
															currentScope.cancel();
														}
													}
												]
											};
											
											if (currentScope.providerRecipes.length > 0) {
												if (currentScope.access.downloadCDScript) {
													options.actions.unshift({
														"type": "button",
														"label": "Download CD Script",
														"btn": "success",
														"action": function () {
															if (currentScope.myBrowser === 'safari') {
																$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
																return null;
															}
															
															overlayLoading.show();
															getSendDataFromServer(currentScope, ngDataApi, {
																method: 'get',
																routeName: '/dashboard/ci/script/download',
																headers: {
																	"Accept": "application/zip"
																},
																responseType: 'arraybuffer',
																params: {
																	'provider': oneProvider.provider
																}
															}, function (error, response) {
																overlayLoading.hide();
																if (error) {
																	currentScope.form.displayAlert('danger', error.message);
																}
																else {
																	openSaveAsDialog("soajs.cd.zip", response, "application/zip");
																}
															});
														}
													});
												}
												else {
													currentScope.form.displayAlert('danger', "You do not have access to download the CD Script.");
												}
											}
											
											buildForm(currentScope, null, options, function () {
											
											});
										});
									}
									else{
										currentScope.form.displayAlert('danger', "You do not have access to retrieve the CI Configuration Recipe of this Repo.");
									}
								});
							}
							else{
								currentScope.displayAlert('danger', "You do not have access to retrieve the CI Providers of this Repo.");
							}
						}
					});
				});
			}, 500);
		};

		currentScope.cdShowHide = function (oneSrv, name) {
			if (currentScope.cdConfiguration[oneSrv].icon === 'minus') {
				currentScope.cdConfiguration[oneSrv].icon = 'plus';
				jQuery('#cdc_' + name).slideUp();
			}
			else {
				currentScope.cdConfiguration[oneSrv].icon = 'minus';
				jQuery('#cdc_' + name).slideDown()
			}
		};
		
		currentScope.getCIRecipe = function(){
			getCIRecipe(currentScope, function(){
			
			});
		};
		
		currentScope.saveRecipe = function () {
			saveRecipe(currentScope, function () {

			});
		};
		
		currentScope.downloadRecipe = function(oneRecipeId){
			if(currentScope.access.downloadCIRecipe){
				downloadProviderRecipe(currentScope, oneRecipeId);
			}
			else{
				currentScope.form.displayAlert('danger', "You Do not have access to download a CI Recipe.");
			}
		};
		
		if(!currentScope.access.getCIAccountInfo){
			currentScope.form.displayAlert('danger', "You Do not have access to retrieve CI Account information.");
		}
		else{
			getCIRecipe(currentScope, gitAccount, function(ciProviders){
				currentScope.ciProviders = ciProviders;
				if(ciProviders.length> 0){
					currentScope.showCIConfigForm(ciProviders[0]);
				}
				else{
					currentScope.showCIConfigForm(null);
				}
			});
		}
	}
	
	function fancyTimeFormat( time ) {
		// Hours, minutes and seconds
		var hrs = Math.floor(time / 3600);
		var mins = Math.floor((time % 3600) / 60);
		var secs = time % 60;
		
		// Output like "1:01" or "4:03:59" or "123:03:59"
		var ret = "";
		
		if (hrs > 0) {
			ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
		}
		
		ret += "" + mins + " min, " + (secs < 10 ? "0" : "");
		ret += "" + secs + " sec";
		return ret;
	}
	
	function getRepoCIBuildDetails(currentScope, oneProvider, cb){
		oneProvider.repoBuildHistory = {
			"master": {
				"hide": true,
				"id": 331844360,
				"number": "172",
				"state": "finished",
				"result": 0,
				"started_at": "2018-01-22T14:50:01Z",
				"finished_at": "2018-01-22T14:56:57Z",
				"duration": fancyTimeFormat(416),
				"commit": "9ce0e48495822605fae0a1afe3718c3306e93183",
				"message": "bumped version to 2.0.6",
				"config": JSON.stringify({
					"sudo": "required",
					"group": "deprecated-2017Q2",
					"language": "node_js",
					"node_js": "6.9.5",
					"services": [
						"mongodb",
						"docker"
					],
					"env": [
						"CXX=g++-4.8"
					],
					"branches": {
						"only": [
							"staging",
							"master"
						]
					},
					"addons": {
						"apt": {
							"sources": [
								"ubuntu-toolchain-r-test"
							],
							"packages": [
								"g++-4.8"
							]
						},
						"hosts": [
							"localhost",
							"dev-controller"
						]
					},
					"before_install": [
						"sudo apt-get update && sudo apt-get install sendmail python make g++"
					],
					"before_script": [
						"npm install -g grunt-cli",
						"docker pull soajsorg/soajs",
						"sleep 10"
					],
					"script": [
						"grunt coverage"
					],
					".result": "configured",
					"dist": "trusty"
				}, null, 2),
				"committer_name": "mikehajj",
				"compare": {
					"label": "7bc673f9c69d",
					"url": "https://github.com/soajs/soajs.dashboard/compare/7bc673f9c69d...9ce0e4849582"
				},
				"deploy": {
					"QA" : "notify",
					"DEV" : "update"
				},
				"logs": "travis_fold:start:worker_info\n" +
				"[0K[33;1mWorker information[0m\n" +
				"hostname: bfb564ba-bce1-4030-9f3b-67cf0539f7fd@1.production-5-worker-org-c-1-gce\n" +
				"version: v3.4.0 https://github.com/travis-ci/worker/tree/ce0440bc30c289a49a9b0c21e4e1e6f7d7825101\n" +
				"instance: travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-ci-sugilite-trusty-1480960799 (via amqp)\n" +
				"startup: 27.852668104s\n" +
				"travis_fold:end:worker_info\n" +
				"[0Ktravis_fold:start:system_info\n" +
				"[0K[33;1mBuild system information[0m\n" +
				"Build language: node_js\n" +
				"Build group: deprecated-2017Q2\n" +
				"Build dist: trusty\n" +
				"Build id: 331844360\n" +
				"Job id: 331844361\n" +
				"Runtime kernel version: 4.4.0-51-generic\n" +
				"travis-build version: c129335c3\n" +
				"[34m[1mBuild image provisioning date and time[0m\n" +
				"Mon Dec  5 18:47:20 UTC 2016\n" +
				"[34m[1mOperating System Details[0m\n" +
				"Distributor ID:\tUbuntu\n" +
				"Description:\tUbuntu 14.04.5 LTS\n" +
				"Release:\t14.04\n" +
				"Codename:\ttrusty\n" +
				"[34m[1mLinux Version[0m\n" +
				"4.4.0-51-generic\n" +
				"[34m[1mCookbooks Version[0m\n" +
				"998099c https://github.com/travis-ci/travis-cookbooks/tree/998099c\n" +
				"[34m[1mgit version[0m\n" +
				"git version 2.11.0\n" +
				"[34m[1mbash version[0m\n" +
				"GNU bash, version 4.3.11(1)-release (x86_64-pc-linux-gnu)\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>\n" +
				"\n" +
				"This is free software; you are free to change and redistribute it.\n" +
				"There is NO WARRANTY, to the extent permitted by law.\n" +
				"[34m[1mgcc version[0m\n" +
				"gcc (Ubuntu 4.8.4-2ubuntu1~14.04.3) 4.8.4\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"This is free software; see the source for copying conditions.  There is NO\n" +
				"warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n" +
				"\n" +
				"[34m[1mdocker version[0m\n" +
				"Client:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"\n" +
				"Server:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"[34m[1mclang version[0m\n" +
				"clang version 3.5.0 (tags/RELEASE_350/final)\n" +
				"Target: x86_64-unknown-linux-gnu\n" +
				"Thread model: posix\n" +
				"[34m[1mjq version[0m\n" +
				"jq-1.5\n" +
				"[34m[1mbats version[0m\n" +
				"Bats 0.4.0\n" +
				"[34m[1mgimme version[0m\n" +
				"v1.0.0\n" +
				"[34m[1mnvm version[0m\n" +
				"0.32.0\n" +
				"[34m[1mperlbrew version[0m\n" +
				"/home/travis/perl5/perlbrew/bin/perlbrew  - App::perlbrew/0.73\n" +
				"[34m[1mpostgresql client version[0m\n" +
				"psql (PostgreSQL) 9.6.1\n" +
				"[34m[1mphpenv version[0m\n" +
				"rbenv 1.1.0\n" +
				"[34m[1mrvm version[0m\n" +
				"rvm 1.27.0 (latest) by Wayne E. Seguin <wayneeseguin@gmail.com>, Michal Papis <mpapis@gmail.com> [https://rvm.io/]\n" +
				"[34m[1mdefault ruby version[0m\n" +
				"ruby 2.3.1p112 (2016-04-26 revision 54768) [x86_64-linux]\n" +
				"[34m[1mPre-installed Ruby versions[0m\n" +
				"jruby-9.1.2.0\n" +
				"ruby-1.9.3-p551\n" +
				"ruby-2.0.0-p648\n" +
				"ruby-2.1.10\n" +
				"ruby-2.2.5\n" +
				"ruby-2.3.1\n" +
				"[34m[1mPre-installed Node.js versions[0m\n" +
				"iojs-v1.6\n" +
				"iojs-v1.6.4\n" +
				"v0.10\n" +
				"v0.10.40\n" +
				"v0.11.16\n" +
				"v0.12.2\n" +
				"v0.12.7\n" +
				"v0.6.21\n" +
				"v0.8.28\n" +
				"v4.1.2\n" +
				"v4.6.2\n" +
				"v6.9.1\n" +
				"[34m[1mPre-installed Go versions[0m\n" +
				"1.2.2\n" +
				"1.3.3\n" +
				"1.4.3\n" +
				"1.5.4\n" +
				"1.6.3\n" +
				"1.7\n" +
				"[34m[1mmysql version[0m\n" +
				"mysql  Ver 14.14 Distrib 5.6.33, for debian-linux-gnu (x86_64) using  EditLine wrapper\n" +
				"[34m[1mPre-installed PostgreSQL versions[0m\n" +
				"9.2.19\n" +
				"9.3.15\n" +
				"9.4.10\n" +
				"9.5.5\n" +
				"9.6.1\n" +
				"[34m[1mRedis version[0m\n" +
				"redis-server 3.0.6\n" +
				"[34m[1mMongoDB version[0m\n" +
				"MongoDB 3.2.11\n" +
				"[34m[1mRabbitMQ Version[0m\n" +
				"3.6.6\n" +
				"[34m[1mInstalled Firefox version[0m\n" +
				"firefox 38.4.0esr\n" +
				"[34m[1mant version[0m\n" +
				"Apache Ant(TM) version 1.9.3 compiled on April 8 2014\n" +
				"[34m[1mmvn version[0m\n" +
				"Apache Maven 3.1.1 (0728685237757ffbf44136acec0402957f723d9a; 2013-09-17 15:22:22+0000)\n" +
				"Maven home: /usr/local/maven\n" +
				"Java version: 1.8.0_111, vendor: Oracle Corporation\n" +
				"Java home: /usr/lib/jvm/java-8-oracle/jre\n" +
				"Default locale: en_US, platform encoding: UTF-8\n" +
				"OS name: \"linux\", version: \"4.4.0-51-generic\", arch: \"amd64\", family: \"unix\"\n" +
				"[34m[1mgradle version[0m\n" +
				"\n" +
				"------------------------------------------------------------\n" +
				"Gradle 2.13\n" +
				"------------------------------------------------------------\n" +
				"\n" +
				"Build time:   2016-04-25 04:10:10 UTC\n" +
				"Build number: none\n" +
				"Revision:     3b427b1481e46232107303c90be7b05079b05b1c\n" +
				"\n" +
				"Groovy:       2.4.4\n" +
				"Ant:          Apache Ant(TM) version 1.9.6 compiled on June 29 2015\n" +
				"JVM:          1.8.0_111 (Oracle Corporation 25.111-b14)\n" +
				"OS:           Linux 4.4.0-51-generic amd64\n" +
				"\n" +
				"[34m[1mkerl list installations[0m\n" +
				"17.0\n" +
				"17.1\n" +
				"17.3\n" +
				"17.4\n" +
				"17.5\n" +
				"18.0\n" +
				"18.1\n" +
				"18.2\n" +
				"18.2.1\n" +
				"R14B02\n" +
				"R14B03\n" +
				"R14B04\n" +
				"R15B\n" +
				"R15B01\n" +
				"R15B02\n" +
				"R15B03\n" +
				"R16B\n" +
				"R16B01\n" +
				"R16B02\n" +
				"R16B03\n" +
				"R16B03-1\n" +
				"[34m[1mkiex list[0m\n" +
				"\n" +
				"kiex elixirs\n" +
				"\n" +
				"   elixir-1.0.3\n" +
				"=* elixir-1.0.4\n" +
				"\n" +
				"# => - current\n" +
				"# =* - current && default\n" +
				"#  * - default\n" +
				"\n" +
				"[34m[1mrebar --version[0m\n" +
				"rebar 2.6.4 17 20160831_145136 git 2.6.4-dirty\n" +
				"[34m[1mlein version[0m\n" +
				"WARNING: You're currently running as root; probably by accident.\n" +
				"Press control-C to abort or Enter to continue as root.\n" +
				"Set LEIN_ROOT to disable this warning.\n" +
				"Leiningen 2.7.1 on Java 1.8.0_111 Java HotSpot(TM) 64-Bit Server VM\n" +
				"[34m[1mperlbrew list[0m\n" +
				"  5.8 (5.8.8)\n" +
				"  5.10 (5.10.1)\n" +
				"  5.12 (5.12.5)\n" +
				"  5.14 (5.14.4)\n" +
				"  5.16 (5.16.3)\n" +
				"  5.18 (5.18.4)\n" +
				"  5.20 (5.20.3)\n" +
				"  5.20-extras (5.20.3)\n" +
				"  5.20-shrplib (5.20.3)\n" +
				"  5.20.3\n" +
				"  5.22 (5.22.0)\n" +
				"  5.22-extras (5.22.0)\n" +
				"  5.22-shrplib (5.22.0)\n" +
				"  5.22.0\n" +
				"[34m[1mphpenv versions[0m\n" +
				"  system\n" +
				"  5.4\n" +
				"  5.4.45\n" +
				"  5.5.37\n" +
				"  5.6\n" +
				"* 5.6.24 (set by /home/travis/.phpenv/version)\n" +
				"  7.0\n" +
				"  7.0.7\n" +
				"  hhvm\n" +
				"  hhvm-stable\n" +
				"[34m[1mcomposer --version[0m\n" +
				"Composer version 1.2.0 2016-07-19 01:28:52\n" +
				"travis_fold:end:system_info\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"travis_fold:start:git.checkout\n" +
				"[0Ktravis_time:start:189f4f26\n" +
				"[0K$ git clone --depth=50 --branch=master https://github.com/soajs/soajs.dashboard.git soajs/soajs.dashboard\n" +
				"Cloning into 'soajs/soajs.dashboard'...\n" +
				"\n" +
				"travis_time:end:189f4f26:start=1516632644778250512,finish=1516632645636160459,duration=857909947\n" +
				"[0K$ cd soajs/soajs.dashboard\n" +
				"$ git checkout -qf 9ce0e48495822605fae0a1afe3718c3306e93183\n" +
				"travis_fold:end:git.checkout\n" +
				"[0Ktravis_fold:start:apt\n" +
				"[0K[33;1mAdding APT Sources (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:1768ded0\n" +
				"[0K$ sudo -E apt-add-repository -y \"ppa:ubuntu-toolchain-r/test\"\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/secring.gpg' created\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/pubring.gpg' created\n" +
				"gpg: requesting key BA9EF27F from hkp server keyserver.ubuntu.com\n" +
				"gpg: /tmp/tmpzmwul48g/trustdb.gpg: trustdb created\n" +
				"gpg: key BA9EF27F: public key \"Launchpad Toolchain builds\" imported\n" +
				"gpg: Total number processed: 1\n" +
				"gpg:               imported: 1  (RSA: 1)\n" +
				"OK\n" +
				"\n" +
				"travis_time:end:1768ded0:start=1516632645662982749,finish=1516632647269286999,duration=1606304250\n" +
				"[0K[33;1mInstalling APT Packages (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:04eab060\n" +
				"[0K$ sudo -E apt-get -yq update &>> ~/apt-get-update.log\n" +
				"\n" +
				"travis_time:end:04eab060:start=1516632647279891866,finish=1516632665019623254,duration=17739731388\n" +
				"[0Ktravis_time:start:212f10ba\n" +
				"[0K$ sudo -E apt-get -yq --no-install-suggests --no-install-recommends --force-yes install g++-4.8\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"The following extra packages will be installed:\n" +
				"  cpp-4.8 gcc-4.8 gcc-4.8-base gcc-7-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libisl15 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6\n" +
				"  libtsan0\n" +
				"Suggested packages:\n" +
				"  gcc-4.8-locales g++-4.8-multilib gcc-4.8-doc libstdc++6-4.8-dbg\n" +
				"  gcc-4.8-multilib libgcc1-dbg libgomp1-dbg libitm1-dbg libatomic1-dbg\n" +
				"  libasan0-dbg libtsan0-dbg libquadmath0-dbg libstdc++-4.8-doc\n" +
				"The following NEW packages will be installed:\n" +
				"  gcc-7-base libisl15\n" +
				"The following packages will be upgraded:\n" +
				"  cpp-4.8 g++-4.8 gcc-4.8 gcc-4.8-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6 libtsan0\n" +
				"14 upgraded, 2 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 32.2 MB of archives.\n" +
				"After this operation, 2,905 kB of additional disk space will be used.\n" +
				"Get:1 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-7-base amd64 7.2.0-1ubuntu1~14.04 [17.6 kB]\n" +
				"Get:2 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++6 amd64 7.2.0-1ubuntu1~14.04 [305 kB]\n" +
				"Get:3 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libtsan0 amd64 7.2.0-1ubuntu1~14.04 [271 kB]\n" +
				"Get:4 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libisl15 amd64 0.15-3~14.04 [507 kB]\n" +
				"Get:5 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libmpfr4 amd64 3.1.3-1~14.04 [178 kB]\n" +
				"Get:6 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main g++-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [18.1 MB]\n" +
				"Get:7 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [5,067 kB]\n" +
				"Get:8 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main cpp-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [4,601 kB]\n" +
				"Get:9 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgomp1 amd64 7.2.0-1ubuntu1~14.04 [75.8 kB]\n" +
				"Get:10 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libitm1 amd64 7.2.0-1ubuntu1~14.04 [27.5 kB]\n" +
				"Get:11 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libatomic1 amd64 7.2.0-1ubuntu1~14.04 [9,012 B]\n" +
				"Get:12 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libquadmath0 amd64 7.2.0-1ubuntu1~14.04 [132 kB]\n" +
				"Get:13 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,051 kB]\n" +
				"Get:14 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgcc-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,687 kB]\n" +
				"Get:15 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libasan0 amd64 4.8.5-2ubuntu1~14.04.1 [63.1 kB]\n" +
				"Get:16 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8-base amd64 4.8.5-2ubuntu1~14.04.1 [15.4 kB]\n" +
				"Fetched 32.2 MB in 45s (710 kB/s)\n" +
				"Selecting previously unselected package gcc-7-base:amd64.\n" +
				"(Reading database ... 88286 files and directories currently installed.)\n" +
				"Preparing to unpack .../gcc-7-base_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"(Reading database ... 88293 files and directories currently installed.)\n" +
				"Preparing to unpack .../libstdc++6_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Setting up libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"(Reading database ... 88294 files and directories currently installed.)\n" +
				"Preparing to unpack .../libtsan0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libtsan0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Selecting previously unselected package libisl15:amd64.\n" +
				"Preparing to unpack .../libisl15_0.15-3~14.04_amd64.deb ...\n" +
				"Unpacking libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Preparing to unpack .../libmpfr4_3.1.3-1~14.04_amd64.deb ...\n" +
				"Unpacking libmpfr4:amd64 (3.1.3-1~14.04) over (3.1.2-1) ...\n" +
				"Preparing to unpack .../g++-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking g++-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../cpp-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking cpp-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgomp1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libgomp1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libitm1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libitm1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libatomic1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libatomic1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libquadmath0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libstdc++-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgcc-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libasan0_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8-base_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up libtsan0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Setting up libmpfr4:amd64 (3.1.3-1~14.04) ...\n" +
				"Setting up gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up cpp-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libgomp1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libitm1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libatomic1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up gcc-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up g++-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"\n" +
				"travis_time:end:212f10ba:start=1516632665026664875,finish=1516632718829250552,duration=53802585677\n" +
				"[0Ktravis_fold:end:apt\n" +
				"[0Ktravis_fold:start:services\n" +
				"[0Ktravis_time:start:06fcc922\n" +
				"[0K$ sudo service mongod start\n" +
				"mongod start/running, process 4294\n" +
				"\n" +
				"travis_time:end:06fcc922:start=1516632718880715697,finish=1516632718911712375,duration=30996678\n" +
				"[0Ktravis_time:start:061c3428\n" +
				"[0K$ sudo service docker start\n" +
				"start: Job is already running: docker\n" +
				"\n" +
				"travis_time:end:061c3428:start=1516632718918079959,finish=1516632718935524992,duration=17445033\n" +
				"[0Ktravis_fold:end:services\n" +
				"[0Ktravis_fold:start:hosts.before\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant \n" +
				"travis_fold:end:hosts.before\n" +
				"[0Ktravis_fold:start:hosts\n" +
				"[0Ktravis_fold:end:hosts\n" +
				"[0Ktravis_fold:start:hosts.after\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant  localhost dev-controller\n" +
				"travis_fold:end:hosts.after\n" +
				"[0K\n" +
				"[33;1mSetting environment variables from repository settings[0m\n" +
				"$ export SOAJS_TEST_GIT_PWD=[secure]\n" +
				"$ export SOAJS_TEST_GIT_TOKEN=[secure]\n" +
				"\n" +
				"[33;1mSetting environment variables from .travis.yml[0m\n" +
				"$ export CXX=g++-4.8\n" +
				"\n" +
				"$ export PATH=./node_modules/.bin:$PATH\n" +
				"[33;1mUpdating nvm[0m\n" +
				"travis_fold:start:nvm.install\n" +
				"[0Ktravis_time:start:259cca10\n" +
				"[0K$ nvm install 6.9.5\n" +
				"Downloading and installing node v6.9.5...\n" +
				"Downloading https://nodejs.org/dist/v6.9.5/node-v6.9.5-linux-x64.tar.xz...\n" +
				"Computing checksum with sha256sum\n" +
				"Checksums matched!\n" +
				"Now using node v6.9.5 (npm v3.10.10)\n" +
				"\n" +
				"travis_time:end:259cca10:start=1516632722982336187,finish=1516632727149257648,duration=4166921461\n" +
				"[0Ktravis_fold:end:nvm.install\n" +
				"[0K$ node --version\n" +
				"v6.9.5\n" +
				"$ npm --version\n" +
				"3.10.10\n" +
				"$ nvm --version\n" +
				"0.33.8\n" +
				"travis_fold:start:before_install\n" +
				"[0Ktravis_time:start:2dc3852e\n" +
				"[0K$ sudo apt-get update && sudo apt-get install sendmail python make g++\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release.gpg\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2 InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg InRelease\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release\n" +
				"Ign http://dl.google.com stable InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security InRelease\n" +
				"Hit http://dl.google.com stable Release.gpg\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Sources\n" +
				"Hit http://dl.google.com stable Release\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse i386 Packages\n" +
				"Ign http://toolbelt.heroku.com ./ InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en_US\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main amd64 Packages\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Sources\n" +
				"Hit http://toolbelt.heroku.com ./ Release\n" +
				"Hit http://dl.google.com stable/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Sources\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/main amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted amd64 Packages\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en_US\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty/main amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Packages\n" +
				"Get:1 https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/universe i386 Packages\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty InRelease\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse i386 Packages\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Translation-en\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main i386 Packages\n" +
				"Get:2 https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:3 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:4 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Reading package lists...\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"g++ is already the newest version.\n" +
				"g++ set to manually installed.\n" +
				"make is already the newest version.\n" +
				"make set to manually installed.\n" +
				"python is already the newest version.\n" +
				"The following extra packages will be installed:\n" +
				"  procmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"Suggested packages:\n" +
				"  sendmail-doc rmail logcheck sasl2-bin\n" +
				"Recommended packages:\n" +
				"  default-mta mail-transport-agent fetchmail\n" +
				"The following NEW packages will be installed:\n" +
				"  procmail sendmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"0 upgraded, 6 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 844 kB of archives.\n" +
				"After this operation, 4,365 kB of additional disk space will be used.\n" +
				"Get:1 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-base all 8.14.4-4.1ubuntu1 [139 kB]\n" +
				"Get:2 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-cf all 8.14.4-4.1ubuntu1 [86.1 kB]\n" +
				"Get:3 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-bin amd64 8.14.4-4.1ubuntu1 [469 kB]\n" +
				"Get:4 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty-updates/main procmail amd64 3.22-21ubuntu0.2 [136 kB]\n" +
				"Get:5 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sensible-mda amd64 8.14.4-4.1ubuntu1 [8,246 B]\n" +
				"Get:6 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail all 8.14.4-4.1ubuntu1 [6,248 B]\n" +
				"Fetched 844 kB in 0s (15.8 MB/s)\n" +
				"Selecting previously unselected package sendmail-base.\n" +
				"(Reading database ... 88300 files and directories currently installed.)\n" +
				"Preparing to unpack .../sendmail-base_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-cf.\n" +
				"Preparing to unpack .../sendmail-cf_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-bin.\n" +
				"Preparing to unpack .../sendmail-bin_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package procmail.\n" +
				"Preparing to unpack .../procmail_3.22-21ubuntu0.2_amd64.deb ...\n" +
				"Unpacking procmail (3.22-21ubuntu0.2) ...\n" +
				"Selecting previously unselected package sensible-mda.\n" +
				"Preparing to unpack .../sensible-mda_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail.\n" +
				"Preparing to unpack .../sendmail_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"adduser: Warning: The home directory `/var/lib/sendmail' does not belong to the user you are currently creating.\n" +
				"Setting up sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"update-rc.d: warning: default stop runlevel arguments (0 1 6) do not match sendmail Default-Stop values (1)\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-mta (sendmail-mta) in auto mode\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-msp (sendmail-msp) in auto mode\n" +
				"\n" +
				"You are doing a new install, or have erased /etc/mail/sendmail.mc.\n" +
				"If you've accidentaly erased /etc/mail/sendmail.mc, check /var/backups.\n" +
				"\n" +
				"I am creating a safe, default sendmail.mc for you and you can\n" +
				"run sendmailconfig later if you need to change the defaults.\n" +
				"\n" +
				" * Stopping Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Updating sendmail environment ...\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Could not open /etc/mail/sendmail.mc(No such file or directory)\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Turning off Host Status collection\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"\n" +
				"Checking filesystem, this may take some time - it will not hang!\n" +
				"  ...   Done.\n" +
				" \n" +
				"Checking for installed MDAs...\n" +
				"Adding link for newly extant program (mail.local)\n" +
				"Adding link for newly extant program (procmail)\n" +
				"sasl2-bin not installed, not configuring sendmail support.\n" +
				"\n" +
				"To enable sendmail SASL2 support at a later date, invoke \"/usr/share/sendmail/update_auth\"\n" +
				"\n" +
				" \n" +
				"Creating/Updating SSL(for TLS) information\n" +
				"Creating /etc/mail/tls/starttls.m4...\n" +
				"Creating SSL certificates for sendmail.\n" +
				"Generating DSA parameters, 2048 bit long prime\n" +
				"This could take some time\n" +
				"............+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				".+.............+.+............+.......+.+...+..........+......+.............+....+........+...+...........................+.......+..+.....................+........+....+.+..........+.....+....+.....+...+.........+......+....+.+.................+.+...+......+.......+....+.......+........+.+.........+......+.+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				"Generating RSA private key, 2048 bit long modulus\n" +
				"................................+++\n" +
				".....+++\n" +
				"e is 65537 (0x10001)\n" +
				" \n" +
				"Updating /etc/hosts.allow, adding \"sendmail: all\".\n" +
				"\n" +
				"Please edit /etc/hosts.allow and check the rules location to\n" +
				"make sure your security measures have not been overridden -\n" +
				"it is common to move the sendmail:all line to the *end* of\n" +
				"the file, so your more selective rules take precedence.\n" +
				"Checking {sendmail,submit}.mc and related databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/Makefile...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Disabling HOST statistics file(/var/lib/sendmail/host_status).\n" +
				"Creating /etc/mail/sendmail.cf...\n" +
				"Creating /etc/mail/submit.cf...\n" +
				"Informational: confCR_FILE file empty: /etc/mail/relay-domains\n" +
				"Warning: confCT_FILE source file not found: /etc/mail/trusted-users\n" +
				" it was created\n" +
				"Informational: confCT_FILE file empty: /etc/mail/trusted-users\n" +
				"Warning: confCW_FILE source file not found: /etc/mail/local-host-names\n" +
				" it was created\n" +
				"Warning: access_db source file not found: /etc/mail/access\n" +
				" it was created\n" +
				"Updating /etc/mail/access...\n" +
				"Linking /etc/aliases to /etc/mail/aliases\n" +
				"Informational: ALIAS_FILE file empty: /etc/mail/aliases\n" +
				"Updating /etc/mail/aliases...\n" +
				"/etc/mail/aliases: 0 aliases, longest 0 bytes, 0 bytes total\n" +
				" \n" +
				"Warning: 3 database(s) sources\n" +
				"\twere not found, (but were created)\n" +
				"\tplease investigate.\n" +
				" * Starting Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Setting up procmail (3.22-21ubuntu0.2) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"\n" +
				"travis_time:end:2dc3852e:start=1516632728501391693,finish=1516632752436032451,duration=23934640758\n" +
				"[0Ktravis_fold:end:before_install\n" +
				"[0Ktravis_fold:start:install.npm\n" +
				"[0Ktravis_time:start:0271b378\n" +
				"[0K$ npm install \n" +
				"npm WARN deprecated github@0.2.4: 'github' has been renamed to '@octokit/rest' (https://git.io/vNB11)\n" +
				"npm WARN deprecated nodemailer@1.11.0: All versions below 4.0.1 of Nodemailer are deprecated. See https://nodemailer.com/status/\n" +
				"npm WARN deprecated graceful-fs@3.0.11: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"npm WARN deprecated minimatch@0.2.14: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated coffee-script@1.3.3: CoffeeScript on NPM has moved to \"coffeescript\" (no hyphen)\n" +
				"npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated graceful-fs@1.2.3: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"\n" +
				"> dtrace-provider@0.8.6 install /home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider\n" +
				"> node-gyp rebuild || node suppress-error.js\n" +
				"\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"make: Entering directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"  TOUCH Release/obj.target/DTraceProviderStub.stamp\n" +
				"make: Leaving directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"\n" +
				"> dtrace-provider@0.7.1 install /home/travis/build/soajs/soajs.dashboard/node_modules/ldapjs/node_modules/dtrace-provider\n" +
				"> node scripts/install.js\n" +
				"\n" +
				"soajs.dashboard@2.0.6 /home/travis/build/soajs/soajs.dashboard\n" +
				"├── async@2.1.4 \n" +
				"├─┬ bitbucket-server-nodejs@2.11.4 \n" +
				"│ ├─┬ query-string@4.3.4 \n" +
				"│ │ ├── object-assign@4.1.1 \n" +
				"│ │ └── strict-uri-encode@1.1.0 \n" +
				"│ └─┬ request-promise@4.2.2 \n" +
				"│   ├── bluebird@3.5.1 \n" +
				"│   ├── request-promise-core@1.1.1 \n" +
				"│   └── stealthy-require@1.1.1 \n" +
				"├── compare-versions@3.0.1 \n" +
				"├── cron@1.2.1 \n" +
				"├─┬ easy-zip@0.0.4 \n" +
				"│ └── async@2.6.0 \n" +
				"├── formidable@1.0.17 \n" +
				"├─┬ github@0.2.4 \n" +
				"│ └── mime@1.6.0 \n" +
				"├─┬ gridfs-stream@1.1.1 \n" +
				"│ └── flushwritable@1.0.0 \n" +
				"├─┬ grunt@0.4.5 \n" +
				"│ ├── async@0.1.22 \n" +
				"│ ├── coffee-script@1.3.3 \n" +
				"│ ├── colors@0.6.2 \n" +
				"│ ├── dateformat@1.0.2-1.2.3 \n" +
				"│ ├── eventemitter2@0.4.14 \n" +
				"│ ├── exit@0.1.2 \n" +
				"│ ├─┬ findup-sync@0.1.3 \n" +
				"│ │ ├─┬ glob@3.2.11 \n" +
				"│ │ │ └── minimatch@0.3.0 \n" +
				"│ │ └── lodash@2.4.2 \n" +
				"│ ├── getobject@0.1.0 \n" +
				"│ ├─┬ glob@3.1.21 \n" +
				"│ │ ├── graceful-fs@1.2.3 \n" +
				"│ │ └── inherits@1.0.2 \n" +
				"│ ├─┬ grunt-legacy-log@0.1.3 \n" +
				"│ │ ├─┬ grunt-legacy-log-utils@0.1.1 \n" +
				"│ │ │ ├── lodash@2.4.2 \n" +
				"│ │ │ └── underscore.string@2.3.3 \n" +
				"│ │ ├── lodash@2.4.2 \n" +
				"│ │ └── underscore.string@2.3.3 \n" +
				"│ ├─┬ grunt-legacy-util@0.2.0 \n" +
				"│ │ ├── async@0.1.22 \n" +
				"│ │ └── lodash@0.9.2 \n" +
				"│ ├── hooker@0.2.3 \n" +
				"│ ├── iconv-lite@0.2.11 \n" +
				"│ ├─┬ js-yaml@2.0.5 \n" +
				"│ │ ├─┬ argparse@0.1.16 \n" +
				"│ ��� │ ├── underscore@1.7.0 \n" +
				"│ │ │ └── underscore.string@2.4.0 \n" +
				"│ │ └── esprima@1.0.4 \n" +
				"│ ├── lodash@0.9.2 \n" +
				"│ ├─┬ minimatch@0.2.14 \n" +
				"│ │ ├── lru-cache@2.2.4 \n" +
				"│ │ └── sigmund@1.0.1 \n" +
				"│ ├─┬ nopt@1.0.10 \n" +
				"│ │ └── abbrev@1.1.1 \n" +
				"│ ├── rimraf@2.2.8 \n" +
				"│ ├── underscore.string@2.2.1 \n" +
				"│ └── which@1.0.9 \n" +
				"├─┬ grunt-contrib-clean@1.0.0 \n" +
				"│ └── async@1.5.2 \n" +
				"├─┬ grunt-contrib-copy@1.0.0 \n" +
				"│ ├─┬ chalk@1.1.3 \n" +
				"│ │ ├── ansi-styles@2.2.1 \n" +
				"│ │ ├─┬ has-ansi@2.0.0 \n" +
				"│ │ │ └── ansi-regex@2.1.1 \n" +
				"│ │ ├── strip-ansi@3.0.1 \n" +
				"│ │ └── supports-color@2.0.0 \n" +
				"│ └── file-sync-cmp@0.1.1 \n" +
				"├── grunt-contrib-jshint@1.1.0 \n" +
				"├─┬ grunt-coveralls@1.0.1 \n" +
				"│ └─┬ coveralls@2.13.3 \n" +
				"│   ├─┬ js-yaml@3.6.1 \n" +
				"│   │ └── esprima@2.7.3 \n" +
				"│   ├── lcov-parse@0.0.10 \n" +
				"│   ├── log-driver@1.2.5 \n" +
				"│   ├── minimist@1.2.0 \n" +
				"│   └─┬ request@2.79.0 \n" +
				"│     ├── caseless@0.11.0 \n" +
				"│     ├─┬ har-validator@2.0.6 \n" +
				"│     │ ├── commander@2.13.0 \n" +
				"│     │ ├─┬ is-my-json-valid@2.17.1 \n" +
				"│     │ │ ├── generate-function@2.0.0 \n" +
				"│     │ │ ├─┬ generate-object-property@1.2.0 \n" +
				"│     │ │ │ └── is-property@1.0.2 \n" +
				"│     │ │ ├── jsonpointer@4.0.1 \n" +
				"│     │ │ └── xtend@4.0.1 \n" +
				"│     │ └─┬ pinkie-promise@2.0.1 \n" +
				"│     │   └── pinkie@2.0.4 \n" +
				"│     ├── qs@6.3.2 \n" +
				"│     └── tunnel-agent@0.4.3 \n" +
				"├─┬ grunt-env@0.4.4 \n" +
				"│ ├── ini@1.3.5 \n" +
				"│ └── lodash@2.4.2 \n" +
				"├─┬ grunt-istanbul@0.7.2 \n" +
				"│ ├── chalk@1.1.1 \n" +
				"│ ├─┬ istanbul@0.4.5 \n" +
				"│ │ ├── abbrev@1.0.9 \n" +
				"│ │ ├── async@1.5.2 \n" +
				"│ │ ├─┬ escodegen@1.8.1 \n" +
				"│ │ │ ├── esprima@2.7.3 \n" +
				"│ │ │ ├── estraverse@1.9.3 \n" +
				"│ │ │ ├── esutils@2.0.2 \n" +
				"│ │ │ ├─┬ optionator@0.8.2 \n" +
				"│ │ │ │ ├── deep-is@0.1.3 \n" +
				"│ │ │ │ ├── fast-levenshtein@2.0.6 \n" +
				"│ │ │ │ ├── levn@0.3.0 \n" +
				"│ │ │ │ ├── prelude-ls@1.1.2 \n" +
				"│ │ │ │ ├── type-check@0.3.2 \n" +
				"│ │ │ │ └── wordwrap@1.0.0 \n" +
				"│ │ │ └─┬ source-map@0.2.0 \n" +
				"│ │ │   └── amdefine@1.0.1 \n" +
				"│ │ ├── esprima@2.7.3 \n" +
				"│ │ ├── glob@5.0.15 \n" +
				"│ │ ├─┬ handlebars@4.0.6 \n" +
				"│ │ │ ├── async@1.5.2 \n" +
				"│ │ │ ├─┬ optimist@0.6.1 \n" +
				"│ │ │ │ └── wordwrap@0.0.3 \n" +
				"│ │ │ ├── source-map@0.4.4 \n" +
				"│ │ │ └─┬ uglify-js@2.8.29 \n" +
				"│ │ │   ├── source-map@0.5.7 \n" +
				"│ │ │   ├── uglify-to-browserify@1.0.2 \n" +
				"│ │ │   └─┬ yargs@3.10.0 \n" +
				"│ │ │     ├── camelcase@1.2.1 \n" +
				"│ │ │     ├─┬ cliui@2.1.0 \n" +
				"│ │ │     │ ├─┬ center-align@0.1.3 \n" +
				"│ │ │     │ │ ├─┬ align-text@0.1.4 \n" +
				"│ │ │     │ │ │ ├─┬ kind-of@3.2.2 \n" +
				"│ │ │     │ │ │ │ └── is-buffer@1.1.6 \n" +
				"│ │ │     │ │ │ ├── longest@1.0.1 \n" +
				"│ │ │     │ │ │ └── repeat-string@1.6.1 \n" +
				"│ │ │     │ │ └���─ lazy-cache@1.0.4 \n" +
				"│ │ │     │ ├── right-align@0.1.3 \n" +
				"│ │ │     │ └── wordwrap@0.0.2 \n" +
				"│ │ │     ├── decamelize@1.2.0 \n" +
				"│ │ │     └── window-size@0.1.0 \n" +
				"│ │ ├─┬ js-yaml@3.10.0 \n" +
				"│ │ │ └── esprima@4.0.0 \n" +
				"│ │ ├── nopt@3.0.6 \n" +
				"│ │ ├─┬ once@1.4.0 \n" +
				"│ │ │ └── wrappy@1.0.2 \n" +
				"│ │ ├── resolve@1.1.7 \n" +
				"│ │ ├── supports-color@3.2.3 \n" +
				"│ │ ├─┬ which@1.3.0 \n" +
				"│ │ │ └── isexe@2.0.0 \n" +
				"│ │ └── wordwrap@1.0.0 \n" +
				"│ └── nue@0.7.1 \n" +
				"├─┬ grunt-jsdoc@2.1.0 \n" +
				"│ ├─┬ cross-spawn@3.0.1 \n" +
				"│ │ ├─┬ lru-cache@4.1.1 \n" +
				"│ │ │ ├── pseudomap@1.0.2 \n" +
				"│ │ │ └── yallist@2.1.2 \n" +
				"│ │ └── which@1.3.0 \n" +
				"│ └─┬ jsdoc@3.5.5 \n" +
				"│   ├── babylon@7.0.0-beta.19 \n" +
				"│   ├─┬ catharsis@0.8.9 \n" +
				"│   │ └─┬ underscore-contrib@0.3.0 \n" +
				"│   │   └── underscore@1.6.0 \n" +
				"│   ├─┬ js2xmlparser@3.0.0 \n" +
				"│   │ └── xmlcreate@1.0.2 \n" +
				"│   ├─┬ klaw@2.0.0 \n" +
				"│   │ └── graceful-fs@4.1.11 \n" +
				"│   ├── marked@0.3.12 \n" +
				"│   ├─┬ requizzle@0.2.1 \n" +
				"│   │ └── underscore@1.6.0 \n" +
				"│   ├── strip-json-comments@2.0.1 \n" +
				"│   ├── taffydb@2.6.2 \n" +
				"│   └── underscore@1.8.3 \n" +
				"├── grunt-mocha-test@0.13.2 \n" +
				"├─┬ jshint@2.9.4 \n" +
				"│ ├── cli@1.0.1 \n" +
				"│ ├─┬ console-browserify@1.1.0 \n" +
				"│ │ └── date-now@0.1.4 \n" +
				"│ ├─┬ htmlparser2@3.8.3 \n" +
				"│ │ ├── domelementtype@1.3.0 \n" +
				"│ │ ├── domhandler@2.3.0 \n" +
				"│ │ ├─┬ domutils@1.5.1 \n" +
				"│ │ │ └─┬ dom-serializer@0.1.0 \n" +
				"│ │ │   ├── domelementtype@1.1.3 \n" +
				"│ │ │   └── entities@1.1.1 \n" +
				"│ │ ├── entities@1.0.0 \n" +
				"│ │ └── readable-stream@1.1.14 \n" +
				"│ ├── lodash@3.7.0 \n" +
				"│ ├─┬ minimatch@3.0.4 \n" +
				"│ │ └─┬ brace-expansion@1.1.8 \n" +
				"│ │   ├── balanced-match@1.0.0 \n" +
				"│ │   └── concat-map@0.0.1 \n" +
				"│ ├── shelljs@0.3.0 \n" +
				"│ └── strip-json-comments@1.0.4 \n" +
				"├── kubernetes-client@2.2.3 \n" +
				"├── lodash@4.17.4 \n" +
				"├─┬ mkdirp@0.5.1 \n" +
				"│ └── minimist@0.0.8 \n" +
				"├─┬ mocha@3.2.0 \n" +
				"│ ├── browser-stdout@1.3.0 \n" +
				"│ ├─┬ commander@2.9.0 \n" +
				"│ │ └── graceful-readlink@1.0.1 \n" +
				"│ ├─┬ debug@2.2.0 \n" +
				"│ │ └── ms@0.7.1 \n" +
				"│ ├── diff@1.4.0 \n" +
				"│ ├── escape-string-regexp@1.0.5 \n" +
				"│ ├─┬ glob@7.0.5 \n" +
				"│ │ ├── fs.realpath@1.0.0 \n" +
				"│ │ ├── inflight@1.0.6 \n" +
				"│ │ ├── inherits@2.0.3 \n" +
				"│ │ └── path-is-absolute@1.0.1 \n" +
				"│ ├── growl@1.9.2 \n" +
				"│ ├── json3@3.3.2 \n" +
				"│ ├─┬ lodash.create@3.1.1 \n" +
				"│ │ ├─┬ lodash._baseassign@3.2.0 \n" +
				"│ │ │ ├── lodash._basecopy@3.0.1 \n" +
				"│ │ │ └─┬ lodash.keys@3.1.2 \n" +
				"│ │ │   ├── lodash._getnative@3.9.1 \n" +
				"│ │ │   ├── lodash.isarguments@3.1.0 \n" +
				"│ │ │   └── lodash.isarray@3.0.4 \n" +
				"│ │ ├── lodash._basecreate@3.0.3 \n" +
				"│ │ └── lodash._isiterateecall@3.0.9 \n" +
				"│ └─┬ supports-color@3.1.2 \n" +
				"│   └── has-flag@1.0.0 \n" +
				"├─┬ moment-timezone@0.5.11 \n" +
				"│ └── moment@2.20.1 \n" +
				"├── ncp@2.0.0 \n" +
				"├─┬ nock@9.0.13 \n" +
				"│ ├─┬ chai@3.5.0 \n" +
				"│ │ ├── assertion-error@1.1.0 \n" +
				"│ │ ├─┬ deep-eql@0.1.3 \n" +
				"│ │ │ └── type-detect@0.1.1 \n" +
				"│ │ └── type-detect@1.0.0 \n" +
				"│ ├─┬ debug@2.6.9 \n" +
				"│ │ └── ms@2.0.0 \n" +
				"│ ├── deep-equal@1.0.1 \n" +
				"│ ├── json-stringify-safe@5.0.1 \n" +
				"│ ├── propagate@0.4.0 \n" +
				"│ └── qs@6.4.0 \n" +
				"├── object-hash@1.1.5 \n" +
				"├─┬ request@2.81.0 \n" +
				"│ ├── aws-sign2@0.6.0 \n" +
				"│ ├── aws4@1.6.0 \n" +
				"│ ├── caseless@0.12.0 \n" +
				"│ ├─┬ combined-stream@1.0.5 \n" +
				"│ │ └── delayed-stream@1.0.0 \n" +
				"│ ├── extend@3.0.1 \n" +
				"│ ├── forever-agent@0.6.1 \n" +
				"│ ├─┬ form-data@2.1.4 \n" +
				"│ │ └── asynckit@0.4.0 \n" +
				"│ ├─┬ har-validator@4.2.1 \n" +
				"│ │ ├─┬ ajv@4.11.8 \n" +
				"│ │ │ ├── co@4.6.0 \n" +
				"│ │ │ └─┬ json-stable-stringify@1.0.1 \n" +
				"│ │ │   └── jsonify@0.0.0 \n" +
				"│ │ └── har-schema@1.0.5 \n" +
				"│ ├─┬ hawk@3.1.3 \n" +
				"│ │ ├── boom@2.10.1 \n" +
				"│ │ ├── cryptiles@2.0.5 \n" +
				"│ │ ├── hoek@2.16.3 \n" +
				"│ │ └── sntp@1.0.9 \n" +
				"│ ├─┬ http-signature@1.1.1 \n" +
				"│ │ ├── assert-plus@0.2.0 \n" +
				"│ │ ├─┬ jsprim@1.4.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├── extsprintf@1.3.0 \n" +
				"│ │ │ ├── json-schema@0.2.3 \n" +
				"│ │ │ └─┬ verror@1.10.0 \n" +
				"│ │ │   └── assert-plus@1.0.0 \n" +
				"│ │ └─┬ sshpk@1.13.1 \n" +
				"│ │   ├── asn1@0.2.3 \n" +
				"│ │   ├── assert-plus@1.0.0 \n" +
				"│ │   ├── bcrypt-pbkdf@1.0.1 \n" +
				"│ │   ├─┬ dashdash@1.14.1 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── ecc-jsbn@0.1.1 \n" +
				"│ │   ├─┬ getpass@0.1.7 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── jsbn@0.1.1 \n" +
				"│ │   └── tweetnacl@0.14.5 \n" +
				"│ ├── is-typedarray@1.0.0 \n" +
				"│ ├── isstream@0.1.2 \n" +
				"│ ├─┬ mime-types@2.1.17 \n" +
				"│ │ └── mime-db@1.30.0 \n" +
				"│ ├── oauth-sign@0.8.2 \n" +
				"│ ├── performance-now@0.2.0 \n" +
				"│ ├── safe-buffer@5.1.1 \n" +
				"│ ├── stringstream@0.0.5 \n" +
				"│ ├─┬ tough-cookie@2.3.3 \n" +
				"│ │ └── punycode@1.4.1 \n" +
				"│ ├── tunnel-agent@0.6.0 \n" +
				"│ └── uuid@3.2.1 \n" +
				"├─┬ rimraf@2.5.4 \n" +
				"│ └── glob@7.1.2 \n" +
				"├─┬ shelljs@0.7.5 \n" +
				"│ ├── interpret@1.1.0 \n" +
				"│ └── rechoir@0.6.2 \n" +
				"├── shortid@2.2.8 \n" +
				"├─┬ sinon@1.17.6 \n" +
				"│ ├── formatio@1.1.1 \n" +
				"│ ├── lolex@1.3.2 \n" +
				"│ ├── samsam@1.1.2 \n" +
				"│ └─┬ util@0.10.3 \n" +
				"│   └── inherits@2.0.1 \n" +
				"├─┬ soajs@2.0.3 \n" +
				"│ ├─┬ body-parser@1.18.2 \n" +
				"│ │ ├── bytes@3.0.0 \n" +
				"│ │ ├── content-type@1.0.4 \n" +
				"│ │ ├── depd@1.1.2 \n" +
				"│ │ ├─┬ http-errors@1.6.2 \n" +
				"│ │ │ ├── depd@1.1.1 \n" +
				"│ │ │ ├── setprototypeof@1.0.3 \n" +
				"│ │ │ └── statuses@1.4.0 \n" +
				"│ │ ├── iconv-lite@0.4.19 \n" +
				"│ │ ├─┬ on-finished@2.3.0 \n" +
				"│ │ │ └── ee-first@1.1.1 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├─┬ raw-body@2.3.2 \n" +
				"│ │ │ └── unpipe@1.0.0 \n" +
				"│ │ └─┬ type-is@1.6.15 \n" +
				"│ │   └── media-typer@0.3.0 \n" +
				"│ ├─┬ connect@3.6.5 \n" +
				"│ │ ├─┬ finalhandler@1.0.6 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── parseurl@1.3.2 \n" +
				"│ │ └── utils-merge@1.0.1 \n" +
				"│ ├─┬ cookie-parser@1.4.3 \n" +
				"│ │ ├── cookie@0.3.1 \n" +
				"│ │ └── cookie-signature@1.0.6 \n" +
				"│ ├─┬ express@4.16.0 \n" +
				"│ │ ├─┬ accepts@1.3.4 \n" +
				"│ │ │ └── negotiator@0.6.1 \n" +
				"│ │ ├── array-flatten@1.1.1 \n" +
				"│ │ ├── content-disposition@0.5.2 \n" +
				"│ │ ├── encodeurl@1.0.2 \n" +
				"│ │ ├── escape-html@1.0.3 \n" +
				"│ │ ├── etag@1.8.1 \n" +
				"│ │ ├── finalhandler@1.1.0 \n" +
				"│ │ ├── fresh@0.5.2 \n" +
				"│ │ ├── merge-descriptors@1.0.1 \n" +
				"│ │ ├── methods@1.1.2 \n" +
				"│ │ ├── path-to-regexp@0.1.7 \n" +
				"│ │ ├─┬ proxy-addr@2.0.2 \n" +
				"│ │ │ ├── forwarded@0.1.2 \n" +
				"│ │ │ └── ipaddr.js@1.5.2 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├── range-parser@1.2.0 \n" +
				"│ │ ├─┬ send@0.16.0 \n" +
				"│ │ │ ├── destroy@1.0.4 \n" +
				"│ │ │ ├── mime@1.4.1 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── serve-static@1.13.0 \n" +
				"│ │ ├── setprototypeof@1.1.0 \n" +
				"│ │ ├── statuses@1.3.1 \n" +
				"│ │ └── vary@1.1.2 \n" +
				"│ ├─┬ express-session@1.15.6 \n" +
				"│ │ ├── crc@3.4.4 \n" +
				"│ │ ├── on-headers@1.0.1 \n" +
				"│ │ └─┬ uid-safe@2.1.5 \n" +
				"│ │   └── random-bytes@1.0.0 \n" +
				"│ ├─┬ http-proxy@1.16.2 \n" +
				"│ │ ├── eventemitter3@1.2.0 \n" +
				"│ │ └── requires-port@1.0.0 \n" +
				"│ ├── merge@1.2.0 \n" +
				"│ ├── method-override@2.3.10 \n" +
				"│ ├─┬ morgan@1.9.0 \n" +
				"│ │ └── basic-auth@2.0.0 \n" +
				"│ ├── netmask@1.0.6 \n" +
				"│ ���─┬ oauth2-server@2.4.1 \n" +
				"│ │ └── basic-auth@0.0.1 \n" +
				"│ ├─┬ path-to-regexp@1.7.0 \n" +
				"│ │ └── isarray@0.0.1 \n" +
				"│ ├─┬ soajs.core.drivers@2.0.3 \n" +
				"│ │ ├─┬ dockerode@2.5.3  (git://github.com/soajs/dockerode.git#51ff2e2f1d2ba7b82bcdef31a2b85289218bd2a2)\n" +
				"│ │ │ ├─┬ concat-stream@1.5.2 \n" +
				"│ │ │ │ ├─┬ readable-stream@2.0.6 \n" +
				"│ │ │ │ │ └── isarray@1.0.0 \n" +
				"│ │ │ │ └── typedarray@0.0.6 \n" +
				"│ │ │ ├─┬ docker-modem@1.0.4  (git://github.com/aff04/docker-modem.git#c40f13261825c40ff7d3cf3019b090d7e81bacbf)\n" +
				"│ │ │ │ ├─┬ JSONStream@0.10.0 \n" +
				"│ │ │ │ │ ├── jsonparse@0.0.5 \n" +
				"│ │ │ │ │ └── through@2.3.8 \n" +
				"│ │ │ │ ├── readable-stream@1.0.34 \n" +
				"│ │ │ │ └── split-ca@1.0.1 \n" +
				"│ │ │ └─┬ tar-fs@1.12.0 \n" +
				"│ │ │   ├─┬ pump@1.0.3 \n" +
				"│ │ │   │ └── end-of-stream@1.4.1 \n" +
				"│ │ │   └─┬ tar-stream@1.5.5 \n" +
				"│ │ │     └── bl@1.2.1 \n" +
				"│ │ ├─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │ ├─┬ assign-deep@0.4.6 \n" +
				"│ │ │ │ ├── assign-symbols@0.1.1 \n" +
				"│ │ │ │ ├── is-primitive@2.0.0 \n" +
				"│ │ │ │ └── kind-of@5.1.0 \n" +
				"│ │ │ └── async@2.6.0 \n" +
				"│ │ └─┬ ws@3.3.1 \n" +
				"│ │   ├── async-limiter@1.0.0 \n" +
				"│ │   └── ultron@1.1.1 \n" +
				"│ ├── soajs.core.libs@1.0.1 \n" +
				"│ ├─┬ soajs.core.modules@2.0.1 \n" +
				"│ │ ├── bcryptjs@2.4.3 \n" +
				"│ │ ├─┬ bunyan@1.8.5 \n" +
				"│ ��� │ ├─┬ dtrace-provider@0.8.6 \n" +
				"│ │ │ │ └── nan@2.8.0 \n" +
				"│ │ │ ├─┬ mv@2.1.1 \n" +
				"│ │ │ │ └─┬ rimraf@2.4.5 \n" +
				"│ │ │ │   └── glob@6.0.4 \n" +
				"│ │ │ └── safe-json-stringify@1.0.4 \n" +
				"│ │ ├─┬ bunyan-format@0.2.1 \n" +
				"│ │ │ ├── ansicolors@0.2.1 \n" +
				"│ │ │ ├── ansistyles@0.1.3 \n" +
				"│ │ │ └─┬ xtend@2.1.2 \n" +
				"│ │ │   └── object-keys@0.4.0 \n" +
				"│ │ ├─┬ elasticsearch@12.1.3 \n" +
				"│ │ │ └─┬ promise@7.3.1 \n" +
				"│ │ │   └── asap@2.0.6 \n" +
				"│ │ ├── elasticsearch-deletebyquery@1.6.0 \n" +
				"│ │ ├── jsonschema@1.1.1 \n" +
				"│ │ ├─┬ mongodb@2.2.31 \n" +
				"│ │ │ ├── es6-promise@3.2.1 \n" +
				"│ │ │ ├─┬ mongodb-core@2.1.15 \n" +
				"│ │ │ │ ├── bson@1.0.4 \n" +
				"│ │ │ │ └─┬ require_optional@1.0.1 \n" +
				"│ │ │ │   ├── resolve-from@2.0.0 \n" +
				"│ │ │ │   └── semver@5.5.0 \n" +
				"│ │ │ └─┬ readable-stream@2.2.7 \n" +
				"│ │ │   ├── buffer-shims@1.0.0 \n" +
				"│ │ │   ├── isarray@1.0.0 \n" +
				"│ │ │   ├── process-nextick-args@1.0.7 \n" +
				"│ │ │   ├── string_decoder@1.0.3 \n" +
				"│ │ │   └── util-deprecate@1.0.2 \n" +
				"│ │ ├─┬ nodemailer@1.11.0 \n" +
				"│ │ │ ├─┬ libmime@1.2.0 \n" +
				"│ │ │ │ ├── libbase64@0.1.0 \n" +
				"│ │ │ │ └── libqp@1.1.0 \n" +
				"│ │ │ ├─┬ mailcomposer@2.1.0 \n" +
				"│ │ │ │ └─┬ buildmail@2.0.0 \n" +
				"│ │ │ │   ├── addressparser@0.3.2 \n" +
				"│ │ │ │   └── needle@0.10.0 \n" +
				"│ │ │ ├── needle@0.11.0 \n" +
				"│ │ │ ├─┬ nodemailer-direct-transport@1.1.0 \n" +
				"│ │ │ │ └── smtp-connection@1.3.8 \n" +
				"│ │ │ └─┬ nodemailer-smtp-transport@1.1.0 \n" +
				"│ │ │   └── clone@1.0.3 \n" +
				"│ │ ├─┬ nodemailer-direct-transport@3.3.2 \n" +
				"│ │ │ ├─┬ nodemailer-shared@1.1.0 \n" +
				"│ │ │ │ └── nodemailer-fetch@1.6.0 \n" +
				"│ │ │ └─┬ smtp-connection@2.12.0 \n" +
				"│ │ │   └─┬ httpntlm@1.6.1 \n" +
				"│ │ │     └── httpreq@0.4.24 \n" +
				"│ │ ├── nodemailer-sendmail-transport@1.0.0 \n" +
				"│ │ └─┬ nodemailer-smtp-transport@2.7.2 \n" +
				"│ │   ├── nodemailer-wellknown@0.1.10 \n" +
				"│ │   └── smtp-connection@2.12.0 \n" +
				"│ ├─┬ soajs.urac.driver@1.0.4 \n" +
				"│ │ ├── activedirectory@0.7.2 \n" +
				"│ │ ├─┬ ldapjs@1.0.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├─┬ backoff@2.5.0 \n" +
				"│ │ │ │ └── precond@0.2.3 \n" +
				"│ │ │ ├── dtrace-provider@0.7.1 \n" +
				"│ │ │ ├─┬ ldap-filter@0.2.2 \n" +
				"│ │ │ │ └── assert-plus@0.1.5 \n" +
				"│ │ │ └─┬ vasync@1.6.4 \n" +
				"│ │ │   └─┬ verror@1.6.0 \n" +
				"│ │ │     └── extsprintf@1.2.0 \n" +
				"│ │ ├── passport@0.4.0 \n" +
				"│ │ └── soajs.core.modules@1.0.9 \n" +
				"│ ├─┬ useragent@2.2.1 \n" +
				"│ │ └─┬ tmp@0.0.33 \n" +
				"│ │   └── os-tmpdir@1.0.2 \n" +
				"│ └── validator@6.2.0 \n" +
				"├── soajs.controller@2.0.3 \n" +
				"├── soajs.mongodb.data@2.0.0 \n" +
				"├── soajs.oauth@2.0.3 \n" +
				"├─┬ soajs.urac@2.0.3 \n" +
				"│ ├─┬ passport@0.3.2 \n" +
				"│ │ └── pause@0.0.1 \n" +
				"│ ├─┬ passport-facebook@2.1.1 \n" +
				"│ │ └─┬ passport-oauth2@1.4.0 \n" +
				"│ │   ├── oauth@0.9.15 \n" +
				"│ │   └── uid2@0.0.3 \n" +
				"│ ├── passport-github@1.1.0 \n" +
				"│ ├─┬ passport-google-oauth@1.0.0 \n" +
				"│ │ ├── passport-google-oauth1@1.0.0 \n" +
				"│ │ └── passport-google-oauth20@1.0.0 \n" +
				"│ ├─┬ passport-local@1.0.0 \n" +
				"│ │ └── passport-strategy@1.0.0 \n" +
				"│ ├─┬ passport-twitter@1.0.4 \n" +
				"│ │ ├── passport-oauth1@1.1.0 \n" +
				"│ │ └─┬ xtraverse@0.1.0 \n" +
				"│ │   └── xmldom@0.1.27 \n" +
				"│ ├─┬ soajs@2.0.2 \n" +
				"│ │ ├─┬ soajs.core.drivers@2.0.2 \n" +
				"│ │ │ └─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │   └── async@2.6.0 \n" +
				"│ │ └── soajs.core.modules@2.0.0 \n" +
				"│ └── uuid@3.0.1 \n" +
				"├─┬ unzip2@0.2.5 \n" +
				"│ ├─┬ binary@0.3.0 \n" +
				"│ │ ├── buffers@0.1.1 \n" +
				"│ │ └─┬ chainsaw@0.1.0 \n" +
				"│ │   └── traverse@0.3.9 \n" +
				"│ ├─┬ fstream@0.1.31 \n" +
				"│ │ └─┬ graceful-fs@3.0.11 \n" +
				"│ │   └── natives@1.1.1 \n" +
				"│ ├─┬ match-stream@0.0.2 \n" +
				"│ │ └── readable-stream@1.0.34 \n" +
				"│ ├─┬ pullstream@0.4.1 \n" +
				"│ │ ├── over@0.0.5 \n" +
				"│ │ ├── readable-stream@1.0.34 \n" +
				"│ │ └─┬ slice-stream@1.0.0 \n" +
				"│ │   └── readable-stream@1.0.34 \n" +
				"│ ├─┬ readable-stream@1.0.34 \n" +
				"│ │ ├── core-util-is@1.0.2 \n" +
				"│ │ └── string_decoder@0.10.31 \n" +
				"│ └── setimmediate@1.0.5 \n" +
				"└─┬ yamljs@0.2.8 \n" +
				"  └─┬ argparse@1.0.9 \n" +
				"    └── sprintf-js@1.0.3 \n" +
				"\n" +
				"\n" +
				"travis_time:end:0271b378:start=1516632752442275724,finish=1516632785238671709,duration=32796395985\n" +
				"[0Ktravis_fold:end:install.npm\n" +
				"[0Ktravis_fold:start:before_script.1\n" +
				"[0Ktravis_time:start:09263a08\n" +
				"[0K$ npm install -g grunt-cli\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/bin/grunt -> /home/travis/.nvm/versions/node/v6.9.5/lib/node_modules/grunt-cli/bin/grunt\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/lib\n" +
				"└─┬ grunt-cli@1.2.0 \n" +
				"  ├─┬ findup-sync@0.3.0 \n" +
				"  │ └─┬ glob@5.0.15 \n" +
				"  │   ├─┬ inflight@1.0.6 \n" +
				"  │   │ └── wrappy@1.0.2 \n" +
				"  │   ├── inherits@2.0.3 \n" +
				"  │   ├─┬ minimatch@3.0.4 \n" +
				"  │   │ └─┬ brace-expansion@1.1.8 \n" +
				"  │   │   ├── balanced-match@1.0.0 \n" +
				"  │   │   └── concat-map@0.0.1 \n" +
				"  │   ├── once@1.4.0 \n" +
				"  │   └── path-is-absolute@1.0.1 \n" +
				"  ├── grunt-known-options@1.1.0 \n" +
				"  ├─┬ nopt@3.0.6 \n" +
				"  │ └── abbrev@1.1.1 \n" +
				"  └── resolve@1.1.7 \n" +
				"\n" +
				"\n" +
				"travis_time:end:09263a08:start=1516632785559483836,finish=1516632787215454340,duration=1655970504\n" +
				"[0Ktravis_fold:end:before_script.1\n" +
				"[0Ktravis_fold:start:before_script.2\n" +
				"[0Ktravis_time:start:18776dfe\n" +
				"[0K$ docker pull soajsorg/soajs\n" +
				"Using default tag: latest\n" +
				"latest: Pulling from soajsorg/soajs\n" +
				"af49a5ceb2a5: Pulling fs layer\n" +
				"8f9757b472e7: Pulling fs layer\n" +
				"e931b117db38: Pulling fs layer\n" +
				"47b5e16c0811: Pulling fs layer\n" +
				"9332eaf1a55b: Pulling fs layer\n" +
				"7323f579e778: Pulling fs layer\n" +
				"61c8c60d374e: Pulling fs layer\n" +
				"c9a783521b12: Pulling fs layer\n" +
				"452f98a11bd8: Pulling fs layer\n" +
				"384667d2af15: Pulling fs layer\n" +
				"c357a82b5d6f: Pulling fs layer\n" +
				"72f10c562385: Pulling fs layer\n" +
				"47b5e16c0811: Waiting\n" +
				"9332eaf1a55b: Waiting\n" +
				"7323f579e778: Waiting\n" +
				"61c8c60d374e: Waiting\n" +
				"c9a783521b12: Waiting\n" +
				"452f98a11bd8: Waiting\n" +
				"384667d2af15: Waiting\n" +
				"c357a82b5d6f: Waiting\n" +
				"72f10c562385: Waiting\n" +
				"e931b117db38: Verifying Checksum\n" +
				"e931b117db38: Download complete\n" +
				"8f9757b472e7: Verifying Checksum\n" +
				"8f9757b472e7: Download complete\n" +
				"47b5e16c0811: Verifying Checksum\n" +
				"47b5e16c0811: Download complete\n" +
				"9332eaf1a55b: Verifying Checksum\n" +
				"9332eaf1a55b: Download complete\n" +
				"7323f579e778: Verifying Checksum\n" +
				"7323f579e778: Download complete\n" +
				"61c8c60d374e: Verifying Checksum\n" +
				"61c8c60d374e: Download complete\n" +
				"c9a783521b12: Verifying Checksum\n" +
				"c9a783521b12: Download complete\n" +
				"af49a5ceb2a5: Verifying Checksum\n" +
				"af49a5ceb2a5: Download complete\n" +
				"452f98a11bd8: Verifying Checksum\n" +
				"452f98a11bd8: Download complete\n" +
				"384667d2af15: Verifying Checksum\n" +
				"384667d2af15: Download complete\n" +
				"c357a82b5d6f: Verifying Checksum\n" +
				"c357a82b5d6f: Download complete\n" +
				"72f10c562385: Verifying Checksum\n" +
				"72f10c562385: Download complete\n" +
				"af49a5ceb2a5: Pull complete\n" +
				"8f9757b472e7: Pull complete\n" +
				"e931b117db38: Pull complete\n" +
				"47b5e16c0811: Pull complete\n" +
				"9332eaf1a55b: Pull complete\n" +
				"7323f579e778: Pull complete\n" +
				"61c8c60d374e: Pull complete\n" +
				"c9a783521b12: Pull complete\n" +
				"452f98a11bd8: Pull complete\n" +
				"384667d2af15: Pull complete\n" +
				"c357a82b5d6f: Pull complete\n" +
				"72f10c562385: Pull complete\n" +
				"Digest: sha256:8ed6c9de7889224c91f5f31be359c3b1f981112dcde86e503f7f0a1974bfeb9a\n" +
				"Status: Downloaded newer image for soajsorg/soajs:latest\n" +
				"\n" +
				"travis_time:end:18776dfe:start=1516632787223444927,finish=1516632814185488407,duration=26962043480\n" +
				"[0Ktravis_fold:end:before_script.2\n" +
				"[0Ktravis_fold:start:before_script.3\n" +
				"[0Ktravis_time:start:006e2c91\n" +
				"[0K$ sleep 10\n" +
				"\n" +
				"travis_time:end:006e2c91:start=1516632814192526630,finish=1516632824199594539,duration=10007067909\n" +
				"[0Ktravis_fold:end:before_script.3\n" +
				"[0Ktravis_time:start:177f2130\n" +
				"[0K$ grunt coverage\n" +
				"[4mRunning \"clean:doc\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"clean:coverage\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"copy:main\" (copy) task[24m\n" +
				"Copied 9 files\n" +
				"\n" +
				"[4mRunning \"env:coverage\" (env) task[24m\n" +
				"\n" +
				"[4mRunning \"instrument\" task[24m\n" +
				"Instrumented 62 files\n" +
				"\n" +
				"[4mRunning \"mochaTest:unit\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  ✓ Init environment model\n" +
				"  testing catalog.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing list\n" +
				"      ✓ Success\n" +
				"      ✓ Success with version\n" +
				"\n" +
				"  testing helper soajs.cd.js\n" +
				"    testing deepVersionComparison\n" +
				"      ✓ success - no update detected, official image\n" +
				"      ✓ success - deployer update detected, official image\n" +
				"      ✓ success - core update detected, official image\n" +
				"      ✓ success - image update, custom image\n" +
				"      ✓ success - image tag is not a number\n" +
				"    testing processUndeployedServices\n" +
				"      ✓ success - will build list of undeployed services, version specified\n" +
				"      ✓ success - will build list of undeployed services, version not specified\n" +
				"      ✓ success - will build list of one service, daemon specified is already deployed\n" +
				"    processOneService\n" +
				"      ✓ success - commit error, service is deployed\n" +
				"      ✓ Success update\n" +
				"      ✓ Success notify, service is deployed\n" +
				"      ✓ Success notify, service is not deployed\n" +
				"    checkRecordConfig\n" +
				"      ✓ Fail\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Success\n" +
				"      ✓ Success 2\n" +
				"      ✓ Success 3\n" +
				"      ✓ Success - repository cd information found for custom deployed service\n" +
				"    getEnvsServices\n" +
				"      ✓ Success\n" +
				"    doesServiceHaveUpdates\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Success doesServiceHaveUpdates\n" +
				"      ✓ Success doesServiceHaveUpdates with v\n" +
				"    getLatestSOAJSImageInfo\n" +
				"      ✓ Success getLatestSOAJSImageInfo\n" +
				"    getServices\n" +
				"      ✓ Success 1\n" +
				"    deepVersionComparison\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success with id\n" +
				"      ✓ Success\n" +
				"      ✓ Success without serviceVersion\n" +
				"    testing getLedger\n" +
				"      ✓ Success\n" +
				"    testing getUpdates\n" +
				"      ✓ Success getUpdates\n" +
				"    testing markRead\n" +
				"      ✓ Success markRead by id\n" +
				"      ✓ Success markRead all\n" +
				"    testing saveConfig\n" +
				"      ✓ Success saveConfig\n" +
				"\n" +
				"  testing ci.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing toggleRepoStatus\n" +
				"      ✓ Success - enable\n" +
				"      ✓ Success - disable\n" +
				"    testing getRepoSettings\n" +
				"      ✓ Success getRepoSettings\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success id (number)\n" +
				"      ✓ Success id (string)\n" +
				"    testing getRepoYamlFile\n" +
				"      ✓ success - will get file\n" +
				"\n" +
				"  testing autoscale.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    testing set\n" +
				"      ✓ success - update autoscalers\n" +
				"      ✓ success - turn off autoscalers\n" +
				"      ✓ fail - update autoscalers, driver error\n" +
				"      ✓ fail - turn off autoscalers, driver error\n" +
				"    testing updateEnvAutoscaleConfig\n" +
				"      ✓ success - will update environment autoscale config and set deployer record\n" +
				"      ✓ success - will update environment autoscale config\n" +
				"\n" +
				"  testing deploy.js\n" +
				"    getGitRecord\n" +
				"      ✓ Success getGitRecord\n" +
				"    checkPort\n" +
				"      ✓ Fail. checkPort\n" +
				"      ✓ Success checkPort\n" +
				"    computeCatalogEnvVars\n" +
				"      ✓ Fail computeCatalogEnvVars\n" +
				"      ✓ Success computeCatalogEnvVars\n" +
				"    getDashDbInfo\n" +
				"      ✓ Success getDashDbInfo\n" +
				"    deployContainer\n" +
				"      ✓ Success deployContainer\n" +
				"      ✓ Success deployContainer options\n" +
				"      ✓ Success deployContainer rebuild\n" +
				"      ✓ Success deployContainer with Kubernetes - null mode\n" +
				"      ✓ Success deployContainer with Kubernetes - replicated mode\n" +
				"      ✓ Success deployContainer with Kubernetes - global mode\n" +
				"      ✓ Success deployContainer with Docker \n" +
				"\n" +
				"  testing deploy.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    deployService\n" +
				"      ✓ Success deployService. soajs (332ms)\n" +
				"      ✓ testing deploy service type custom (210ms)\n" +
				"    testing deploy plugin\n" +
				"      ✓ success - deploy heapster plugin\n" +
				"\n" +
				"  testing maintenance.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    streamLogs\n" +
				"      ✓ Failed\n" +
				"    maintenance\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"\n" +
				"  testing metrics.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    metrics\n" +
				"      ✓ get service metrics\n" +
				"      ✓ get node metrics\n" +
				"\n" +
				"  testing namespaces.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    list\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"    delete\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"\n" +
				"  testing nodes.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listNodes\n" +
				"      ✓ success\n" +
				"    removeNode\n" +
				"      ✓ success\n" +
				"    updateNode\n" +
				"      ✓ success\n" +
				"    addNode\n" +
				"      ✓ success\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listServices\n" +
				"      ✓ Success\n" +
				"    scaleService\n" +
				"      ✓ Success\n" +
				"    deleteService\n" +
				"      ✓ Success\n" +
				"    testing checkResource\n" +
				"      ✓ success - will find heapster service\n" +
				"      ✓ success - will not find heapster service\n" +
				"\n" +
				"  testing helper daemons.js\n" +
				"    validateCronTime ()\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"    testing checkIfGroupIsDeployed\n" +
				"      ✓ success - will get one deployed daemon\n" +
				"      ✓ success - will not find any deployed daemons\n" +
				"\n" +
				"  testing daemons.js\n" +
				"    ✓ Init model\n" +
				"    addGroupConfig\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"      ✓ Fail\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing environment.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"    testing removeCert\n" +
				"      ✓ Success removeCert\n" +
				"    testing Update deployer configuration\n" +
				"      ✓ Success removeCert\n" +
				"\n" +
				"  testing status.js\n" +
				"    ✓ Success startDeployment case 1 (10045ms)\n" +
				"    ✓ Success startDeployment case 2 (10012ms)\n" +
				"    ✓ Success startDeployment case 3 (10012ms)\n" +
				"    ✓ Success startDeployment case 4 (10014ms)\n" +
				"    ✓ Success checkProgress case 1 (10026ms)\n" +
				"    ✓ Success checkProgress  case 2 (10058ms)\n" +
				"    ✓ Success rollbackDeployment case 1 (18032ms)\n" +
				"    ✓ Success rollbackDeployment case 2 (18047ms)\n" +
				"    ✓ Success rollbackDeployment case 3 (17042ms)\n" +
				"\n" +
				"  testing statusRollback.js\n" +
				"    ✓ Success removeCertificates\n" +
				"    ✓ Success removeProduct with id\n" +
				"    ✓ Success removeProduct with tenant\n" +
				"    ✓ Success removeCertificates with none\n" +
				"    ✓ Success removeService\n" +
				"    ✓ Success removeService with no id\n" +
				"    ✓ Success removeController\n" +
				"    ✓ Success removeUrac\n" +
				"    ✓ Success removeOauth\n" +
				"    ✓ Success removeNginx\n" +
				"    ✓ Success removeCluster local with serviceId\n" +
				"    ✓ Success removeCluster local with no serviceId\n" +
				"    ✓ Success removeCluster external\n" +
				"    ✓ Success removeCluster none\n" +
				"    ✓ Success redirectTo3rdParty user no roll back\n" +
				"    ✓ Success redirectTo3rdParty user \n" +
				"    ✓ fail redirectTo3rdParty no test \n" +
				"    ✓ Success redirectTo3rdParty user recursive  (20029ms)\n" +
				"    ✓ Success redirectTo3rdParty user recursive no id\n" +
				"    ✓ fail redirectTo3rdParty no options \n" +
				"    removeCatalog\n" +
				"      ✓ Success with recipe\n" +
				"      ✓ Success with no recipe\n" +
				"    initBLModel\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing statusUtils.js\n" +
				"    ✓ Success uploadCertificates case 1\n" +
				"    ✓ Success uploadCertificates case 2\n" +
				"    ✓ Success uploadCertificates case 3\n" +
				"    ✓ Success productize case 1\n" +
				"    ✓ Success productize case 2\n" +
				"    ✓ Success productize case 3\n" +
				"    ✓ Success productize case 4\n" +
				"    ✓ Success deployClusterResource case 1\n" +
				"    ✓ Success deployClusterResource case 2\n" +
				"    ✓ Success deployClusterResource case 3\n" +
				"    ✓ Success handleClusters\n" +
				"    ✓ Success deployservice case  1\n" +
				"    ✓ Success deployservice case 2\n" +
				"    ✓ Success deployController\n" +
				"    ✓ Success deployUrac\n" +
				"    ✓ Success deployOauth\n" +
				"    ✓ Success createNginxRecipe case 1\n" +
				"    ✓ Success createNginxRecipe case 2\n" +
				"    ✓ Success createNginxRecipe case 3\n" +
				"    ✓ Success deployNgin case 1\n" +
				"    ✓ Success deployNgin case 2\n" +
				"    ✓ Success deployNgin case 3\n" +
				"    ✓ Success createUserAndGroup case 1\n" +
				"    ✓ Success createUserAndGroup case 2\n" +
				"    ✓ Success createUserAndGroup case 3\n" +
				"    ✓ Success createUserAndGroup case 4\n" +
				"    ✓ Success createUserAndGroup case 5\n" +
				"    ✓ Success createUserAndGroup case 6\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 1\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 2\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 3\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 4\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 5\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 6\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 1\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 2\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 3\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 5\n" +
				"    ✓ Success initBLModel\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    ✓ Fail - Bad config path\n" +
				"    ✓ Fail - Cannot parse Yaml file\n" +
				"    ✓ Fail - Bad Yaml file\n" +
				"    ✓ Fail - Empty Yaml file\n" +
				"    ✓ Fail - No summary for API\n" +
				"    ✓ Success - config file generated\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    getCustomRepoFiles\n" +
				"      ✓ Fail 1: soa.js\n" +
				"      ✓ Fail 2: swagger.yml\n" +
				"      ✓ success\n" +
				"    comparePaths\n" +
				"      ✓ Success: will remove\n" +
				"      ✓ Success: will sync\n" +
				"    testing removePath\n" +
				"      ✓ success - type service\n" +
				"      ✓ success - type daemon\n" +
				"    extractAPIsList\n" +
				"      ✓ Success new style\n" +
				"      ✓ Success old style\n" +
				"    validateFileContents\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    analyzeConfigSyncFile\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"      ✓ Success Multi\n" +
				"      ✓ Fail Multi\n" +
				"    buildDeployerOptions\n" +
				"      ✓ Success\n" +
				"    getServiceInfo\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanAdd\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanSync\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    extractDaemonJobs\n" +
				"      ✓ Success\n" +
				"    cleanConfigDir\n" +
				"      ✓ Success\n" +
				"    testing checkifRepoIsDeployed\n" +
				"      ✓ success - will get one deployed service\n" +
				"      ✓ success - will not find any deployed services\n" +
				"\n" +
				"  testing git.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing login\n" +
				"      ✓ success\n" +
				"      ✓ success password\n" +
				"    testing logout\n" +
				"      ✓ success\n" +
				"      ✓ success 2\n" +
				"    testing listAccounts\n" +
				"      ✓ success listAccounts\n" +
				"    testing getRepos\n" +
				"      ✓ success getRepos\n" +
				"    testing getFiles\n" +
				"      ✓ success getFile\n" +
				"      ✓ success getHAFile\n" +
				"    testing getBranches\n" +
				"      ✓ success getBranches\n" +
				"      ✓ fail - cannot get Branches for service - wrong name\n" +
				"      ✓ success - will get Branches for service\n" +
				"      ✓ success - will get Branches for daemon\n" +
				"    testing activateRepo\n" +
				"      ✓ success activateRepo service\n" +
				"      ✓ success activateRepo multi\n" +
				"      ✓ success activateRepo custom\n" +
				"      ✓ success activateRepo misc\n" +
				"    testing deactivateRepo\n" +
				"      ✓ success deactivate multi\n" +
				"      ✓ success deactivate custom\n" +
				"      ✓ success deactivate service\n" +
				"      ✓ fail deactivateRepo\n" +
				"    testing syncRepo\n" +
				"      ✓ success syncRepo service\n" +
				"      ✓ success syncRepo multi\n" +
				"      ✓ success syncRepo multi 2\n" +
				"      ✓ Fail syncRepo outOfSync\n" +
				"      ✓ Success syncRepo upToDate\n" +
				"\n" +
				"  testing helper host.js\n" +
				"    getTenants\n" +
				"      ✓ Success getTenants with acl_all_env\n" +
				"      ✓ Success getTenants with acl 1\n" +
				"      ✓ Success getTenants with acl 2\n" +
				"      ✓ Success getTenants with acl 3\n" +
				"      ✓ Success getTenants with package_acl_all_env\n" +
				"      ✓ Success getTenants with package_acl\n" +
				"      ✓ Success getTenants with user acl\n" +
				"\n" +
				"  testing host.js\n" +
				"    init ()\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"    listHostEnv\n" +
				"      ✓ Success listHostEnv\n" +
				"    listHAhostEnv\n" +
				"      ✓ Success listHAhostEnv\n" +
				"    awareness\n" +
				"      ✓ Success maintenanceOperation. controller\n" +
				"\n" +
				"  testing product.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"      ✓ Success list with includeEnvs\n" +
				"    updateSettings\n" +
				"      ✓ Success updateSettings\n" +
				"\n" +
				"  testing swagger.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing tenant.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing models git.js\n" +
				"    testing getAuthToken\n" +
				"      ✓ success 1\n" +
				"    testing getAccount\n" +
				"      ✓ success 1\n" +
				"      ✓ success 2\n" +
				"    testing getRepo\n" +
				"      ✓ success 1\n" +
				"    testing searchForAccount\n" +
				"      ✓ success 1\n" +
				"    testing addRepoToAccount\n" +
				"      ✓ success 1\n" +
				"    testing removeRepoFromAccount\n" +
				"      ✓ success 1\n" +
				"    testing updateRepoInfo\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing models host.js\n" +
				"    testing getEnvironment\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing ci drone index.js\n" +
				"    testing getFileName\n" +
				"      ✓ Call getFileName\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"DATA { uri: 'https://my.drone/api/repos/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return 1 repo only\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/console-server/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return repos list\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ error while fetching repositories\n" +
				"    testing listRepoBranches\n" +
				"DATA { uri: 'https://my.drone/api/repos/soajsTestAccount/soajsTestRepo/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing listEnvVars\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listEnvVars\n" +
				"    testing addEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/SECRET_NAME',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"      ✓ Call deleteEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"DATA { log: { debug: [Function: debug] },\n" +
				"  settings: \n" +
				"   { domain: 'my.drone',\n" +
				"     owner: 'CLOUD',\n" +
				"     repo: 'dashboard',\n" +
				"     ciToken: 'access1' },\n" +
				"  params: \n" +
				"   { repoOwner: 'CLOUD',\n" +
				"     variables: { ENV_NAME_1: 'ENV_VALUE_1', ENV_NAME_2: 'ENV_VALUE_2' } } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_1',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_2',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_3',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_1',\n" +
				"     value: 'ENV_VALUE_1',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_2',\n" +
				"     value: 'ENV_VALUE_2',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call ensureRepoVars\n" +
				"    testing setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call activate setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call deactivate setHook\n" +
				"    testing listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"    testing updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ Call updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ updateSettings with Insufficient privileges\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { error: { message: 'error' } }\n" +
				"      ✓ error in updating\n" +
				"\n" +
				"  testing ci index.js\n" +
				"    testing addEnvVar\n" +
				"      ✓ Call Travis addEnvVar\n" +
				"      ✓ Call Drone addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call Travis updateEnvVar\n" +
				"      ✓ Call Drone updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"      ✓ Call Travis deleteEnvVar\n" +
				"      ✓ Call Drone deleteEnvVar\n" +
				"    testing setHook\n" +
				"      ✓ Call Travis setHook\n" +
				"      ✓ Call Drone setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call Travis listSettings\n" +
				"    testing updateSettings\n" +
				"      ✓ Call Travis updateSettings\n" +
				"      ✓ Call Drone updateSettings\n" +
				"    testing generateToken\n" +
				"      ✓ Call Travis generateToken\n" +
				"    testing listEnvVars\n" +
				"      ✓ Call Travis listEnvVars\n" +
				"      ✓ Call Drone listEnvVars\n" +
				"    testing listRepos\n" +
				"      ✓ Call Travis listRepos\n" +
				"      ✓ Call Drone listRepos\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call Travis ensureRepoVars\n" +
				"      ✓ Call Drone ensureRepoVars\n" +
				"\n" +
				"  testing ci travis index.js\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"      ✓ Call listRepos\n" +
				"    testing listRepoBranches\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call addEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"      ✓ Call deleteEnvVar\n" +
				"      ✓ Call listEnvVars\n" +
				"      ✓ Call ensureRepoVars Success\n" +
				"      ✓ Call ensureRepoVars Fail\n" +
				"    testing updateSettings\n" +
				"      ✓ Call updateSettings\n" +
				"    testing setHook\n" +
				"      ✓ Call setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call listSettings\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Fail\n" +
				"      ✓ Success - TODO\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success\n" +
				"      ✓ Success - with options name\n" +
				"      ✓ Fail\n" +
				"    testing getRepoContent\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success - empty repos\n" +
				"      ✓ Success - repo not found\n" +
				"      ✓ Success - repo found\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket_enterprise index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success public\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success without name\n" +
				"      ✓ Success with name\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success\n" +
				"      ✓ Success wth token\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success generate (789ms)\n" +
				"    testing checkAuthToken\n" +
				"      ✓ Success refresh\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing buildBranchesArray\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success type basic\n" +
				"      ✓ Success type oauth\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success (136ms)\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success checkUserRecord (115ms)\n" +
				"    testing checkOrgRecord\n" +
				"      ✓ Success checkOrgRecord (97ms)\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2 (1169ms)\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success getAllRepos token (99ms)\n" +
				"      ✓ Success getAllRepos personal (106ms)\n" +
				"      ✓ Success getAllRepos organization (100ms)\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github index.js\n" +
				"    testing login\n" +
				"      ✓ Success public personal (370ms)\n" +
				"      ✓ Success public organization (100ms)\n" +
				"      ✓ Success public organization (433ms)\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success 1\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git index.js\n" +
				"    testing login\n" +
				"      ✓ Login github\n" +
				"    testing logout\n" +
				"      ✓ logout github\n" +
				"    testing getRepos\n" +
				"      ✓ getRepos github\n" +
				"    testing getBranches\n" +
				"      ✓ getBranches github\n" +
				"    testing getJSONContent\n" +
				"      ✓ getJSONContent github\n" +
				"    testing getAnyContent\n" +
				"      ✓ Fail name not found\n" +
				"      ✓ Success get github\n" +
				"\n" +
				"  testing utils utils.js\n" +
				"    testing checkErrorReturn\n" +
				"      ✓ Fail 1\n" +
				"    testing buildDeployerOptions\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Fail 4\n" +
				"\n" +
				"\n" +
				"  429 passing (2m)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"mochaTest:integration\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  importing sample data\n" +
				"/home/travis/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard /home/travis/build/soajs/soajs.dashboard\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard/provision ~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"/home/travis/build/soajs/soajs.dashboard\n" +
				"    ✓ do import (1682ms)\n" +
				"    ✓ update environment before starting service (40ms)\n" +
				"    ✓ update requestTimeout\n" +
				"test data imported.\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 4): MongoError: Index with name: name_1 already exists with different options\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 5): MongoError: Index with name: name_1 already exists with different options\n" +
				"    ✓ Start Services (4417ms)\n" +
				"    ✓ reload controller registry (527ms)\n" +
				"\n" +
				"  Swagger\n" +
				"    Simulator Tests\n" +
				"      Testing source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - will check input no source (61ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"        ✓ fail - will check input invalid source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"        ✓ fail - will check input empty source\n" +
				"      Testing complex simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 119 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing missing item simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 102 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing item with multiple errors\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 291 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"    Generator Tests\n" +
				"      service check\n" +
				"        ✓ create temp service (77ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service name taken (79ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service port taken (70ms)\n" +
				"        ✓ remove temp service (74ms)\n" +
				"      yaml check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 192 \"-\" \"-\"\n" +
				"        ✓ fail - invalid yaml code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid mapping of inputs (42ms)\n" +
				"      full check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 7977 \"-\" \"-\"\n" +
				"file downloaded to: ./mytestservice.zip\n" +
				"        ✓ success - service generated (96ms)\n" +
				"\n" +
				"  DASHBOARD UNIT TESTS for locked\n" +
				"    environment tests\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /environment/delete?id=55128442e603d7e01ab1688d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ FAIL locked - cant delete environment\n" +
				"========================================================\n" +
				"    products tests\n" +
				"      product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked. Cant update product\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked - delete product\n" +
				"========================================================\n" +
				"      package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/packages/update?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete package\n" +
				"========================================================\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        ✓ mongo test\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/update?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant update tenant (41ms)\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete tenant\n" +
				"========================================================\n" +
				"      oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/oauth/add/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/oauth/update/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/oauth/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant delete oauth\n" +
				"========================================================\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/add?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant add application\n" +
				"========================================================\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant update application\n" +
				"========================================================\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - will delete application\n" +
				"========================================================\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/add?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add key\n" +
				"========================================================\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/key/delete?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete key\n" +
				"========================================================\n" +
				"      application ext keys\n" +
				"        add application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/add/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add ext key\n" +
				"========================================================\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/ext/update/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update ext key\n" +
				"========================================================\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete ext key\n" +
				"========================================================\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/config/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update configuration\n" +
				"========================================================\n" +
				"    dashboard keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /tenant/db/keys/list HTTP/1.1\" 200 219 \"-\" \"-\"\n" +
				"      ✓ success - ext Key list\n" +
				"========================================================\n" +
				"    owner tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"      ✓ get Auhtorization token\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ get token owner user (47ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=5512867be603d7e01ab1688d&code=CLIENT HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"      ✓ success - locked. cant delete package (40ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/acl/get?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=551286bce603d7e01ab1688e HTTP/1.1\" 200 5247 \"-\" \"-\"\n" +
				"      ✓ get tenant acl owner (45ms)\n" +
				"========================================================\n" +
				"      test with user 1\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user\n" +
				"========================================================\n" +
				"      test with user 2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user2\n" +
				"========================================================\n" +
				"\n" +
				"  DASHBOARD UNIT Tests:\n" +
				"    products tests\n" +
				"      product\n" +
				"        add product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product exists\n" +
				"          ✓ mongo test\n" +
				"        update product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will update product (38ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/get?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"          ✓ success - product/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"          ✓ mongo test\n" +
				"        delete product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product again\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc8 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will delete product\n" +
				"          ✓ mongo test\n" +
				"        list product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/list HTTP/1.1\" 200 170 \"-\" \"-\"\n" +
				"          ✓ success - will list product\n" +
				"      package\n" +
				"        add package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add package, no locked product -> acl will be ignored for dashboard's env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add another package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 392 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - package exists\n" +
				"        get prod package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASIC HTTP/1.1\" 200 137 \"-\" \"-\"\n" +
				"          ✓ success - product/packages/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong package Code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong product Code\n" +
				"        update package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will update package, acl will be ignored\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?code=BASIC2 HTTP/1.1\" 200 390 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=55375fc26aa74450771a1513&code=BASIC HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASI2 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"        delete package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=PACKA HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will delete package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASI4 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"          ✓ fail - cannot delete package being used by current key\n" +
				"          ✓ mongo test\n" +
				"        list package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/list?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"          ✓ success - will list package\n" +
				"      mongo check db\n" +
				"        ✓ asserting product record\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        add tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to client by default\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to product and tag to testing\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ fail - tenant exists\n" +
				"          ✓ mongo test\n" +
				"        update tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 197 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant (58ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cca HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant type and tag\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=aaaabbdd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"        delete tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete?id=aaaabdddd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete/?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will delete tenant\n" +
				"        list tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list HTTP/1.1\" 200 4829 \"-\" \"-\"\n" +
				"          ✓ success - will get empty list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list?type=client HTTP/1.1\" 200 610 \"-\" \"-\"\n" +
				"          ✓ succeess - will list tenants of type client only\n" +
				"      oauth\n" +
				"        add oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 366 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant containing oauth\n" +
				"        update oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth\n" +
				"        list oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 133 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth object\n" +
				"      oauth users\n" +
				"        add oauth users tests\n" +
				"Error @ hash: hash iterations set to [1024] which is greater than 32 => hash iteration reset to 12\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth user (475ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        update oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth users (489ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - will update oauth users without password\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=22d2cb5fc04ce51e06000001 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - user does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=invalid HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid userid given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - userid already exist in another account (484ms)\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?id=5a65fb8f3a0d511af4a85ccb&uId=abcde HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth user\n" +
				"        list oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth users\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will remove oauth user\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will update application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=fdsffsd HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: fdsffsd\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will clear application acl\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will delete application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=fdfdsfs HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"        list applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - cant add application - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 191 \"-\" \"-\"\n" +
				"          ✓ success - will list applications\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=xxxx HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"          ✓ fail - app id not found\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=3902acc0b5e732bdbc80844df6fe6ceb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will delete key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gdsgsfds HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        list application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ success - will list key\n" +
				"      application ext keys\n" +
				"        add application ext keys 1\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=0243306942ef6a1d8856bbee217daabb HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test for key\n" +
				"        add application ext keys 2\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb913a0d511af4a85cd0 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add two external keys (using locked product) but only one with dashboard access (120ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add an external key for DEV environment using its corresponding encryption key (tenant using new acl)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - trying to add an external key for an environment that does not exist\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DASHBOARD HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DEV HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test. 1\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will delete ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=hjghjvbhgj&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        list application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 325 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=fffdfs HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - wrong key, will return empty result\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG (60ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 632 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 316 \"-\" \"-\"\n" +
				"          ✓ success - will list ext keys that contain an ext key with dashboard access\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration (empty config)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gfdgdf HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: gfdgdf\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - invalid environment provided\n" +
				"          ✓ mongo test\n" +
				"        list application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - will list configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=jjjjjjkkkkkk HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: jjjjjjkkkkkk\n" +
				"      Removal of automatically created dashboard tenant keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3&key=fc86a9967250133c8ae98d07e4a1d93d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/delete?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when tenant gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd4 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5&key=3250d38fdbfa18a456f42da15ca6bcfa HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/delete?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when application gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd6 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when key gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when external key gets deleted\n" +
				"      mongo check db\n" +
				"        ✓ asserting tenant record\n" +
				"\n" +
				"  DASHBOARD Integration Tests:\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"    ✓ get Main Auhtorization token\n" +
				"    environment tests\n" +
				"      get environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=dev HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=qwrr HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=freeww HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - Unable to get the environment records\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/ HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - no id or code provided\n" +
				"      listing environments to initiate templates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/list HTTP/1.1\" 200 3957 \"-\" \"-\"\n" +
				"        ✓ success - will get environments\n" +
				"      add environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add STG environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add PROD environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 177 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - environment exists\n" +
				"        ✓ mongo test\n" +
				"      update environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=aaaabbbbccc HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"        ✓ mongo test\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=aaaabbcdddd HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=5a65fb923a0d511af4a85cdc HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will delete environment\n" +
				"        ✓ mongo test\n" +
				"      list environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 13191 \"-\" \"-\"\n" +
				"        ✓ success - will get 3 environments\n" +
				"        ✓ success - will manually add environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 15200 \"-\" \"-\"\n" +
				"        ✓ success - will list environment\n" +
				"      Get environment profile tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/profile HTTP/1.1\" 200 315 \"-\" \"-\"\n" +
				"        ✓ success - will get environment profile\n" +
				"    login tests\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - did not specify environment code, old acl\n" +
				"      ✓ success - did not specify environment code, new acl\n" +
				"    testing settings for logged in users\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - should work for logged in users\n" +
				"      settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - user not logged in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 20591 \"-\" \"-\"\n" +
				"        ✓ success - will get tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will update tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/oauth/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"DELETE /settings/tenant/oauth/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will return oauth obj\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/users/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth user (465ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/oauth/users/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth users (485ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/oauth/users/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth user\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/oauth/users/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth users\n" +
				"        ✓ success - will list applications\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 3341 \"-\" \"-\"\n" +
				"        ✓ success - will get empty object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/add?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will add key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"        ✓ success - will list key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will add ext key for STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/ext/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401&extKeyEnv=STG HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/ext/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will list ext key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/config/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/config/list?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"        ✓ success - will list configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/application/key/delete?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete key\n" +
				"    platforms tests\n" +
				"      list platforms\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list?env=DEV HTTP/1.1\" 200 236 \"-\" \"-\"\n" +
				"        ✓ success - will list platforms and available certificates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      update deployer type\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/update?env=QA HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"        ✓ fail - update change deployer type (84ms)\n" +
				"    hosts tests\n" +
				"      list Hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 946 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"        ✓ mongo - empty the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 331 \"-\" \"-\"\n" +
				"        ✓ success - will get an empty list\n" +
				"        ✓ mongo - fill the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 786 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"      return environments where a service is deployed\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=swaggersample HTTP/1.1\" 200 808 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has more than 1 env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=dashboard HTTP/1.1\" 200 860 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has one env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=noService HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - service doesn't exist\n" +
				"      list Controllers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/awareness?env=dev HTTP/1.1\" 200 6873 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"    node management tests\n" +
				"      list cloud nodes \n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /cloud/nodes/list?env=qa HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ fail - will get nodes list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /cloud/nodes/add HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - will add node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/update?env=qa&nodeId=nodeTest HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"        ✓ fail - will update node\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/tag HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - will tag node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /cloud/nodes/remove?env=qa&nodeId=nodeId HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ fail - will remove node\n" +
				"    change tenant security key\n" +
				"      will change tenant security key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/key/update?access_token=0b64caa5c10ddae4cfff46c8bd6e11311a16e767&id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 6001 \"-\" \"-\"\n" +
				"        ✓ success - change security key (63ms)\n" +
				"      fail - logged in user is not the owner of the app\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ Login first\n" +
				"    prevent operator from removing tenant/application/key/extKey/product/package he is currently logged in with\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/delete?id=10d2cb5fc04ce51e06000001 HTTP/1.1\" 200 152 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001 HTTP/1.1\" 200 157 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/key/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /tenant/application/key/ext/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting extKey\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting package\n" +
				"\n" +
				"  DASHBOARD UNIT Tests: Services & Daemons\n" +
				"    services tests\n" +
				"      list services test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 9710 \"-\" \"-\"\n" +
				"        ✓ success - will get services list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 3914 \"-\" \"-\"\n" +
				"        ✓ success - will get services list specific services\n" +
				"      update service settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /services/settings/update?id=dummyServiceId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"        ✓ success - will update settings\n" +
				"    daemons/groups tests\n" +
				"      daemons tests\n" +
				"        list daemon tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list?getGroupConfigs=true HTTP/1.1\" 200 164 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons with group configurations of each\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list only specified daemons\n" +
				"      group configuration tests\n" +
				"        add group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - add new group config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"          ✓ fail - group config already exists\n" +
				"        update group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=123%3A%3A%3A321 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"        delete group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - deletes group\n" +
				"        list group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 230 \"-\" \"-\"\n" +
				"          ✓ success - list all group configs\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - list only specified group configs\n" +
				"        update service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - service configuration updated successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - delete service configuration successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"        list service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - lists service configuration of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"        update tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates test group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fails - missing required params\n" +
				"        list tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 347 \"-\" \"-\"\n" +
				"          ✓ success - lists tenant external keys of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"\n" +
				"  Docker Certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /login HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"    upload certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=ca HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upload docker certificate (87ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&driver=local&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: envCode\n" +
				"      ✓ mongo test - verify docker certificate exists in mongo\n" +
				"    remove certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success = will remove docker certificate (metadata includes serveral drivers and several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver but several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver for one environment)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&driverName=local HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - docker certificate does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=123%3A%3A%3A321&env=DEV&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"      ✓ mongo test - verify certificate has been deleted from mongo\n" +
				"    choose existing certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=cert HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert_2.pem&envCode=DEV&platform=docker&driver=local&certType=key HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for local\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for docker remote\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - one or more certificates do not exist\n" +
				"      ✓ mongo test - verify the docker certificates exist and include the right drivers and environments in their metadata\n" +
				"\n" +
				"  Testing Custom Registry Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - will add new plugged entry as owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - entry with the same name is already plugged in environment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069 HTTP/1.1\" 200 183 \"-\" \"-\"\n" +
				"      ✓ success - will add new unplugged entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - entry with the same name is not plugged\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 255 \"-\" \"-\"\n" +
				"      ✓ fail - adding entry record with additional properties\n" +
				"    Testing get custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&name=c1 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 125 \"-\" \"-\"\n" +
				"      ✓ fail - no name or id provided\n" +
				"    Testing update custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will update user1's entry as owner\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - trying to plug an entry that will cause a conflict\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry owned by owner as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry in an environment different from the one it was created in\n" +
				"    Testing list custom registry entries\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&start=0&end=2 HTTP/1.1\" 200 388 \"-\" \"-\"\n" +
				"      ✓ success - will list entries with pagination\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as owner, get permission set to true for all entries\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev HTTP/1.1\" 200 568 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as user1, get permission set to true only for entries owned by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries in dashboard environment, get dev entries that are shared\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required fields\n" +
				"    Testing delete custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dashboard HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete entry in an environment different from the one it was created it\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete owner's entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete entry\n" +
				"    Testing upgrade custom registry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade dev environment custom registry\n" +
				"      ✓ success - new custom registry entries are available\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will try to upgrade again, no changes since no old schema is detected\n" +
				"\n" +
				"  Testing Resources Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster1 by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 143 \"-\" \"-\"\n" +
				"      ✓ fail - resource with the same name/type/category already exists\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 453 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster2 by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 240 \"-\" \"-\"\n" +
				"      ✓ fail - adding resource record with additional parameters\n" +
				"    Testing get resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=cluster1 HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - no id or name of resource provided\n" +
				"    Testing update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - will update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource owned by owner as user1\n" +
				"    Testing list resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 921 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as owner, get permission set to true for cluster1 and cluster2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev HTTP/1.1\" 200 922 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as user1, get permission set to true only for cluster2\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard HTTP/1.1\" 200 472 \"-\" \"-\"\n" +
				"      ✓ success - will list resources in dashboard env as owner, get only get shared resources from dev env\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required field\n" +
				"    Testing delete resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dashboard&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete as user1 a resource created by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete resource cluster3 as owner\n" +
				"    Testing upgrade resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/upgrade?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade resources\n" +
				"    Testing get resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/config?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"      ✓ success - will get deploy configuration for resources\n" +
				"    Testing update resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will add deploy config for cluster1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    Testing list/add/edit/delete for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to add a cluster resource of type mongo called dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update/unplug dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - trying to update driver configuration for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 1402 \"-\" \"-\"\n" +
				"      ✓ success - list resources will mark dash_cluster as sensitive\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=dash_cluster HTTP/1.1\" 200 485 \"-\" \"-\"\n" +
				"      ✓ success - get dash_cluster resource marked as sensitive\n" +
				"\n" +
				"  Testing Databases Functionality\n" +
				"    add environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - wil add a db and set tenantSpecific to false by default\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - database already exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"      ✓ fail - session already exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    update environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db and set tenantSpecific to false by default (42ms)\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - database does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    delete environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=invalid HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - invalid database name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=urac HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete database\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete session\n" +
				"      ✓ mongo - testing database\n" +
				"    list environment dbs\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 75 \"-\" \"-\"\n" +
				"      ✓ success - no session and no databases\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add urac db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 274 \"-\" \"-\"\n" +
				"      ✓ success - yes session and yes databases\n" +
				"    update environment db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - add db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - empty db prefix\n" +
				"\n" +
				"  mongo check db\n" +
				"    ✓ asserting environment record\n" +
				"\n" +
				"  Testing Catalog Functionality\n" +
				"    Testing Catalog ADD API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 241 \"-\" \"-\"\n" +
				"      ✓ Fail - Add an invalid catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"      ✓ Success - Add a valid catalog\n" +
				"    Testing Catalog LIST API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/list HTTP/1.1\" 200 3218 \"-\" \"-\"\n" +
				"      ✓ Success - List available catalogs\n" +
				"    Testing Catalog EDIT API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a locked catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Edit a record (56ms)\n" +
				"    Testing Catalog GET API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ fail - invalid catalog id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 581 \"-\" \"-\"\n" +
				"      ✓ success- valid catalog id\n" +
				"    Testing Catalog DELETE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a locked record\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Delete a record\n" +
				"    Testing Catalog UPGRADE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/upgrade HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade recipes to follow new schema (153ms)\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting SOAJS_ENV_WORKDIR for test mode as:  ../test/coverage/instrument/\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:23 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"\"docker service rm\" requires at least 1 argument(s).\n" +
				"See 'docker service rm --help'.\n" +
				"\n" +
				"Usage:  docker service rm [OPTIONS] SERVICE [SERVICE...]\n" +
				"\n" +
				"Remove one or more services\n" +
				"    testing controller deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 1511 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=91asfeu3zgyd8czzzzn7jwaco&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller service and delete it afterwards (530ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:26 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller and use the main file specified in src (260ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:27 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 nginx service with static content (264ms)\n" +
				"    testing service deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4447 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=95eo88l6js8tvooq29xb247fs&mode=global HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 core service, global mode (433ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:29 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 211 \"-\" \"-\"\n" +
				"      ✓ fail - trying to deploy to an environment that is configured to be deployed manually\n" +
				"    testing daemon deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4224 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=dt47a48r6dhhd5fell4km3yot&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4225 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=1xhuxyrgc9wsn6pogrne1v71t&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon that contians cmd info in its src (329ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    testing redeploy service\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 3324 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:32 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy controller service (58ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:33 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will rebuild service (265ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:34 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy nginx and add custom ui to it (311ms)\n" +
				"    delete deployed services\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:35 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV HTTP/1.1\" 200 118 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params (43ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such service - service 123123123 not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such service',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'service 123123123 not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=123123123&mode=replicated HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - service not found\n" +
				"    testing get service logs\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5832 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such container - task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such container',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/instances/logs?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev&taskId=3xk3m23wg7gl5c6lk9rk5hypp&serviceId= HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"      ✓ success - getting service logs (67ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5827 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=4zuurjwbdji1e6wyhr2yxumbt&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    testing autoscale deployed services\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:37 +0000] \"PUT /cloud/services/autoscale?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ set autoscaler\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:38 +0000] \"PUT /cloud/services/autoscale/config?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ update environment autoscaling\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/resource?env=dev&resource=heapster&namespace=kube-system HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - check resource\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/services/scale?env=dev&resource=heapster&namespace=kube-system&scale=2 HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ fail - scale service\n" +
				"    metrics tests\n" +
				"      get service metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:40 +0000] \"GET /cloud/metrics/services?env=DEV HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - get service metrics\n" +
				"      fail - get node metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"GET /cloud/metrics/nodes?env=DEV HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ success - get nodes metrics nodes\n" +
				"    testing plugin deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"POST /cloud/plugins/deploy HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing service maintence deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:42 +0000] \"POST /cloud/services/maintenance HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing namespace list services \n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:43 +0000] \"GET /cloud/namespaces/list?env=dev HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - list namespaces\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /cloud/namespaces/delete?env=dev&namespaceId=soajs HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - delete namespaces\n" +
				"\n" +
				"  DASHBOARD TESTS: Continuous integration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?variables=true HTTP/1.1\" 200 885 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts with variables\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?owner=soajs&variables=true HTTP/1.1\" 200 454 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - activate provider (168ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?provider=travis HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?owner=soajs HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ Success - deactivate provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/recipe HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - add new recipe\n" +
				"    ✓ success - get recipe record from database\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - edit recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/recipe/download?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ Success - download recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - delete recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/script/download HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ success - download script\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/status?id=1234&provider=travis&owner=soajs&enable=true HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - Enable Repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - get repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 187 \"-\" \"-\"\n" +
				"    ✓ Success - change repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/repo/remote/config?port=80 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"    ✓ Success - getRepoYamlFile\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting CD functionality\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:44 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"bljs1s50yk4nlyemvlnfibcz5\n" +
				"fa6afebbb75d\n" +
				"243542d8fe34\n" +
				"746733a0c6e3\n" +
				"    testing service deployment\n" +
				"      ✓ update catalog recipe (47ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:46 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog 1 (1293ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:47 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog2 (1040ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:48 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog3 (278ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call to cd/deploy, nothing should happen (64ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=invalid HTTP/1.1\" 200 141 \"-\" \"-\"\n" +
				"      ✓ fail - mimic call for cd/deploy of controller in dev\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev (85ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific entry for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (65ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific version for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (165ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 295 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ get ledger (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ mark all ledger entries as read\n" +
				"      ✓ trigger catalog update\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/updates?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 5354 \"-\" \"-\"\n" +
				"      ✓ get updates (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd for automatic controller update (50ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 578 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 283 \"-\" \"-\"\n" +
				"      ✓ calling take action on redeploy (69ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cloud/services/list?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 4925 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ calling take action on rebuild (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cd HTTP/1.1\" 200 237 \"-\" \"-\"\n" +
				"      ✓ get CD\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"POST /cd/pause HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ pause CD\n" +
				"Deleting deployments and cleaning up...\n" +
				"2qkaeh3l4yc96z8j6rcc01ds5\n" +
				"6kt2aneyi9w8kna1d6ueg7jjb\n" +
				"9bk9yr1r656n1n5y78coe88cv\n" +
				"b9aec4c9e4c7\n" +
				"5502e2fb79be\n" +
				"\n" +
				"  DASHBOARD Tests: Git Accounts\n" +
				"    github login tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ fail - wrong pw (124ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - wrong provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ success - will login - personal private acc (115ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - cannot login - Organization acc - already exists\n" +
				"    github accounts tests\n" +
				"      list accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/accounts/list HTTP/1.1\" 200 342 \"-\" \"-\"\n" +
				"        ✓ success - will list\n" +
				"    personal private acc\n" +
				"      github getRepos tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getRepos?id=123&provider=github&page=1&per_page=50 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will getRepos\n" +
				"      github getBranches tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&provider=github&name=soajsTestAccount%2FtestMulti&type=repo HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will get Branches repo\n" +
				"      github repo tests\n" +
				"        repo activate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will activate multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - cannot activate again personal multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&name=sample__Single&type=service HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - cannot get Branches for service - wrong name\n" +
				"        repo sync tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/sync?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will sync repo - no change\n" +
				"        repo deactivate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/deactivate?id=123&owner=soajsTestAccount&repo=test.success1 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will deactivate single repo\n" +
				"    pull from a repo in github or bitbucket\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ success - the user is logged in and provided an existing repo and file path\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=michel-el-hajj&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the user isn't logged in\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.unknown&filepath=config.js&branch=develop&serviceName=unknown&env=dev&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the repo doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=configs.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ fail - wrong file path\n" +
				"    personal public acc\n" +
				"      login\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong personal public acc name\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - personal public acc (155ms)\n" +
				"    organization public acc\n" +
				"      login & logout\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong Organization acc\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - Organization acc (117ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"DELETE /gitAccounts/logout?username=soajs&id=123&provider=github HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ will logout org account\n" +
				"\n" +
				"\n" +
				"  495 passing (46s)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"storeCoverage\" task[24m\n" +
				"\n" +
				"[4mRunning \"makeReport\" task[24m\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"File                                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				" __root__/                               |    96.67 |       70 |    96.64 |    96.67 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.63 |    66.67 |    96.64 |    96.63 |... 5,2086,2087 |\n" +
				" lib/catalog/                            |    92.05 |    71.93 |      100 |    92.05 |                |\n" +
				"  index.js                               |    92.05 |    71.93 |      100 |    92.05 |... 209,282,304 |\n" +
				" lib/cd/                                 |    87.24 |     76.6 |    93.16 |    87.74 |                |\n" +
				"  helper.js                              |    86.55 |    77.64 |    85.71 |    86.89 |... 825,826,828 |\n" +
				"  index.js                               |    88.38 |    71.05 |    96.34 |    89.12 |... 537,556,557 |\n" +
				" lib/ci/                                 |    90.38 |    68.42 |    98.84 |    90.38 |                |\n" +
				"  index.js                               |    90.38 |    68.42 |    98.84 |    90.38 |... 549,618,762 |\n" +
				" lib/cloud/autoscale/                    |      100 |    93.88 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |    93.88 |      100 |      100 |                |\n" +
				" lib/cloud/deploy/                       |    84.79 |    75.64 |    96.91 |    84.53 |                |\n" +
				"  helper.js                              |    89.67 |    86.19 |     96.3 |    89.37 |... 504,505,506 |\n" +
				"  index.js                               |    82.48 |    70.77 |    97.14 |    82.29 |... 933,934,936 |\n" +
				" lib/cloud/maintenance/                  |    97.67 |      100 |       95 |    97.56 |                |\n" +
				"  index.js                               |    97.67 |      100 |       95 |    97.56 |             52 |\n" +
				" lib/cloud/metrics/                      |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/namespaces/                   |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/nodes/                        |    98.57 |    93.33 |    97.56 |    98.57 |                |\n" +
				"  index.js                               |    98.57 |    93.33 |    97.56 |    98.57 |             43 |\n" +
				" lib/cloud/services/                     |    95.65 |    91.49 |      100 |    97.06 |                |\n" +
				"  index.js                               |    95.65 |    91.49 |      100 |    97.06 |          51,58 |\n" +
				" lib/customRegistry/                     |    95.04 |       78 |      100 |    95.04 |                |\n" +
				"  index.js                               |    95.04 |       78 |      100 |    95.04 |... 276,454,467 |\n" +
				" lib/daemons/                            |    94.74 |    84.21 |    98.73 |    94.74 |                |\n" +
				"  helper.js                              |    91.94 |    80.77 |      100 |    91.94 | 40,48,52,61,73 |\n" +
				"  index.js                               |    95.68 |    85.51 |    98.51 |    95.68 |... 150,185,187 |\n" +
				" lib/environment/                        |    85.67 |    72.39 |       91 |    87.55 |                |\n" +
				"  helper.js                              |    84.85 |    75.44 |      100 |    84.85 |... 205,206,241 |\n" +
				"  index.js                               |    83.25 |    67.23 |    87.37 |    83.39 |... 7,1309,1313 |\n" +
				"  status.js                              |    83.76 |    67.13 |      100 |    85.02 |... 634,639,703 |\n" +
				"  statusRollback.js                      |    88.89 |    81.05 |      100 |     89.6 |... 206,219,237 |\n" +
				"  statusUtils.js                         |    88.32 |     74.7 |       95 |    92.91 |... 9,1258,1259 |\n" +
				" lib/git/                                |    86.62 |    68.68 |    97.48 |    86.77 |                |\n" +
				"  configGenerator.js                     |    87.04 |     66.9 |       95 |    87.04 |... 364,367,387 |\n" +
				"  helper.js                              |    85.44 |    69.46 |    96.97 |    85.44 |... 729,739,742 |\n" +
				"  index.js                               |    87.44 |    68.95 |    98.03 |     87.8 |... 44,945,1005 |\n" +
				" lib/hosts/                              |    81.82 |    65.41 |    94.34 |    81.82 |                |\n" +
				"  helper.js                              |    89.86 |    84.51 |      100 |    89.86 |... ,97,112,116 |\n" +
				"  index.js                               |    76.64 |    43.55 |    92.86 |    76.64 |... 205,206,215 |\n" +
				" lib/product/                            |    93.68 |    74.34 |      100 |    93.68 |                |\n" +
				"  index.js                               |    93.68 |    74.34 |      100 |    93.68 |... 525,526,552 |\n" +
				" lib/resources/                          |    90.57 |    77.33 |      100 |    90.57 |                |\n" +
				"  index.js                               |    90.57 |    77.33 |      100 |    90.57 |... 437,456,469 |\n" +
				" lib/services/                           |    89.58 |    85.71 |    92.86 |    89.58 |                |\n" +
				"  index.js                               |    89.58 |    85.71 |    92.86 |    89.58 | 23,24,35,36,40 |\n" +
				" lib/swagger/                            |    95.83 |    84.29 |      100 |    95.83 |                |\n" +
				"  index.js                               |    95.83 |    84.29 |      100 |    95.83 |... 192,261,262 |\n" +
				" lib/tenant/                             |    95.96 |    78.79 |      100 |    95.96 |                |\n" +
				"  index.js                               |    95.96 |    78.79 |      100 |    95.96 |... 3,1213,1268 |\n" +
				" models/                                 |    86.02 |    60.76 |    94.12 |    86.02 |                |\n" +
				"  git.js                                 |     87.5 |       75 |    83.33 |     87.5 |    49,53,57,61 |\n" +
				"  host.js                                |    94.74 |       50 |      100 |    94.74 |             42 |\n" +
				"  mongo.js                               |    84.44 |    59.42 |      100 |    84.44 |... 266,267,271 |\n" +
				" schemas/                                |      100 |      100 |      100 |      100 |                |\n" +
				"  acl.js                                 |      100 |      100 |      100 |      100 |                |\n" +
				"  catalog.js                             |      100 |      100 |      100 |      100 |                |\n" +
				"  cb.js                                  |      100 |      100 |      100 |      100 |                |\n" +
				"  cdOptions.js                           |      100 |      100 |      100 |      100 |                |\n" +
				"  customRegistry.js                      |      100 |      100 |      100 |      100 |                |\n" +
				"  environmentSchema.js                   |      100 |      100 |      100 |      100 |                |\n" +
				"  resource.js                            |      100 |      100 |      100 |      100 |                |\n" +
				"  resourceDeployConfig.js                |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceConfig.js                       |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceSchema.js                       |      100 |      100 |      100 |      100 |                |\n" +
				" utils/                                  |    91.67 |    86.54 |      100 |    92.54 |                |\n" +
				"  errors.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  utils.js                               |    91.43 |    86.54 |      100 |    92.31 |... 148,149,161 |\n" +
				" utils/drivers/ci/                       |    91.23 |    70.83 |    93.75 |    92.73 |                |\n" +
				"  index.js                               |    89.58 |       50 |    92.86 |     91.3 | 22,162,163,164 |\n" +
				"  utils.js                               |      100 |    85.71 |      100 |      100 |                |\n" +
				" utils/drivers/ci/drone/                 |     96.2 |    82.47 |      100 |     96.2 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.17 |    82.47 |      100 |    96.17 |... 435,444,489 |\n" +
				" utils/drivers/ci/travis/                |    96.95 |       80 |     96.3 |    96.95 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.94 |       80 |     96.3 |    96.94 |... 214,215,549 |\n" +
				" utils/drivers/git/                      |    96.97 |       75 |      100 |    96.97 |                |\n" +
				"  index.js                               |    96.97 |       75 |      100 |    96.97 |             29 |\n" +
				" utils/drivers/git/bitbucket/            |     87.5 |    64.54 |       95 |     87.5 |                |\n" +
				"  helper.js                              |    84.91 |    65.35 |    91.43 |    84.91 |... 360,382,383 |\n" +
				"  index.js                               |    91.15 |     62.5 |    97.78 |    91.15 |... 187,189,190 |\n" +
				" utils/drivers/git/bitbucket_enterprise/ |    88.84 |    64.08 |    95.52 |    88.84 |                |\n" +
				"  helper.js                              |    85.09 |     62.3 |     93.1 |    85.09 |... 241,263,264 |\n" +
				"  index.js                               |    92.73 |    66.67 |    97.37 |    92.73 |... ,70,114,200 |\n" +
				" utils/drivers/git/github/               |    86.38 |    76.55 |    91.14 |    86.38 |                |\n" +
				"  helper.js                              |    86.21 |    77.06 |    94.87 |    86.21 |... 323,341,342 |\n" +
				"  index.js                               |    86.67 |       75 |     87.5 |    86.67 |... ,98,115,177 |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"All files                                |    90.17 |    74.42 |     96.6 |    90.58 |                |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"\n" +
				"\n" +
				"[4mRunning \"coveralls:your_target\" (coveralls) task[24m\n" +
				"[32m>> [39mSuccessfully submitted coverage results to coveralls\n" +
				"\n" +
				"[32mDone, without errors.[39m\n" +
				"\n" +
				"travis_time:end:177f2130:start=1516632824205360139,finish=1516633017744444809,duration=193539084670\n" +
				"[0K\n" +
				"[32;1mThe command \"grunt coverage\" exited with 0.[0m\n" +
				"\n" +
				"Done. Your build exited with 0.\n"
			},
			"staging": {
				"hide": true,
				"id": 330375570,
				"number": "171",
				"state": "finished",
				"result": 1,
				"started_at": "2018-01-18T14:19:22Z",
				"finished_at": "2018-01-18T14:26:29Z",
				"duration": fancyTimeFormat(427),
				"commit": "d1353e7e426432ba966303bd6eab3faad02455a4",
				"message": "Merge branch 'develop' into staging",
				"config": JSON.stringify({
					"sudo": "required",
					"group": "deprecated-2017Q2",
					"language": "node_js",
					"node_js": "6.9.5",
					"services": [
						"mongodb",
						"docker"
					],
					"env": [
						"CXX=g++-4.8"
					],
					"branches": {
						"only": [
							"staging",
							"master"
						]
					},
					"addons": {
						"apt": {
							"sources": [
								"ubuntu-toolchain-r-test"
							],
							"packages": [
								"g++-4.8"
							]
						},
						"hosts": [
							"localhost",
							"dev-controller"
						]
					},
					"before_install": [
						"sudo apt-get update && sudo apt-get install sendmail python make g++"
					],
					"before_script": [
						"npm install -g grunt-cli",
						"docker pull soajsorg/soajs",
						"sleep 10"
					],
					"script": [
						"grunt coverage"
					],
					".result": "configured",
					"dist": "trusty"
				}, null, 2),
				"committer_name": "mikehajj",
				"compare": {
					"label": "7bc673f9c69d",
					"url": "https://github.com/soajs/soajs.dashboard/compare/7bc673f9c69d...9ce0e4849582"
				},
				"deploy": {
					"QA" : "notify",
					"DEV" : "update"
				},
				"logs": "travis_fold:start:worker_info\n" +
				"[0K[33;1mWorker information[0m\n" +
				"hostname: bfb564ba-bce1-4030-9f3b-67cf0539f7fd@1.production-5-worker-org-c-1-gce\n" +
				"version: v3.4.0 https://github.com/travis-ci/worker/tree/ce0440bc30c289a49a9b0c21e4e1e6f7d7825101\n" +
				"instance: travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-ci-sugilite-trusty-1480960799 (via amqp)\n" +
				"startup: 27.852668104s\n" +
				"travis_fold:end:worker_info\n" +
				"[0Ktravis_fold:start:system_info\n" +
				"[0K[33;1mBuild system information[0m\n" +
				"Build language: node_js\n" +
				"Build group: deprecated-2017Q2\n" +
				"Build dist: trusty\n" +
				"Build id: 331844360\n" +
				"Job id: 331844361\n" +
				"Runtime kernel version: 4.4.0-51-generic\n" +
				"travis-build version: c129335c3\n" +
				"[34m[1mBuild image provisioning date and time[0m\n" +
				"Mon Dec  5 18:47:20 UTC 2016\n" +
				"[34m[1mOperating System Details[0m\n" +
				"Distributor ID:\tUbuntu\n" +
				"Description:\tUbuntu 14.04.5 LTS\n" +
				"Release:\t14.04\n" +
				"Codename:\ttrusty\n" +
				"[34m[1mLinux Version[0m\n" +
				"4.4.0-51-generic\n" +
				"[34m[1mCookbooks Version[0m\n" +
				"998099c https://github.com/travis-ci/travis-cookbooks/tree/998099c\n" +
				"[34m[1mgit version[0m\n" +
				"git version 2.11.0\n" +
				"[34m[1mbash version[0m\n" +
				"GNU bash, version 4.3.11(1)-release (x86_64-pc-linux-gnu)\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>\n" +
				"\n" +
				"This is free software; you are free to change and redistribute it.\n" +
				"There is NO WARRANTY, to the extent permitted by law.\n" +
				"[34m[1mgcc version[0m\n" +
				"gcc (Ubuntu 4.8.4-2ubuntu1~14.04.3) 4.8.4\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"This is free software; see the source for copying conditions.  There is NO\n" +
				"warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n" +
				"\n" +
				"[34m[1mdocker version[0m\n" +
				"Client:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"\n" +
				"Server:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"[34m[1mclang version[0m\n" +
				"clang version 3.5.0 (tags/RELEASE_350/final)\n" +
				"Target: x86_64-unknown-linux-gnu\n" +
				"Thread model: posix\n" +
				"[34m[1mjq version[0m\n" +
				"jq-1.5\n" +
				"[34m[1mbats version[0m\n" +
				"Bats 0.4.0\n" +
				"[34m[1mgimme version[0m\n" +
				"v1.0.0\n" +
				"[34m[1mnvm version[0m\n" +
				"0.32.0\n" +
				"[34m[1mperlbrew version[0m\n" +
				"/home/travis/perl5/perlbrew/bin/perlbrew  - App::perlbrew/0.73\n" +
				"[34m[1mpostgresql client version[0m\n" +
				"psql (PostgreSQL) 9.6.1\n" +
				"[34m[1mphpenv version[0m\n" +
				"rbenv 1.1.0\n" +
				"[34m[1mrvm version[0m\n" +
				"rvm 1.27.0 (latest) by Wayne E. Seguin <wayneeseguin@gmail.com>, Michal Papis <mpapis@gmail.com> [https://rvm.io/]\n" +
				"[34m[1mdefault ruby version[0m\n" +
				"ruby 2.3.1p112 (2016-04-26 revision 54768) [x86_64-linux]\n" +
				"[34m[1mPre-installed Ruby versions[0m\n" +
				"jruby-9.1.2.0\n" +
				"ruby-1.9.3-p551\n" +
				"ruby-2.0.0-p648\n" +
				"ruby-2.1.10\n" +
				"ruby-2.2.5\n" +
				"ruby-2.3.1\n" +
				"[34m[1mPre-installed Node.js versions[0m\n" +
				"iojs-v1.6\n" +
				"iojs-v1.6.4\n" +
				"v0.10\n" +
				"v0.10.40\n" +
				"v0.11.16\n" +
				"v0.12.2\n" +
				"v0.12.7\n" +
				"v0.6.21\n" +
				"v0.8.28\n" +
				"v4.1.2\n" +
				"v4.6.2\n" +
				"v6.9.1\n" +
				"[34m[1mPre-installed Go versions[0m\n" +
				"1.2.2\n" +
				"1.3.3\n" +
				"1.4.3\n" +
				"1.5.4\n" +
				"1.6.3\n" +
				"1.7\n" +
				"[34m[1mmysql version[0m\n" +
				"mysql  Ver 14.14 Distrib 5.6.33, for debian-linux-gnu (x86_64) using  EditLine wrapper\n" +
				"[34m[1mPre-installed PostgreSQL versions[0m\n" +
				"9.2.19\n" +
				"9.3.15\n" +
				"9.4.10\n" +
				"9.5.5\n" +
				"9.6.1\n" +
				"[34m[1mRedis version[0m\n" +
				"redis-server 3.0.6\n" +
				"[34m[1mMongoDB version[0m\n" +
				"MongoDB 3.2.11\n" +
				"[34m[1mRabbitMQ Version[0m\n" +
				"3.6.6\n" +
				"[34m[1mInstalled Firefox version[0m\n" +
				"firefox 38.4.0esr\n" +
				"[34m[1mant version[0m\n" +
				"Apache Ant(TM) version 1.9.3 compiled on April 8 2014\n" +
				"[34m[1mmvn version[0m\n" +
				"Apache Maven 3.1.1 (0728685237757ffbf44136acec0402957f723d9a; 2013-09-17 15:22:22+0000)\n" +
				"Maven home: /usr/local/maven\n" +
				"Java version: 1.8.0_111, vendor: Oracle Corporation\n" +
				"Java home: /usr/lib/jvm/java-8-oracle/jre\n" +
				"Default locale: en_US, platform encoding: UTF-8\n" +
				"OS name: \"linux\", version: \"4.4.0-51-generic\", arch: \"amd64\", family: \"unix\"\n" +
				"[34m[1mgradle version[0m\n" +
				"\n" +
				"------------------------------------------------------------\n" +
				"Gradle 2.13\n" +
				"------------------------------------------------------------\n" +
				"\n" +
				"Build time:   2016-04-25 04:10:10 UTC\n" +
				"Build number: none\n" +
				"Revision:     3b427b1481e46232107303c90be7b05079b05b1c\n" +
				"\n" +
				"Groovy:       2.4.4\n" +
				"Ant:          Apache Ant(TM) version 1.9.6 compiled on June 29 2015\n" +
				"JVM:          1.8.0_111 (Oracle Corporation 25.111-b14)\n" +
				"OS:           Linux 4.4.0-51-generic amd64\n" +
				"\n" +
				"[34m[1mkerl list installations[0m\n" +
				"17.0\n" +
				"17.1\n" +
				"17.3\n" +
				"17.4\n" +
				"17.5\n" +
				"18.0\n" +
				"18.1\n" +
				"18.2\n" +
				"18.2.1\n" +
				"R14B02\n" +
				"R14B03\n" +
				"R14B04\n" +
				"R15B\n" +
				"R15B01\n" +
				"R15B02\n" +
				"R15B03\n" +
				"R16B\n" +
				"R16B01\n" +
				"R16B02\n" +
				"R16B03\n" +
				"R16B03-1\n" +
				"[34m[1mkiex list[0m\n" +
				"\n" +
				"kiex elixirs\n" +
				"\n" +
				"   elixir-1.0.3\n" +
				"=* elixir-1.0.4\n" +
				"\n" +
				"# => - current\n" +
				"# =* - current && default\n" +
				"#  * - default\n" +
				"\n" +
				"[34m[1mrebar --version[0m\n" +
				"rebar 2.6.4 17 20160831_145136 git 2.6.4-dirty\n" +
				"[34m[1mlein version[0m\n" +
				"WARNING: You're currently running as root; probably by accident.\n" +
				"Press control-C to abort or Enter to continue as root.\n" +
				"Set LEIN_ROOT to disable this warning.\n" +
				"Leiningen 2.7.1 on Java 1.8.0_111 Java HotSpot(TM) 64-Bit Server VM\n" +
				"[34m[1mperlbrew list[0m\n" +
				"  5.8 (5.8.8)\n" +
				"  5.10 (5.10.1)\n" +
				"  5.12 (5.12.5)\n" +
				"  5.14 (5.14.4)\n" +
				"  5.16 (5.16.3)\n" +
				"  5.18 (5.18.4)\n" +
				"  5.20 (5.20.3)\n" +
				"  5.20-extras (5.20.3)\n" +
				"  5.20-shrplib (5.20.3)\n" +
				"  5.20.3\n" +
				"  5.22 (5.22.0)\n" +
				"  5.22-extras (5.22.0)\n" +
				"  5.22-shrplib (5.22.0)\n" +
				"  5.22.0\n" +
				"[34m[1mphpenv versions[0m\n" +
				"  system\n" +
				"  5.4\n" +
				"  5.4.45\n" +
				"  5.5.37\n" +
				"  5.6\n" +
				"* 5.6.24 (set by /home/travis/.phpenv/version)\n" +
				"  7.0\n" +
				"  7.0.7\n" +
				"  hhvm\n" +
				"  hhvm-stable\n" +
				"[34m[1mcomposer --version[0m\n" +
				"Composer version 1.2.0 2016-07-19 01:28:52\n" +
				"travis_fold:end:system_info\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"travis_fold:start:git.checkout\n" +
				"[0Ktravis_time:start:189f4f26\n" +
				"[0K$ git clone --depth=50 --branch=master https://github.com/soajs/soajs.dashboard.git soajs/soajs.dashboard\n" +
				"Cloning into 'soajs/soajs.dashboard'...\n" +
				"\n" +
				"travis_time:end:189f4f26:start=1516632644778250512,finish=1516632645636160459,duration=857909947\n" +
				"[0K$ cd soajs/soajs.dashboard\n" +
				"$ git checkout -qf 9ce0e48495822605fae0a1afe3718c3306e93183\n" +
				"travis_fold:end:git.checkout\n" +
				"[0Ktravis_fold:start:apt\n" +
				"[0K[33;1mAdding APT Sources (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:1768ded0\n" +
				"[0K$ sudo -E apt-add-repository -y \"ppa:ubuntu-toolchain-r/test\"\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/secring.gpg' created\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/pubring.gpg' created\n" +
				"gpg: requesting key BA9EF27F from hkp server keyserver.ubuntu.com\n" +
				"gpg: /tmp/tmpzmwul48g/trustdb.gpg: trustdb created\n" +
				"gpg: key BA9EF27F: public key \"Launchpad Toolchain builds\" imported\n" +
				"gpg: Total number processed: 1\n" +
				"gpg:               imported: 1  (RSA: 1)\n" +
				"OK\n" +
				"\n" +
				"travis_time:end:1768ded0:start=1516632645662982749,finish=1516632647269286999,duration=1606304250\n" +
				"[0K[33;1mInstalling APT Packages (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:04eab060\n" +
				"[0K$ sudo -E apt-get -yq update &>> ~/apt-get-update.log\n" +
				"\n" +
				"travis_time:end:04eab060:start=1516632647279891866,finish=1516632665019623254,duration=17739731388\n" +
				"[0Ktravis_time:start:212f10ba\n" +
				"[0K$ sudo -E apt-get -yq --no-install-suggests --no-install-recommends --force-yes install g++-4.8\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"The following extra packages will be installed:\n" +
				"  cpp-4.8 gcc-4.8 gcc-4.8-base gcc-7-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libisl15 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6\n" +
				"  libtsan0\n" +
				"Suggested packages:\n" +
				"  gcc-4.8-locales g++-4.8-multilib gcc-4.8-doc libstdc++6-4.8-dbg\n" +
				"  gcc-4.8-multilib libgcc1-dbg libgomp1-dbg libitm1-dbg libatomic1-dbg\n" +
				"  libasan0-dbg libtsan0-dbg libquadmath0-dbg libstdc++-4.8-doc\n" +
				"The following NEW packages will be installed:\n" +
				"  gcc-7-base libisl15\n" +
				"The following packages will be upgraded:\n" +
				"  cpp-4.8 g++-4.8 gcc-4.8 gcc-4.8-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6 libtsan0\n" +
				"14 upgraded, 2 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 32.2 MB of archives.\n" +
				"After this operation, 2,905 kB of additional disk space will be used.\n" +
				"Get:1 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-7-base amd64 7.2.0-1ubuntu1~14.04 [17.6 kB]\n" +
				"Get:2 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++6 amd64 7.2.0-1ubuntu1~14.04 [305 kB]\n" +
				"Get:3 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libtsan0 amd64 7.2.0-1ubuntu1~14.04 [271 kB]\n" +
				"Get:4 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libisl15 amd64 0.15-3~14.04 [507 kB]\n" +
				"Get:5 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libmpfr4 amd64 3.1.3-1~14.04 [178 kB]\n" +
				"Get:6 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main g++-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [18.1 MB]\n" +
				"Get:7 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [5,067 kB]\n" +
				"Get:8 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main cpp-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [4,601 kB]\n" +
				"Get:9 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgomp1 amd64 7.2.0-1ubuntu1~14.04 [75.8 kB]\n" +
				"Get:10 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libitm1 amd64 7.2.0-1ubuntu1~14.04 [27.5 kB]\n" +
				"Get:11 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libatomic1 amd64 7.2.0-1ubuntu1~14.04 [9,012 B]\n" +
				"Get:12 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libquadmath0 amd64 7.2.0-1ubuntu1~14.04 [132 kB]\n" +
				"Get:13 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,051 kB]\n" +
				"Get:14 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgcc-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,687 kB]\n" +
				"Get:15 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libasan0 amd64 4.8.5-2ubuntu1~14.04.1 [63.1 kB]\n" +
				"Get:16 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8-base amd64 4.8.5-2ubuntu1~14.04.1 [15.4 kB]\n" +
				"Fetched 32.2 MB in 45s (710 kB/s)\n" +
				"Selecting previously unselected package gcc-7-base:amd64.\n" +
				"(Reading database ... 88286 files and directories currently installed.)\n" +
				"Preparing to unpack .../gcc-7-base_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"(Reading database ... 88293 files and directories currently installed.)\n" +
				"Preparing to unpack .../libstdc++6_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Setting up libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"(Reading database ... 88294 files and directories currently installed.)\n" +
				"Preparing to unpack .../libtsan0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libtsan0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Selecting previously unselected package libisl15:amd64.\n" +
				"Preparing to unpack .../libisl15_0.15-3~14.04_amd64.deb ...\n" +
				"Unpacking libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Preparing to unpack .../libmpfr4_3.1.3-1~14.04_amd64.deb ...\n" +
				"Unpacking libmpfr4:amd64 (3.1.3-1~14.04) over (3.1.2-1) ...\n" +
				"Preparing to unpack .../g++-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking g++-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../cpp-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking cpp-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgomp1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libgomp1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libitm1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libitm1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libatomic1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libatomic1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libquadmath0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libstdc++-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgcc-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libasan0_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8-base_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up libtsan0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Setting up libmpfr4:amd64 (3.1.3-1~14.04) ...\n" +
				"Setting up gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up cpp-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libgomp1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libitm1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libatomic1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up gcc-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up g++-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"\n" +
				"travis_time:end:212f10ba:start=1516632665026664875,finish=1516632718829250552,duration=53802585677\n" +
				"[0Ktravis_fold:end:apt\n" +
				"[0Ktravis_fold:start:services\n" +
				"[0Ktravis_time:start:06fcc922\n" +
				"[0K$ sudo service mongod start\n" +
				"mongod start/running, process 4294\n" +
				"\n" +
				"travis_time:end:06fcc922:start=1516632718880715697,finish=1516632718911712375,duration=30996678\n" +
				"[0Ktravis_time:start:061c3428\n" +
				"[0K$ sudo service docker start\n" +
				"start: Job is already running: docker\n" +
				"\n" +
				"travis_time:end:061c3428:start=1516632718918079959,finish=1516632718935524992,duration=17445033\n" +
				"[0Ktravis_fold:end:services\n" +
				"[0Ktravis_fold:start:hosts.before\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant \n" +
				"travis_fold:end:hosts.before\n" +
				"[0Ktravis_fold:start:hosts\n" +
				"[0Ktravis_fold:end:hosts\n" +
				"[0Ktravis_fold:start:hosts.after\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant  localhost dev-controller\n" +
				"travis_fold:end:hosts.after\n" +
				"[0K\n" +
				"[33;1mSetting environment variables from repository settings[0m\n" +
				"$ export SOAJS_TEST_GIT_PWD=[secure]\n" +
				"$ export SOAJS_TEST_GIT_TOKEN=[secure]\n" +
				"\n" +
				"[33;1mSetting environment variables from .travis.yml[0m\n" +
				"$ export CXX=g++-4.8\n" +
				"\n" +
				"$ export PATH=./node_modules/.bin:$PATH\n" +
				"[33;1mUpdating nvm[0m\n" +
				"travis_fold:start:nvm.install\n" +
				"[0Ktravis_time:start:259cca10\n" +
				"[0K$ nvm install 6.9.5\n" +
				"Downloading and installing node v6.9.5...\n" +
				"Downloading https://nodejs.org/dist/v6.9.5/node-v6.9.5-linux-x64.tar.xz...\n" +
				"Computing checksum with sha256sum\n" +
				"Checksums matched!\n" +
				"Now using node v6.9.5 (npm v3.10.10)\n" +
				"\n" +
				"travis_time:end:259cca10:start=1516632722982336187,finish=1516632727149257648,duration=4166921461\n" +
				"[0Ktravis_fold:end:nvm.install\n" +
				"[0K$ node --version\n" +
				"v6.9.5\n" +
				"$ npm --version\n" +
				"3.10.10\n" +
				"$ nvm --version\n" +
				"0.33.8\n" +
				"travis_fold:start:before_install\n" +
				"[0Ktravis_time:start:2dc3852e\n" +
				"[0K$ sudo apt-get update && sudo apt-get install sendmail python make g++\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release.gpg\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2 InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg InRelease\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release\n" +
				"Ign http://dl.google.com stable InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security InRelease\n" +
				"Hit http://dl.google.com stable Release.gpg\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Sources\n" +
				"Hit http://dl.google.com stable Release\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse i386 Packages\n" +
				"Ign http://toolbelt.heroku.com ./ InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en_US\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main amd64 Packages\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Sources\n" +
				"Hit http://toolbelt.heroku.com ./ Release\n" +
				"Hit http://dl.google.com stable/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Sources\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/main amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted amd64 Packages\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en_US\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty/main amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Packages\n" +
				"Get:1 https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/universe i386 Packages\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty InRelease\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse i386 Packages\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Translation-en\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main i386 Packages\n" +
				"Get:2 https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:3 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:4 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Reading package lists...\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"g++ is already the newest version.\n" +
				"g++ set to manually installed.\n" +
				"make is already the newest version.\n" +
				"make set to manually installed.\n" +
				"python is already the newest version.\n" +
				"The following extra packages will be installed:\n" +
				"  procmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"Suggested packages:\n" +
				"  sendmail-doc rmail logcheck sasl2-bin\n" +
				"Recommended packages:\n" +
				"  default-mta mail-transport-agent fetchmail\n" +
				"The following NEW packages will be installed:\n" +
				"  procmail sendmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"0 upgraded, 6 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 844 kB of archives.\n" +
				"After this operation, 4,365 kB of additional disk space will be used.\n" +
				"Get:1 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-base all 8.14.4-4.1ubuntu1 [139 kB]\n" +
				"Get:2 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-cf all 8.14.4-4.1ubuntu1 [86.1 kB]\n" +
				"Get:3 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-bin amd64 8.14.4-4.1ubuntu1 [469 kB]\n" +
				"Get:4 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty-updates/main procmail amd64 3.22-21ubuntu0.2 [136 kB]\n" +
				"Get:5 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sensible-mda amd64 8.14.4-4.1ubuntu1 [8,246 B]\n" +
				"Get:6 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail all 8.14.4-4.1ubuntu1 [6,248 B]\n" +
				"Fetched 844 kB in 0s (15.8 MB/s)\n" +
				"Selecting previously unselected package sendmail-base.\n" +
				"(Reading database ... 88300 files and directories currently installed.)\n" +
				"Preparing to unpack .../sendmail-base_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-cf.\n" +
				"Preparing to unpack .../sendmail-cf_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-bin.\n" +
				"Preparing to unpack .../sendmail-bin_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package procmail.\n" +
				"Preparing to unpack .../procmail_3.22-21ubuntu0.2_amd64.deb ...\n" +
				"Unpacking procmail (3.22-21ubuntu0.2) ...\n" +
				"Selecting previously unselected package sensible-mda.\n" +
				"Preparing to unpack .../sensible-mda_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail.\n" +
				"Preparing to unpack .../sendmail_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"adduser: Warning: The home directory `/var/lib/sendmail' does not belong to the user you are currently creating.\n" +
				"Setting up sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"update-rc.d: warning: default stop runlevel arguments (0 1 6) do not match sendmail Default-Stop values (1)\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-mta (sendmail-mta) in auto mode\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-msp (sendmail-msp) in auto mode\n" +
				"\n" +
				"You are doing a new install, or have erased /etc/mail/sendmail.mc.\n" +
				"If you've accidentaly erased /etc/mail/sendmail.mc, check /var/backups.\n" +
				"\n" +
				"I am creating a safe, default sendmail.mc for you and you can\n" +
				"run sendmailconfig later if you need to change the defaults.\n" +
				"\n" +
				" * Stopping Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Updating sendmail environment ...\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Could not open /etc/mail/sendmail.mc(No such file or directory)\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Turning off Host Status collection\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"\n" +
				"Checking filesystem, this may take some time - it will not hang!\n" +
				"  ...   Done.\n" +
				" \n" +
				"Checking for installed MDAs...\n" +
				"Adding link for newly extant program (mail.local)\n" +
				"Adding link for newly extant program (procmail)\n" +
				"sasl2-bin not installed, not configuring sendmail support.\n" +
				"\n" +
				"To enable sendmail SASL2 support at a later date, invoke \"/usr/share/sendmail/update_auth\"\n" +
				"\n" +
				" \n" +
				"Creating/Updating SSL(for TLS) information\n" +
				"Creating /etc/mail/tls/starttls.m4...\n" +
				"Creating SSL certificates for sendmail.\n" +
				"Generating DSA parameters, 2048 bit long prime\n" +
				"This could take some time\n" +
				"............+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				".+.............+.+............+.......+.+...+..........+......+.............+....+........+...+...........................+.......+..+.....................+........+....+.+..........+.....+....+.....+...+.........+......+....+.+.................+.+...+......+.......+....+.......+........+.+.........+......+.+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				"Generating RSA private key, 2048 bit long modulus\n" +
				"................................+++\n" +
				".....+++\n" +
				"e is 65537 (0x10001)\n" +
				" \n" +
				"Updating /etc/hosts.allow, adding \"sendmail: all\".\n" +
				"\n" +
				"Please edit /etc/hosts.allow and check the rules location to\n" +
				"make sure your security measures have not been overridden -\n" +
				"it is common to move the sendmail:all line to the *end* of\n" +
				"the file, so your more selective rules take precedence.\n" +
				"Checking {sendmail,submit}.mc and related databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/Makefile...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Disabling HOST statistics file(/var/lib/sendmail/host_status).\n" +
				"Creating /etc/mail/sendmail.cf...\n" +
				"Creating /etc/mail/submit.cf...\n" +
				"Informational: confCR_FILE file empty: /etc/mail/relay-domains\n" +
				"Warning: confCT_FILE source file not found: /etc/mail/trusted-users\n" +
				" it was created\n" +
				"Informational: confCT_FILE file empty: /etc/mail/trusted-users\n" +
				"Warning: confCW_FILE source file not found: /etc/mail/local-host-names\n" +
				" it was created\n" +
				"Warning: access_db source file not found: /etc/mail/access\n" +
				" it was created\n" +
				"Updating /etc/mail/access...\n" +
				"Linking /etc/aliases to /etc/mail/aliases\n" +
				"Informational: ALIAS_FILE file empty: /etc/mail/aliases\n" +
				"Updating /etc/mail/aliases...\n" +
				"/etc/mail/aliases: 0 aliases, longest 0 bytes, 0 bytes total\n" +
				" \n" +
				"Warning: 3 database(s) sources\n" +
				"\twere not found, (but were created)\n" +
				"\tplease investigate.\n" +
				" * Starting Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Setting up procmail (3.22-21ubuntu0.2) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"\n" +
				"travis_time:end:2dc3852e:start=1516632728501391693,finish=1516632752436032451,duration=23934640758\n" +
				"[0Ktravis_fold:end:before_install\n" +
				"[0Ktravis_fold:start:install.npm\n" +
				"[0Ktravis_time:start:0271b378\n" +
				"[0K$ npm install \n" +
				"npm WARN deprecated github@0.2.4: 'github' has been renamed to '@octokit/rest' (https://git.io/vNB11)\n" +
				"npm WARN deprecated nodemailer@1.11.0: All versions below 4.0.1 of Nodemailer are deprecated. See https://nodemailer.com/status/\n" +
				"npm WARN deprecated graceful-fs@3.0.11: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"npm WARN deprecated minimatch@0.2.14: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated coffee-script@1.3.3: CoffeeScript on NPM has moved to \"coffeescript\" (no hyphen)\n" +
				"npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated graceful-fs@1.2.3: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"\n" +
				"> dtrace-provider@0.8.6 install /home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider\n" +
				"> node-gyp rebuild || node suppress-error.js\n" +
				"\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"make: Entering directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"  TOUCH Release/obj.target/DTraceProviderStub.stamp\n" +
				"make: Leaving directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"\n" +
				"> dtrace-provider@0.7.1 install /home/travis/build/soajs/soajs.dashboard/node_modules/ldapjs/node_modules/dtrace-provider\n" +
				"> node scripts/install.js\n" +
				"\n" +
				"soajs.dashboard@2.0.6 /home/travis/build/soajs/soajs.dashboard\n" +
				"├── async@2.1.4 \n" +
				"├─┬ bitbucket-server-nodejs@2.11.4 \n" +
				"│ ├─┬ query-string@4.3.4 \n" +
				"│ │ ├── object-assign@4.1.1 \n" +
				"│ │ └── strict-uri-encode@1.1.0 \n" +
				"│ └─┬ request-promise@4.2.2 \n" +
				"│   ├── bluebird@3.5.1 \n" +
				"│   ├── request-promise-core@1.1.1 \n" +
				"│   └── stealthy-require@1.1.1 \n" +
				"├── compare-versions@3.0.1 \n" +
				"├── cron@1.2.1 \n" +
				"├─┬ easy-zip@0.0.4 \n" +
				"│ └── async@2.6.0 \n" +
				"├── formidable@1.0.17 \n" +
				"├─┬ github@0.2.4 \n" +
				"│ └── mime@1.6.0 \n" +
				"├─┬ gridfs-stream@1.1.1 \n" +
				"│ └── flushwritable@1.0.0 \n" +
				"├─┬ grunt@0.4.5 \n" +
				"│ ├── async@0.1.22 \n" +
				"│ ├── coffee-script@1.3.3 \n" +
				"│ ├── colors@0.6.2 \n" +
				"│ ├── dateformat@1.0.2-1.2.3 \n" +
				"│ ├── eventemitter2@0.4.14 \n" +
				"│ ├── exit@0.1.2 \n" +
				"│ ├─┬ findup-sync@0.1.3 \n" +
				"│ │ ├─┬ glob@3.2.11 \n" +
				"│ │ │ └── minimatch@0.3.0 \n" +
				"│ │ └── lodash@2.4.2 \n" +
				"│ ├── getobject@0.1.0 \n" +
				"│ ├─┬ glob@3.1.21 \n" +
				"│ │ ├── graceful-fs@1.2.3 \n" +
				"│ │ └── inherits@1.0.2 \n" +
				"│ ├─┬ grunt-legacy-log@0.1.3 \n" +
				"│ │ ├─┬ grunt-legacy-log-utils@0.1.1 \n" +
				"│ │ │ ├── lodash@2.4.2 \n" +
				"│ │ │ └── underscore.string@2.3.3 \n" +
				"│ │ ├── lodash@2.4.2 \n" +
				"│ │ └── underscore.string@2.3.3 \n" +
				"│ ├─┬ grunt-legacy-util@0.2.0 \n" +
				"│ │ ├── async@0.1.22 \n" +
				"│ │ └── lodash@0.9.2 \n" +
				"│ ├── hooker@0.2.3 \n" +
				"│ ├── iconv-lite@0.2.11 \n" +
				"│ ├─┬ js-yaml@2.0.5 \n" +
				"│ │ ├─┬ argparse@0.1.16 \n" +
				"│ ��� │ ├── underscore@1.7.0 \n" +
				"│ │ │ └── underscore.string@2.4.0 \n" +
				"│ │ └── esprima@1.0.4 \n" +
				"│ ├── lodash@0.9.2 \n" +
				"│ ├─┬ minimatch@0.2.14 \n" +
				"│ │ ├── lru-cache@2.2.4 \n" +
				"│ │ └── sigmund@1.0.1 \n" +
				"│ ├─┬ nopt@1.0.10 \n" +
				"│ │ └── abbrev@1.1.1 \n" +
				"│ ├── rimraf@2.2.8 \n" +
				"│ ├── underscore.string@2.2.1 \n" +
				"│ └── which@1.0.9 \n" +
				"├─┬ grunt-contrib-clean@1.0.0 \n" +
				"│ └── async@1.5.2 \n" +
				"├─┬ grunt-contrib-copy@1.0.0 \n" +
				"│ ├─┬ chalk@1.1.3 \n" +
				"│ │ ├── ansi-styles@2.2.1 \n" +
				"│ │ ├─┬ has-ansi@2.0.0 \n" +
				"│ │ │ └── ansi-regex@2.1.1 \n" +
				"│ │ ├── strip-ansi@3.0.1 \n" +
				"│ │ └── supports-color@2.0.0 \n" +
				"│ └── file-sync-cmp@0.1.1 \n" +
				"├── grunt-contrib-jshint@1.1.0 \n" +
				"├─┬ grunt-coveralls@1.0.1 \n" +
				"│ └─┬ coveralls@2.13.3 \n" +
				"│   ├─┬ js-yaml@3.6.1 \n" +
				"│   │ └── esprima@2.7.3 \n" +
				"│   ├── lcov-parse@0.0.10 \n" +
				"│   ├── log-driver@1.2.5 \n" +
				"│   ├── minimist@1.2.0 \n" +
				"│   └─┬ request@2.79.0 \n" +
				"│     ├── caseless@0.11.0 \n" +
				"│     ├─┬ har-validator@2.0.6 \n" +
				"│     │ ├── commander@2.13.0 \n" +
				"│     │ ├─┬ is-my-json-valid@2.17.1 \n" +
				"│     │ │ ├── generate-function@2.0.0 \n" +
				"│     │ │ ├─┬ generate-object-property@1.2.0 \n" +
				"│     │ │ │ └── is-property@1.0.2 \n" +
				"│     │ │ ├── jsonpointer@4.0.1 \n" +
				"│     │ │ └── xtend@4.0.1 \n" +
				"│     │ └─┬ pinkie-promise@2.0.1 \n" +
				"│     │   └── pinkie@2.0.4 \n" +
				"│     ├── qs@6.3.2 \n" +
				"│     └── tunnel-agent@0.4.3 \n" +
				"├─┬ grunt-env@0.4.4 \n" +
				"│ ├── ini@1.3.5 \n" +
				"│ └── lodash@2.4.2 \n" +
				"├─┬ grunt-istanbul@0.7.2 \n" +
				"│ ├── chalk@1.1.1 \n" +
				"│ ├─┬ istanbul@0.4.5 \n" +
				"│ │ ├── abbrev@1.0.9 \n" +
				"│ │ ├── async@1.5.2 \n" +
				"│ │ ├─┬ escodegen@1.8.1 \n" +
				"│ │ │ ├── esprima@2.7.3 \n" +
				"│ │ │ ├── estraverse@1.9.3 \n" +
				"│ │ │ ├── esutils@2.0.2 \n" +
				"│ │ │ ├─┬ optionator@0.8.2 \n" +
				"│ │ │ │ ├── deep-is@0.1.3 \n" +
				"│ │ │ │ ├── fast-levenshtein@2.0.6 \n" +
				"│ │ │ │ ├── levn@0.3.0 \n" +
				"│ │ │ │ ├── prelude-ls@1.1.2 \n" +
				"│ │ │ │ ├── type-check@0.3.2 \n" +
				"│ │ │ │ └── wordwrap@1.0.0 \n" +
				"│ │ │ └─┬ source-map@0.2.0 \n" +
				"│ │ │   └── amdefine@1.0.1 \n" +
				"│ │ ├── esprima@2.7.3 \n" +
				"│ │ ├── glob@5.0.15 \n" +
				"│ │ ├─┬ handlebars@4.0.6 \n" +
				"│ │ │ ├── async@1.5.2 \n" +
				"│ │ │ ├─┬ optimist@0.6.1 \n" +
				"│ │ │ │ └── wordwrap@0.0.3 \n" +
				"│ │ │ ├── source-map@0.4.4 \n" +
				"│ │ │ └─┬ uglify-js@2.8.29 \n" +
				"│ │ │   ├── source-map@0.5.7 \n" +
				"│ │ │   ├── uglify-to-browserify@1.0.2 \n" +
				"│ │ │   └─┬ yargs@3.10.0 \n" +
				"│ │ │     ├── camelcase@1.2.1 \n" +
				"│ │ │     ├─┬ cliui@2.1.0 \n" +
				"│ │ │     │ ├─┬ center-align@0.1.3 \n" +
				"│ │ │     │ │ ├─┬ align-text@0.1.4 \n" +
				"│ │ │     │ │ │ ├─┬ kind-of@3.2.2 \n" +
				"│ │ │     │ │ │ │ └── is-buffer@1.1.6 \n" +
				"│ │ │     │ │ │ ├── longest@1.0.1 \n" +
				"│ │ │     │ │ │ └── repeat-string@1.6.1 \n" +
				"│ │ │     │ │ └���─ lazy-cache@1.0.4 \n" +
				"│ │ │     │ ├── right-align@0.1.3 \n" +
				"│ │ │     │ └── wordwrap@0.0.2 \n" +
				"│ │ │     ├── decamelize@1.2.0 \n" +
				"│ │ │     └── window-size@0.1.0 \n" +
				"│ │ ├─┬ js-yaml@3.10.0 \n" +
				"│ │ │ └── esprima@4.0.0 \n" +
				"│ │ ├── nopt@3.0.6 \n" +
				"│ │ ├─┬ once@1.4.0 \n" +
				"│ │ │ └── wrappy@1.0.2 \n" +
				"│ │ ├── resolve@1.1.7 \n" +
				"│ │ ├── supports-color@3.2.3 \n" +
				"│ │ ├─┬ which@1.3.0 \n" +
				"│ │ │ └── isexe@2.0.0 \n" +
				"│ │ └── wordwrap@1.0.0 \n" +
				"│ └── nue@0.7.1 \n" +
				"├─┬ grunt-jsdoc@2.1.0 \n" +
				"│ ├─┬ cross-spawn@3.0.1 \n" +
				"│ │ ├─┬ lru-cache@4.1.1 \n" +
				"│ │ │ ├── pseudomap@1.0.2 \n" +
				"│ │ │ └── yallist@2.1.2 \n" +
				"│ │ └── which@1.3.0 \n" +
				"│ └─┬ jsdoc@3.5.5 \n" +
				"│   ├── babylon@7.0.0-beta.19 \n" +
				"│   ├─┬ catharsis@0.8.9 \n" +
				"│   │ └─┬ underscore-contrib@0.3.0 \n" +
				"│   │   └── underscore@1.6.0 \n" +
				"│   ├─┬ js2xmlparser@3.0.0 \n" +
				"│   │ └── xmlcreate@1.0.2 \n" +
				"│   ├─┬ klaw@2.0.0 \n" +
				"│   │ └── graceful-fs@4.1.11 \n" +
				"│   ├── marked@0.3.12 \n" +
				"│   ├─┬ requizzle@0.2.1 \n" +
				"│   │ └── underscore@1.6.0 \n" +
				"│   ├── strip-json-comments@2.0.1 \n" +
				"│   ├── taffydb@2.6.2 \n" +
				"│   └── underscore@1.8.3 \n" +
				"├── grunt-mocha-test@0.13.2 \n" +
				"├─┬ jshint@2.9.4 \n" +
				"│ ├── cli@1.0.1 \n" +
				"│ ├─┬ console-browserify@1.1.0 \n" +
				"│ │ └── date-now@0.1.4 \n" +
				"│ ├─┬ htmlparser2@3.8.3 \n" +
				"│ │ ├── domelementtype@1.3.0 \n" +
				"│ │ ├── domhandler@2.3.0 \n" +
				"│ │ ├─┬ domutils@1.5.1 \n" +
				"│ │ │ └─┬ dom-serializer@0.1.0 \n" +
				"│ │ │   ├── domelementtype@1.1.3 \n" +
				"│ │ │   └── entities@1.1.1 \n" +
				"│ │ ├── entities@1.0.0 \n" +
				"│ │ └── readable-stream@1.1.14 \n" +
				"│ ├── lodash@3.7.0 \n" +
				"│ ├─┬ minimatch@3.0.4 \n" +
				"│ │ └─┬ brace-expansion@1.1.8 \n" +
				"│ │   ├── balanced-match@1.0.0 \n" +
				"│ │   └── concat-map@0.0.1 \n" +
				"│ ├── shelljs@0.3.0 \n" +
				"│ └── strip-json-comments@1.0.4 \n" +
				"├── kubernetes-client@2.2.3 \n" +
				"├── lodash@4.17.4 \n" +
				"├─┬ mkdirp@0.5.1 \n" +
				"│ └── minimist@0.0.8 \n" +
				"├─┬ mocha@3.2.0 \n" +
				"│ ├── browser-stdout@1.3.0 \n" +
				"│ ├─┬ commander@2.9.0 \n" +
				"│ │ └── graceful-readlink@1.0.1 \n" +
				"│ ├─┬ debug@2.2.0 \n" +
				"│ │ └── ms@0.7.1 \n" +
				"│ ├── diff@1.4.0 \n" +
				"│ ├── escape-string-regexp@1.0.5 \n" +
				"│ ├─┬ glob@7.0.5 \n" +
				"│ │ ├── fs.realpath@1.0.0 \n" +
				"│ │ ├── inflight@1.0.6 \n" +
				"│ │ ├── inherits@2.0.3 \n" +
				"│ │ └── path-is-absolute@1.0.1 \n" +
				"│ ├── growl@1.9.2 \n" +
				"│ ├── json3@3.3.2 \n" +
				"│ ├─┬ lodash.create@3.1.1 \n" +
				"│ │ ├─┬ lodash._baseassign@3.2.0 \n" +
				"│ │ │ ├── lodash._basecopy@3.0.1 \n" +
				"│ │ │ └─┬ lodash.keys@3.1.2 \n" +
				"│ │ │   ├── lodash._getnative@3.9.1 \n" +
				"│ │ │   ├── lodash.isarguments@3.1.0 \n" +
				"│ │ │   └── lodash.isarray@3.0.4 \n" +
				"│ │ ├── lodash._basecreate@3.0.3 \n" +
				"│ │ └── lodash._isiterateecall@3.0.9 \n" +
				"│ └─┬ supports-color@3.1.2 \n" +
				"│   └── has-flag@1.0.0 \n" +
				"├─┬ moment-timezone@0.5.11 \n" +
				"│ └── moment@2.20.1 \n" +
				"├── ncp@2.0.0 \n" +
				"├─┬ nock@9.0.13 \n" +
				"│ ├─┬ chai@3.5.0 \n" +
				"│ │ ├── assertion-error@1.1.0 \n" +
				"│ │ ├─┬ deep-eql@0.1.3 \n" +
				"│ │ │ └── type-detect@0.1.1 \n" +
				"│ │ └── type-detect@1.0.0 \n" +
				"│ ├─┬ debug@2.6.9 \n" +
				"│ │ └── ms@2.0.0 \n" +
				"│ ├── deep-equal@1.0.1 \n" +
				"│ ├── json-stringify-safe@5.0.1 \n" +
				"│ ├── propagate@0.4.0 \n" +
				"│ └── qs@6.4.0 \n" +
				"├── object-hash@1.1.5 \n" +
				"├─┬ request@2.81.0 \n" +
				"│ ├── aws-sign2@0.6.0 \n" +
				"│ ├── aws4@1.6.0 \n" +
				"│ ├── caseless@0.12.0 \n" +
				"│ ├─┬ combined-stream@1.0.5 \n" +
				"│ │ └── delayed-stream@1.0.0 \n" +
				"│ ├── extend@3.0.1 \n" +
				"│ ├── forever-agent@0.6.1 \n" +
				"│ ├─┬ form-data@2.1.4 \n" +
				"│ │ └── asynckit@0.4.0 \n" +
				"│ ├─┬ har-validator@4.2.1 \n" +
				"│ │ ├─┬ ajv@4.11.8 \n" +
				"│ │ │ ├── co@4.6.0 \n" +
				"│ │ │ └─┬ json-stable-stringify@1.0.1 \n" +
				"│ │ │   └── jsonify@0.0.0 \n" +
				"│ │ └── har-schema@1.0.5 \n" +
				"│ ├─┬ hawk@3.1.3 \n" +
				"│ │ ├── boom@2.10.1 \n" +
				"│ │ ├── cryptiles@2.0.5 \n" +
				"│ │ ├── hoek@2.16.3 \n" +
				"│ │ └── sntp@1.0.9 \n" +
				"│ ├─┬ http-signature@1.1.1 \n" +
				"│ │ ├── assert-plus@0.2.0 \n" +
				"│ │ ├─┬ jsprim@1.4.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├── extsprintf@1.3.0 \n" +
				"│ │ │ ├── json-schema@0.2.3 \n" +
				"│ │ │ └─┬ verror@1.10.0 \n" +
				"│ │ │   └── assert-plus@1.0.0 \n" +
				"│ │ └─┬ sshpk@1.13.1 \n" +
				"│ │   ├── asn1@0.2.3 \n" +
				"│ │   ├── assert-plus@1.0.0 \n" +
				"│ │   ├── bcrypt-pbkdf@1.0.1 \n" +
				"│ │   ├─┬ dashdash@1.14.1 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── ecc-jsbn@0.1.1 \n" +
				"│ │   ├─┬ getpass@0.1.7 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── jsbn@0.1.1 \n" +
				"│ │   └── tweetnacl@0.14.5 \n" +
				"│ ├── is-typedarray@1.0.0 \n" +
				"│ ├── isstream@0.1.2 \n" +
				"│ ├─┬ mime-types@2.1.17 \n" +
				"│ │ └── mime-db@1.30.0 \n" +
				"│ ├── oauth-sign@0.8.2 \n" +
				"│ ├── performance-now@0.2.0 \n" +
				"│ ├── safe-buffer@5.1.1 \n" +
				"│ ├── stringstream@0.0.5 \n" +
				"│ ├─┬ tough-cookie@2.3.3 \n" +
				"│ │ └── punycode@1.4.1 \n" +
				"│ ├── tunnel-agent@0.6.0 \n" +
				"│ └── uuid@3.2.1 \n" +
				"├─┬ rimraf@2.5.4 \n" +
				"│ └── glob@7.1.2 \n" +
				"├─┬ shelljs@0.7.5 \n" +
				"│ ├── interpret@1.1.0 \n" +
				"│ └── rechoir@0.6.2 \n" +
				"├── shortid@2.2.8 \n" +
				"├─┬ sinon@1.17.6 \n" +
				"│ ├── formatio@1.1.1 \n" +
				"│ ├── lolex@1.3.2 \n" +
				"│ ├── samsam@1.1.2 \n" +
				"│ └─┬ util@0.10.3 \n" +
				"│   └── inherits@2.0.1 \n" +
				"├─┬ soajs@2.0.3 \n" +
				"│ ├─┬ body-parser@1.18.2 \n" +
				"│ │ ├── bytes@3.0.0 \n" +
				"│ │ ├── content-type@1.0.4 \n" +
				"│ │ ├── depd@1.1.2 \n" +
				"│ │ ├─┬ http-errors@1.6.2 \n" +
				"│ │ │ ├── depd@1.1.1 \n" +
				"│ │ │ ├── setprototypeof@1.0.3 \n" +
				"│ │ │ └── statuses@1.4.0 \n" +
				"│ │ ├── iconv-lite@0.4.19 \n" +
				"│ │ ├─┬ on-finished@2.3.0 \n" +
				"│ │ │ └── ee-first@1.1.1 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├─┬ raw-body@2.3.2 \n" +
				"│ │ │ └── unpipe@1.0.0 \n" +
				"│ │ └─┬ type-is@1.6.15 \n" +
				"│ │   └── media-typer@0.3.0 \n" +
				"│ ├─┬ connect@3.6.5 \n" +
				"│ │ ├─┬ finalhandler@1.0.6 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── parseurl@1.3.2 \n" +
				"│ │ └── utils-merge@1.0.1 \n" +
				"│ ├─┬ cookie-parser@1.4.3 \n" +
				"│ │ ├── cookie@0.3.1 \n" +
				"│ │ └── cookie-signature@1.0.6 \n" +
				"│ ├─┬ express@4.16.0 \n" +
				"│ │ ├─┬ accepts@1.3.4 \n" +
				"│ │ │ └── negotiator@0.6.1 \n" +
				"│ │ ├── array-flatten@1.1.1 \n" +
				"│ │ ├── content-disposition@0.5.2 \n" +
				"│ │ ├── encodeurl@1.0.2 \n" +
				"│ │ ├── escape-html@1.0.3 \n" +
				"│ │ ├── etag@1.8.1 \n" +
				"│ │ ├── finalhandler@1.1.0 \n" +
				"│ │ ├── fresh@0.5.2 \n" +
				"│ │ ├── merge-descriptors@1.0.1 \n" +
				"│ │ ├── methods@1.1.2 \n" +
				"│ │ ├── path-to-regexp@0.1.7 \n" +
				"│ │ ├─┬ proxy-addr@2.0.2 \n" +
				"│ │ │ ├── forwarded@0.1.2 \n" +
				"│ │ │ └── ipaddr.js@1.5.2 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├── range-parser@1.2.0 \n" +
				"│ │ ├─┬ send@0.16.0 \n" +
				"│ │ │ ├── destroy@1.0.4 \n" +
				"│ │ │ ├── mime@1.4.1 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── serve-static@1.13.0 \n" +
				"│ │ ├── setprototypeof@1.1.0 \n" +
				"│ │ ├── statuses@1.3.1 \n" +
				"│ │ └── vary@1.1.2 \n" +
				"│ ├─┬ express-session@1.15.6 \n" +
				"│ │ ├── crc@3.4.4 \n" +
				"│ │ ├── on-headers@1.0.1 \n" +
				"│ │ └─┬ uid-safe@2.1.5 \n" +
				"│ │   └── random-bytes@1.0.0 \n" +
				"│ ├─┬ http-proxy@1.16.2 \n" +
				"│ │ ├── eventemitter3@1.2.0 \n" +
				"│ │ └── requires-port@1.0.0 \n" +
				"│ ├── merge@1.2.0 \n" +
				"│ ├── method-override@2.3.10 \n" +
				"│ ├─┬ morgan@1.9.0 \n" +
				"│ │ └── basic-auth@2.0.0 \n" +
				"│ ├── netmask@1.0.6 \n" +
				"│ ���─┬ oauth2-server@2.4.1 \n" +
				"│ │ └── basic-auth@0.0.1 \n" +
				"│ ├─┬ path-to-regexp@1.7.0 \n" +
				"│ │ └── isarray@0.0.1 \n" +
				"│ ├─┬ soajs.core.drivers@2.0.3 \n" +
				"│ │ ├─┬ dockerode@2.5.3  (git://github.com/soajs/dockerode.git#51ff2e2f1d2ba7b82bcdef31a2b85289218bd2a2)\n" +
				"│ │ │ ├─┬ concat-stream@1.5.2 \n" +
				"│ │ │ │ ├─┬ readable-stream@2.0.6 \n" +
				"│ │ │ │ │ └── isarray@1.0.0 \n" +
				"│ │ │ │ └── typedarray@0.0.6 \n" +
				"│ │ │ ├─┬ docker-modem@1.0.4  (git://github.com/aff04/docker-modem.git#c40f13261825c40ff7d3cf3019b090d7e81bacbf)\n" +
				"│ │ │ │ ├─┬ JSONStream@0.10.0 \n" +
				"│ │ │ │ │ ├── jsonparse@0.0.5 \n" +
				"│ │ │ │ │ └── through@2.3.8 \n" +
				"│ │ │ │ ├── readable-stream@1.0.34 \n" +
				"│ │ │ │ └── split-ca@1.0.1 \n" +
				"│ │ │ └─┬ tar-fs@1.12.0 \n" +
				"│ │ │   ├─┬ pump@1.0.3 \n" +
				"│ │ │   │ └── end-of-stream@1.4.1 \n" +
				"│ │ │   └─┬ tar-stream@1.5.5 \n" +
				"│ │ │     └── bl@1.2.1 \n" +
				"│ │ ├─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │ ├─┬ assign-deep@0.4.6 \n" +
				"│ │ │ │ ├── assign-symbols@0.1.1 \n" +
				"│ │ │ │ ├── is-primitive@2.0.0 \n" +
				"│ │ │ │ └── kind-of@5.1.0 \n" +
				"│ │ │ └── async@2.6.0 \n" +
				"│ │ └─┬ ws@3.3.1 \n" +
				"│ │   ├── async-limiter@1.0.0 \n" +
				"│ │   └── ultron@1.1.1 \n" +
				"│ ├── soajs.core.libs@1.0.1 \n" +
				"│ ├─┬ soajs.core.modules@2.0.1 \n" +
				"│ │ ├── bcryptjs@2.4.3 \n" +
				"│ │ ├─┬ bunyan@1.8.5 \n" +
				"│ ��� │ ├─┬ dtrace-provider@0.8.6 \n" +
				"│ │ │ │ └── nan@2.8.0 \n" +
				"│ │ │ ├─┬ mv@2.1.1 \n" +
				"│ │ │ │ └─┬ rimraf@2.4.5 \n" +
				"│ │ │ │   └── glob@6.0.4 \n" +
				"│ │ │ └── safe-json-stringify@1.0.4 \n" +
				"│ │ ├─┬ bunyan-format@0.2.1 \n" +
				"│ │ │ ├── ansicolors@0.2.1 \n" +
				"│ │ │ ├── ansistyles@0.1.3 \n" +
				"│ │ │ └─┬ xtend@2.1.2 \n" +
				"│ │ │   └── object-keys@0.4.0 \n" +
				"│ │ ├─┬ elasticsearch@12.1.3 \n" +
				"│ │ │ └─┬ promise@7.3.1 \n" +
				"│ │ │   └── asap@2.0.6 \n" +
				"│ │ ├── elasticsearch-deletebyquery@1.6.0 \n" +
				"│ │ ├── jsonschema@1.1.1 \n" +
				"│ │ ├─┬ mongodb@2.2.31 \n" +
				"│ │ │ ├── es6-promise@3.2.1 \n" +
				"│ │ │ ├─┬ mongodb-core@2.1.15 \n" +
				"│ │ │ │ ├── bson@1.0.4 \n" +
				"│ │ │ │ └─┬ require_optional@1.0.1 \n" +
				"│ │ │ │   ├── resolve-from@2.0.0 \n" +
				"│ │ │ │   └── semver@5.5.0 \n" +
				"│ │ │ └─┬ readable-stream@2.2.7 \n" +
				"│ │ │   ├── buffer-shims@1.0.0 \n" +
				"│ │ │   ├── isarray@1.0.0 \n" +
				"│ │ │   ├── process-nextick-args@1.0.7 \n" +
				"│ │ │   ├── string_decoder@1.0.3 \n" +
				"│ │ │   └── util-deprecate@1.0.2 \n" +
				"│ │ ├─┬ nodemailer@1.11.0 \n" +
				"│ │ │ ├─┬ libmime@1.2.0 \n" +
				"│ │ │ │ ├── libbase64@0.1.0 \n" +
				"│ │ │ │ └── libqp@1.1.0 \n" +
				"│ │ │ ├─┬ mailcomposer@2.1.0 \n" +
				"│ │ │ │ └─┬ buildmail@2.0.0 \n" +
				"│ │ │ │   ├── addressparser@0.3.2 \n" +
				"│ │ │ │   └── needle@0.10.0 \n" +
				"│ │ │ ├── needle@0.11.0 \n" +
				"│ │ │ ├─┬ nodemailer-direct-transport@1.1.0 \n" +
				"│ │ │ │ └── smtp-connection@1.3.8 \n" +
				"│ │ │ └─┬ nodemailer-smtp-transport@1.1.0 \n" +
				"│ │ │   └── clone@1.0.3 \n" +
				"│ │ ├─┬ nodemailer-direct-transport@3.3.2 \n" +
				"│ │ │ ├─┬ nodemailer-shared@1.1.0 \n" +
				"│ │ │ │ └── nodemailer-fetch@1.6.0 \n" +
				"│ │ │ └─┬ smtp-connection@2.12.0 \n" +
				"│ │ │   └─┬ httpntlm@1.6.1 \n" +
				"│ │ │     └── httpreq@0.4.24 \n" +
				"│ │ ├── nodemailer-sendmail-transport@1.0.0 \n" +
				"│ │ └─┬ nodemailer-smtp-transport@2.7.2 \n" +
				"│ │   ├── nodemailer-wellknown@0.1.10 \n" +
				"│ │   └── smtp-connection@2.12.0 \n" +
				"│ ├─┬ soajs.urac.driver@1.0.4 \n" +
				"│ │ ├── activedirectory@0.7.2 \n" +
				"│ │ ├─┬ ldapjs@1.0.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├─┬ backoff@2.5.0 \n" +
				"│ │ │ │ └── precond@0.2.3 \n" +
				"│ │ │ ├── dtrace-provider@0.7.1 \n" +
				"│ │ │ ├─┬ ldap-filter@0.2.2 \n" +
				"│ │ │ │ └── assert-plus@0.1.5 \n" +
				"│ │ │ └─┬ vasync@1.6.4 \n" +
				"│ │ │   └─┬ verror@1.6.0 \n" +
				"│ │ │     └── extsprintf@1.2.0 \n" +
				"│ │ ├── passport@0.4.0 \n" +
				"│ │ └── soajs.core.modules@1.0.9 \n" +
				"│ ├─┬ useragent@2.2.1 \n" +
				"│ │ └─┬ tmp@0.0.33 \n" +
				"│ │   └── os-tmpdir@1.0.2 \n" +
				"│ └── validator@6.2.0 \n" +
				"├── soajs.controller@2.0.3 \n" +
				"├── soajs.mongodb.data@2.0.0 \n" +
				"├── soajs.oauth@2.0.3 \n" +
				"├─┬ soajs.urac@2.0.3 \n" +
				"│ ├─┬ passport@0.3.2 \n" +
				"│ │ └── pause@0.0.1 \n" +
				"│ ├─┬ passport-facebook@2.1.1 \n" +
				"│ │ └─┬ passport-oauth2@1.4.0 \n" +
				"│ │   ├── oauth@0.9.15 \n" +
				"│ │   └── uid2@0.0.3 \n" +
				"│ ├── passport-github@1.1.0 \n" +
				"│ ├─┬ passport-google-oauth@1.0.0 \n" +
				"│ │ ├── passport-google-oauth1@1.0.0 \n" +
				"│ │ └── passport-google-oauth20@1.0.0 \n" +
				"│ ├─┬ passport-local@1.0.0 \n" +
				"│ │ └── passport-strategy@1.0.0 \n" +
				"│ ├─┬ passport-twitter@1.0.4 \n" +
				"│ │ ├── passport-oauth1@1.1.0 \n" +
				"│ │ └─┬ xtraverse@0.1.0 \n" +
				"│ │   └── xmldom@0.1.27 \n" +
				"│ ├─┬ soajs@2.0.2 \n" +
				"│ │ ├─┬ soajs.core.drivers@2.0.2 \n" +
				"│ │ │ └─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │   └── async@2.6.0 \n" +
				"│ │ └── soajs.core.modules@2.0.0 \n" +
				"│ └── uuid@3.0.1 \n" +
				"├─┬ unzip2@0.2.5 \n" +
				"│ ├─┬ binary@0.3.0 \n" +
				"│ │ ├── buffers@0.1.1 \n" +
				"│ │ └─┬ chainsaw@0.1.0 \n" +
				"│ │   └── traverse@0.3.9 \n" +
				"│ ├─┬ fstream@0.1.31 \n" +
				"│ │ └─┬ graceful-fs@3.0.11 \n" +
				"│ │   └── natives@1.1.1 \n" +
				"│ ├─┬ match-stream@0.0.2 \n" +
				"│ │ └── readable-stream@1.0.34 \n" +
				"│ ├─┬ pullstream@0.4.1 \n" +
				"│ │ ├── over@0.0.5 \n" +
				"│ │ ├── readable-stream@1.0.34 \n" +
				"│ │ └─┬ slice-stream@1.0.0 \n" +
				"│ │   └── readable-stream@1.0.34 \n" +
				"│ ├─┬ readable-stream@1.0.34 \n" +
				"│ │ ├── core-util-is@1.0.2 \n" +
				"│ │ └── string_decoder@0.10.31 \n" +
				"│ └── setimmediate@1.0.5 \n" +
				"└─┬ yamljs@0.2.8 \n" +
				"  └─┬ argparse@1.0.9 \n" +
				"    └── sprintf-js@1.0.3 \n" +
				"\n" +
				"\n" +
				"travis_time:end:0271b378:start=1516632752442275724,finish=1516632785238671709,duration=32796395985\n" +
				"[0Ktravis_fold:end:install.npm\n" +
				"[0Ktravis_fold:start:before_script.1\n" +
				"[0Ktravis_time:start:09263a08\n" +
				"[0K$ npm install -g grunt-cli\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/bin/grunt -> /home/travis/.nvm/versions/node/v6.9.5/lib/node_modules/grunt-cli/bin/grunt\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/lib\n" +
				"└─┬ grunt-cli@1.2.0 \n" +
				"  ├─┬ findup-sync@0.3.0 \n" +
				"  │ └─┬ glob@5.0.15 \n" +
				"  │   ├─┬ inflight@1.0.6 \n" +
				"  │   │ └── wrappy@1.0.2 \n" +
				"  │   ├── inherits@2.0.3 \n" +
				"  │   ├─┬ minimatch@3.0.4 \n" +
				"  │   │ └─┬ brace-expansion@1.1.8 \n" +
				"  │   │   ├── balanced-match@1.0.0 \n" +
				"  │   │   └── concat-map@0.0.1 \n" +
				"  │   ├── once@1.4.0 \n" +
				"  │   └── path-is-absolute@1.0.1 \n" +
				"  ├── grunt-known-options@1.1.0 \n" +
				"  ├─┬ nopt@3.0.6 \n" +
				"  │ └── abbrev@1.1.1 \n" +
				"  └── resolve@1.1.7 \n" +
				"\n" +
				"\n" +
				"travis_time:end:09263a08:start=1516632785559483836,finish=1516632787215454340,duration=1655970504\n" +
				"[0Ktravis_fold:end:before_script.1\n" +
				"[0Ktravis_fold:start:before_script.2\n" +
				"[0Ktravis_time:start:18776dfe\n" +
				"[0K$ docker pull soajsorg/soajs\n" +
				"Using default tag: latest\n" +
				"latest: Pulling from soajsorg/soajs\n" +
				"af49a5ceb2a5: Pulling fs layer\n" +
				"8f9757b472e7: Pulling fs layer\n" +
				"e931b117db38: Pulling fs layer\n" +
				"47b5e16c0811: Pulling fs layer\n" +
				"9332eaf1a55b: Pulling fs layer\n" +
				"7323f579e778: Pulling fs layer\n" +
				"61c8c60d374e: Pulling fs layer\n" +
				"c9a783521b12: Pulling fs layer\n" +
				"452f98a11bd8: Pulling fs layer\n" +
				"384667d2af15: Pulling fs layer\n" +
				"c357a82b5d6f: Pulling fs layer\n" +
				"72f10c562385: Pulling fs layer\n" +
				"47b5e16c0811: Waiting\n" +
				"9332eaf1a55b: Waiting\n" +
				"7323f579e778: Waiting\n" +
				"61c8c60d374e: Waiting\n" +
				"c9a783521b12: Waiting\n" +
				"452f98a11bd8: Waiting\n" +
				"384667d2af15: Waiting\n" +
				"c357a82b5d6f: Waiting\n" +
				"72f10c562385: Waiting\n" +
				"e931b117db38: Verifying Checksum\n" +
				"e931b117db38: Download complete\n" +
				"8f9757b472e7: Verifying Checksum\n" +
				"8f9757b472e7: Download complete\n" +
				"47b5e16c0811: Verifying Checksum\n" +
				"47b5e16c0811: Download complete\n" +
				"9332eaf1a55b: Verifying Checksum\n" +
				"9332eaf1a55b: Download complete\n" +
				"7323f579e778: Verifying Checksum\n" +
				"7323f579e778: Download complete\n" +
				"61c8c60d374e: Verifying Checksum\n" +
				"61c8c60d374e: Download complete\n" +
				"c9a783521b12: Verifying Checksum\n" +
				"c9a783521b12: Download complete\n" +
				"af49a5ceb2a5: Verifying Checksum\n" +
				"af49a5ceb2a5: Download complete\n" +
				"452f98a11bd8: Verifying Checksum\n" +
				"452f98a11bd8: Download complete\n" +
				"384667d2af15: Verifying Checksum\n" +
				"384667d2af15: Download complete\n" +
				"c357a82b5d6f: Verifying Checksum\n" +
				"c357a82b5d6f: Download complete\n" +
				"72f10c562385: Verifying Checksum\n" +
				"72f10c562385: Download complete\n" +
				"af49a5ceb2a5: Pull complete\n" +
				"8f9757b472e7: Pull complete\n" +
				"e931b117db38: Pull complete\n" +
				"47b5e16c0811: Pull complete\n" +
				"9332eaf1a55b: Pull complete\n" +
				"7323f579e778: Pull complete\n" +
				"61c8c60d374e: Pull complete\n" +
				"c9a783521b12: Pull complete\n" +
				"452f98a11bd8: Pull complete\n" +
				"384667d2af15: Pull complete\n" +
				"c357a82b5d6f: Pull complete\n" +
				"72f10c562385: Pull complete\n" +
				"Digest: sha256:8ed6c9de7889224c91f5f31be359c3b1f981112dcde86e503f7f0a1974bfeb9a\n" +
				"Status: Downloaded newer image for soajsorg/soajs:latest\n" +
				"\n" +
				"travis_time:end:18776dfe:start=1516632787223444927,finish=1516632814185488407,duration=26962043480\n" +
				"[0Ktravis_fold:end:before_script.2\n" +
				"[0Ktravis_fold:start:before_script.3\n" +
				"[0Ktravis_time:start:006e2c91\n" +
				"[0K$ sleep 10\n" +
				"\n" +
				"travis_time:end:006e2c91:start=1516632814192526630,finish=1516632824199594539,duration=10007067909\n" +
				"[0Ktravis_fold:end:before_script.3\n" +
				"[0Ktravis_time:start:177f2130\n" +
				"[0K$ grunt coverage\n" +
				"[4mRunning \"clean:doc\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"clean:coverage\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"copy:main\" (copy) task[24m\n" +
				"Copied 9 files\n" +
				"\n" +
				"[4mRunning \"env:coverage\" (env) task[24m\n" +
				"\n" +
				"[4mRunning \"instrument\" task[24m\n" +
				"Instrumented 62 files\n" +
				"\n" +
				"[4mRunning \"mochaTest:unit\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  ✓ Init environment model\n" +
				"  testing catalog.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing list\n" +
				"      ✓ Success\n" +
				"      ✓ Success with version\n" +
				"\n" +
				"  testing helper soajs.cd.js\n" +
				"    testing deepVersionComparison\n" +
				"      ✓ success - no update detected, official image\n" +
				"      ✓ success - deployer update detected, official image\n" +
				"      ✓ success - core update detected, official image\n" +
				"      ✓ success - image update, custom image\n" +
				"      ✓ success - image tag is not a number\n" +
				"    testing processUndeployedServices\n" +
				"      ✓ success - will build list of undeployed services, version specified\n" +
				"      ✓ success - will build list of undeployed services, version not specified\n" +
				"      ✓ success - will build list of one service, daemon specified is already deployed\n" +
				"    processOneService\n" +
				"      ✓ success - commit error, service is deployed\n" +
				"      ✓ Success update\n" +
				"      ✓ Success notify, service is deployed\n" +
				"      ✓ Success notify, service is not deployed\n" +
				"    checkRecordConfig\n" +
				"      ✓ Fail\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Success\n" +
				"      ✓ Success 2\n" +
				"      ✓ Success 3\n" +
				"      ✓ Success - repository cd information found for custom deployed service\n" +
				"    getEnvsServices\n" +
				"      ✓ Success\n" +
				"    doesServiceHaveUpdates\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Success doesServiceHaveUpdates\n" +
				"      ✓ Success doesServiceHaveUpdates with v\n" +
				"    getLatestSOAJSImageInfo\n" +
				"      ✓ Success getLatestSOAJSImageInfo\n" +
				"    getServices\n" +
				"      ✓ Success 1\n" +
				"    deepVersionComparison\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success with id\n" +
				"      ✓ Success\n" +
				"      ✓ Success without serviceVersion\n" +
				"    testing getLedger\n" +
				"      ✓ Success\n" +
				"    testing getUpdates\n" +
				"      ✓ Success getUpdates\n" +
				"    testing markRead\n" +
				"      ✓ Success markRead by id\n" +
				"      ✓ Success markRead all\n" +
				"    testing saveConfig\n" +
				"      ✓ Success saveConfig\n" +
				"\n" +
				"  testing ci.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing toggleRepoStatus\n" +
				"      ✓ Success - enable\n" +
				"      ✓ Success - disable\n" +
				"    testing getRepoSettings\n" +
				"      ✓ Success getRepoSettings\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success id (number)\n" +
				"      ✓ Success id (string)\n" +
				"    testing getRepoYamlFile\n" +
				"      ✓ success - will get file\n" +
				"\n" +
				"  testing autoscale.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    testing set\n" +
				"      ✓ success - update autoscalers\n" +
				"      ✓ success - turn off autoscalers\n" +
				"      ✓ fail - update autoscalers, driver error\n" +
				"      ✓ fail - turn off autoscalers, driver error\n" +
				"    testing updateEnvAutoscaleConfig\n" +
				"      ✓ success - will update environment autoscale config and set deployer record\n" +
				"      ✓ success - will update environment autoscale config\n" +
				"\n" +
				"  testing deploy.js\n" +
				"    getGitRecord\n" +
				"      ✓ Success getGitRecord\n" +
				"    checkPort\n" +
				"      ✓ Fail. checkPort\n" +
				"      ✓ Success checkPort\n" +
				"    computeCatalogEnvVars\n" +
				"      ✓ Fail computeCatalogEnvVars\n" +
				"      ✓ Success computeCatalogEnvVars\n" +
				"    getDashDbInfo\n" +
				"      ✓ Success getDashDbInfo\n" +
				"    deployContainer\n" +
				"      ✓ Success deployContainer\n" +
				"      ✓ Success deployContainer options\n" +
				"      ✓ Success deployContainer rebuild\n" +
				"      ✓ Success deployContainer with Kubernetes - null mode\n" +
				"      ✓ Success deployContainer with Kubernetes - replicated mode\n" +
				"      ✓ Success deployContainer with Kubernetes - global mode\n" +
				"      ✓ Success deployContainer with Docker \n" +
				"\n" +
				"  testing deploy.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    deployService\n" +
				"      ✓ Success deployService. soajs (332ms)\n" +
				"      ✓ testing deploy service type custom (210ms)\n" +
				"    testing deploy plugin\n" +
				"      ✓ success - deploy heapster plugin\n" +
				"\n" +
				"  testing maintenance.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    streamLogs\n" +
				"      ✓ Failed\n" +
				"    maintenance\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"\n" +
				"  testing metrics.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    metrics\n" +
				"      ✓ get service metrics\n" +
				"      ✓ get node metrics\n" +
				"\n" +
				"  testing namespaces.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    list\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"    delete\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"\n" +
				"  testing nodes.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listNodes\n" +
				"      ✓ success\n" +
				"    removeNode\n" +
				"      ✓ success\n" +
				"    updateNode\n" +
				"      ✓ success\n" +
				"    addNode\n" +
				"      ✓ success\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listServices\n" +
				"      ✓ Success\n" +
				"    scaleService\n" +
				"      ✓ Success\n" +
				"    deleteService\n" +
				"      ✓ Success\n" +
				"    testing checkResource\n" +
				"      ✓ success - will find heapster service\n" +
				"      ✓ success - will not find heapster service\n" +
				"\n" +
				"  testing helper daemons.js\n" +
				"    validateCronTime ()\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"    testing checkIfGroupIsDeployed\n" +
				"      ✓ success - will get one deployed daemon\n" +
				"      ✓ success - will not find any deployed daemons\n" +
				"\n" +
				"  testing daemons.js\n" +
				"    ✓ Init model\n" +
				"    addGroupConfig\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"      ✓ Fail\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing environment.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"    testing removeCert\n" +
				"      ✓ Success removeCert\n" +
				"    testing Update deployer configuration\n" +
				"      ✓ Success removeCert\n" +
				"\n" +
				"  testing status.js\n" +
				"    ✓ Success startDeployment case 1 (10045ms)\n" +
				"    ✓ Success startDeployment case 2 (10012ms)\n" +
				"    ✓ Success startDeployment case 3 (10012ms)\n" +
				"    ✓ Success startDeployment case 4 (10014ms)\n" +
				"    ✓ Success checkProgress case 1 (10026ms)\n" +
				"    ✓ Success checkProgress  case 2 (10058ms)\n" +
				"    ✓ Success rollbackDeployment case 1 (18032ms)\n" +
				"    ✓ Success rollbackDeployment case 2 (18047ms)\n" +
				"    ✓ Success rollbackDeployment case 3 (17042ms)\n" +
				"\n" +
				"  testing statusRollback.js\n" +
				"    ✓ Success removeCertificates\n" +
				"    ✓ Success removeProduct with id\n" +
				"    ✓ Success removeProduct with tenant\n" +
				"    ✓ Success removeCertificates with none\n" +
				"    ✓ Success removeService\n" +
				"    ✓ Success removeService with no id\n" +
				"    ✓ Success removeController\n" +
				"    ✓ Success removeUrac\n" +
				"    ✓ Success removeOauth\n" +
				"    ✓ Success removeNginx\n" +
				"    ✓ Success removeCluster local with serviceId\n" +
				"    ✓ Success removeCluster local with no serviceId\n" +
				"    ✓ Success removeCluster external\n" +
				"    ✓ Success removeCluster none\n" +
				"    ✓ Success redirectTo3rdParty user no roll back\n" +
				"    ✓ Success redirectTo3rdParty user \n" +
				"    ✓ fail redirectTo3rdParty no test \n" +
				"    ✓ Success redirectTo3rdParty user recursive  (20029ms)\n" +
				"    ✓ Success redirectTo3rdParty user recursive no id\n" +
				"    ✓ fail redirectTo3rdParty no options \n" +
				"    removeCatalog\n" +
				"      ✓ Success with recipe\n" +
				"      ✓ Success with no recipe\n" +
				"    initBLModel\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing statusUtils.js\n" +
				"    ✓ Success uploadCertificates case 1\n" +
				"    ✓ Success uploadCertificates case 2\n" +
				"    ✓ Success uploadCertificates case 3\n" +
				"    ✓ Success productize case 1\n" +
				"    ✓ Success productize case 2\n" +
				"    ✓ Success productize case 3\n" +
				"    ✓ Success productize case 4\n" +
				"    ✓ Success deployClusterResource case 1\n" +
				"    ✓ Success deployClusterResource case 2\n" +
				"    ✓ Success deployClusterResource case 3\n" +
				"    ✓ Success handleClusters\n" +
				"    ✓ Success deployservice case  1\n" +
				"    ✓ Success deployservice case 2\n" +
				"    ✓ Success deployController\n" +
				"    ✓ Success deployUrac\n" +
				"    ✓ Success deployOauth\n" +
				"    ✓ Success createNginxRecipe case 1\n" +
				"    ✓ Success createNginxRecipe case 2\n" +
				"    ✓ Success createNginxRecipe case 3\n" +
				"    ✓ Success deployNgin case 1\n" +
				"    ✓ Success deployNgin case 2\n" +
				"    ✓ Success deployNgin case 3\n" +
				"    ✓ Success createUserAndGroup case 1\n" +
				"    ✓ Success createUserAndGroup case 2\n" +
				"    ✓ Success createUserAndGroup case 3\n" +
				"    ✓ Success createUserAndGroup case 4\n" +
				"    ✓ Success createUserAndGroup case 5\n" +
				"    ✓ Success createUserAndGroup case 6\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 1\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 2\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 3\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 4\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 5\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 6\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 1\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 2\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 3\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 5\n" +
				"    ✓ Success initBLModel\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    ✓ Fail - Bad config path\n" +
				"    ✓ Fail - Cannot parse Yaml file\n" +
				"    ✓ Fail - Bad Yaml file\n" +
				"    ✓ Fail - Empty Yaml file\n" +
				"    ✓ Fail - No summary for API\n" +
				"    ✓ Success - config file generated\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    getCustomRepoFiles\n" +
				"      ✓ Fail 1: soa.js\n" +
				"      ✓ Fail 2: swagger.yml\n" +
				"      ✓ success\n" +
				"    comparePaths\n" +
				"      ✓ Success: will remove\n" +
				"      ✓ Success: will sync\n" +
				"    testing removePath\n" +
				"      ✓ success - type service\n" +
				"      ✓ success - type daemon\n" +
				"    extractAPIsList\n" +
				"      ✓ Success new style\n" +
				"      ✓ Success old style\n" +
				"    validateFileContents\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    analyzeConfigSyncFile\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"      ✓ Success Multi\n" +
				"      ✓ Fail Multi\n" +
				"    buildDeployerOptions\n" +
				"      ✓ Success\n" +
				"    getServiceInfo\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanAdd\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanSync\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    extractDaemonJobs\n" +
				"      ✓ Success\n" +
				"    cleanConfigDir\n" +
				"      ✓ Success\n" +
				"    testing checkifRepoIsDeployed\n" +
				"      ✓ success - will get one deployed service\n" +
				"      ✓ success - will not find any deployed services\n" +
				"\n" +
				"  testing git.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing login\n" +
				"      ✓ success\n" +
				"      ✓ success password\n" +
				"    testing logout\n" +
				"      ✓ success\n" +
				"      ✓ success 2\n" +
				"    testing listAccounts\n" +
				"      ✓ success listAccounts\n" +
				"    testing getRepos\n" +
				"      ✓ success getRepos\n" +
				"    testing getFiles\n" +
				"      ✓ success getFile\n" +
				"      ✓ success getHAFile\n" +
				"    testing getBranches\n" +
				"      ✓ success getBranches\n" +
				"      ✓ fail - cannot get Branches for service - wrong name\n" +
				"      ✓ success - will get Branches for service\n" +
				"      ✓ success - will get Branches for daemon\n" +
				"    testing activateRepo\n" +
				"      ✓ success activateRepo service\n" +
				"      ✓ success activateRepo multi\n" +
				"      ✓ success activateRepo custom\n" +
				"      ✓ success activateRepo misc\n" +
				"    testing deactivateRepo\n" +
				"      ✓ success deactivate multi\n" +
				"      ✓ success deactivate custom\n" +
				"      ✓ success deactivate service\n" +
				"      ✓ fail deactivateRepo\n" +
				"    testing syncRepo\n" +
				"      ✓ success syncRepo service\n" +
				"      ✓ success syncRepo multi\n" +
				"      ✓ success syncRepo multi 2\n" +
				"      ✓ Fail syncRepo outOfSync\n" +
				"      ✓ Success syncRepo upToDate\n" +
				"\n" +
				"  testing helper host.js\n" +
				"    getTenants\n" +
				"      ✓ Success getTenants with acl_all_env\n" +
				"      ✓ Success getTenants with acl 1\n" +
				"      ✓ Success getTenants with acl 2\n" +
				"      ✓ Success getTenants with acl 3\n" +
				"      ✓ Success getTenants with package_acl_all_env\n" +
				"      ✓ Success getTenants with package_acl\n" +
				"      ✓ Success getTenants with user acl\n" +
				"\n" +
				"  testing host.js\n" +
				"    init ()\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"    listHostEnv\n" +
				"      ✓ Success listHostEnv\n" +
				"    listHAhostEnv\n" +
				"      ✓ Success listHAhostEnv\n" +
				"    awareness\n" +
				"      ✓ Success maintenanceOperation. controller\n" +
				"\n" +
				"  testing product.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"      ✓ Success list with includeEnvs\n" +
				"    updateSettings\n" +
				"      ✓ Success updateSettings\n" +
				"\n" +
				"  testing swagger.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing tenant.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing models git.js\n" +
				"    testing getAuthToken\n" +
				"      ✓ success 1\n" +
				"    testing getAccount\n" +
				"      ✓ success 1\n" +
				"      ✓ success 2\n" +
				"    testing getRepo\n" +
				"      ✓ success 1\n" +
				"    testing searchForAccount\n" +
				"      ✓ success 1\n" +
				"    testing addRepoToAccount\n" +
				"      ✓ success 1\n" +
				"    testing removeRepoFromAccount\n" +
				"      ✓ success 1\n" +
				"    testing updateRepoInfo\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing models host.js\n" +
				"    testing getEnvironment\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing ci drone index.js\n" +
				"    testing getFileName\n" +
				"      ✓ Call getFileName\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"DATA { uri: 'https://my.drone/api/repos/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return 1 repo only\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/console-server/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return repos list\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ error while fetching repositories\n" +
				"    testing listRepoBranches\n" +
				"DATA { uri: 'https://my.drone/api/repos/soajsTestAccount/soajsTestRepo/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing listEnvVars\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listEnvVars\n" +
				"    testing addEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/SECRET_NAME',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"      ✓ Call deleteEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"DATA { log: { debug: [Function: debug] },\n" +
				"  settings: \n" +
				"   { domain: 'my.drone',\n" +
				"     owner: 'CLOUD',\n" +
				"     repo: 'dashboard',\n" +
				"     ciToken: 'access1' },\n" +
				"  params: \n" +
				"   { repoOwner: 'CLOUD',\n" +
				"     variables: { ENV_NAME_1: 'ENV_VALUE_1', ENV_NAME_2: 'ENV_VALUE_2' } } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_1',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_2',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_3',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_1',\n" +
				"     value: 'ENV_VALUE_1',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_2',\n" +
				"     value: 'ENV_VALUE_2',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call ensureRepoVars\n" +
				"    testing setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call activate setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call deactivate setHook\n" +
				"    testing listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"    testing updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ Call updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ updateSettings with Insufficient privileges\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { error: { message: 'error' } }\n" +
				"      ✓ error in updating\n" +
				"\n" +
				"  testing ci index.js\n" +
				"    testing addEnvVar\n" +
				"      ✓ Call Travis addEnvVar\n" +
				"      ✓ Call Drone addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call Travis updateEnvVar\n" +
				"      ✓ Call Drone updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"      ✓ Call Travis deleteEnvVar\n" +
				"      ✓ Call Drone deleteEnvVar\n" +
				"    testing setHook\n" +
				"      ✓ Call Travis setHook\n" +
				"      ✓ Call Drone setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call Travis listSettings\n" +
				"    testing updateSettings\n" +
				"      ✓ Call Travis updateSettings\n" +
				"      ✓ Call Drone updateSettings\n" +
				"    testing generateToken\n" +
				"      ✓ Call Travis generateToken\n" +
				"    testing listEnvVars\n" +
				"      ✓ Call Travis listEnvVars\n" +
				"      ✓ Call Drone listEnvVars\n" +
				"    testing listRepos\n" +
				"      ✓ Call Travis listRepos\n" +
				"      ✓ Call Drone listRepos\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call Travis ensureRepoVars\n" +
				"      ✓ Call Drone ensureRepoVars\n" +
				"\n" +
				"  testing ci travis index.js\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"      ✓ Call listRepos\n" +
				"    testing listRepoBranches\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call addEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"      ✓ Call deleteEnvVar\n" +
				"      ✓ Call listEnvVars\n" +
				"      ✓ Call ensureRepoVars Success\n" +
				"      ✓ Call ensureRepoVars Fail\n" +
				"    testing updateSettings\n" +
				"      ✓ Call updateSettings\n" +
				"    testing setHook\n" +
				"      ✓ Call setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call listSettings\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Fail\n" +
				"      ✓ Success - TODO\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success\n" +
				"      ✓ Success - with options name\n" +
				"      ✓ Fail\n" +
				"    testing getRepoContent\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success - empty repos\n" +
				"      ✓ Success - repo not found\n" +
				"      ✓ Success - repo found\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket_enterprise index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success public\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success without name\n" +
				"      ✓ Success with name\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success\n" +
				"      ✓ Success wth token\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success generate (789ms)\n" +
				"    testing checkAuthToken\n" +
				"      ✓ Success refresh\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing buildBranchesArray\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success type basic\n" +
				"      ✓ Success type oauth\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success (136ms)\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success checkUserRecord (115ms)\n" +
				"    testing checkOrgRecord\n" +
				"      ✓ Success checkOrgRecord (97ms)\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2 (1169ms)\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success getAllRepos token (99ms)\n" +
				"      ✓ Success getAllRepos personal (106ms)\n" +
				"      ✓ Success getAllRepos organization (100ms)\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github index.js\n" +
				"    testing login\n" +
				"      ✓ Success public personal (370ms)\n" +
				"      ✓ Success public organization (100ms)\n" +
				"      ✓ Success public organization (433ms)\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success 1\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git index.js\n" +
				"    testing login\n" +
				"      ✓ Login github\n" +
				"    testing logout\n" +
				"      ✓ logout github\n" +
				"    testing getRepos\n" +
				"      ✓ getRepos github\n" +
				"    testing getBranches\n" +
				"      ✓ getBranches github\n" +
				"    testing getJSONContent\n" +
				"      ✓ getJSONContent github\n" +
				"    testing getAnyContent\n" +
				"      ✓ Fail name not found\n" +
				"      ✓ Success get github\n" +
				"\n" +
				"  testing utils utils.js\n" +
				"    testing checkErrorReturn\n" +
				"      ✓ Fail 1\n" +
				"    testing buildDeployerOptions\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Fail 4\n" +
				"\n" +
				"\n" +
				"  429 passing (2m)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"mochaTest:integration\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  importing sample data\n" +
				"/home/travis/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard /home/travis/build/soajs/soajs.dashboard\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard/provision ~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"/home/travis/build/soajs/soajs.dashboard\n" +
				"    ✓ do import (1682ms)\n" +
				"    ✓ update environment before starting service (40ms)\n" +
				"    ✓ update requestTimeout\n" +
				"test data imported.\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 4): MongoError: Index with name: name_1 already exists with different options\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 5): MongoError: Index with name: name_1 already exists with different options\n" +
				"    ✓ Start Services (4417ms)\n" +
				"    ✓ reload controller registry (527ms)\n" +
				"\n" +
				"  Swagger\n" +
				"    Simulator Tests\n" +
				"      Testing source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - will check input no source (61ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"        ✓ fail - will check input invalid source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"        ✓ fail - will check input empty source\n" +
				"      Testing complex simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 119 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing missing item simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 102 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing item with multiple errors\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 291 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"    Generator Tests\n" +
				"      service check\n" +
				"        ✓ create temp service (77ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service name taken (79ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service port taken (70ms)\n" +
				"        ✓ remove temp service (74ms)\n" +
				"      yaml check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 192 \"-\" \"-\"\n" +
				"        ✓ fail - invalid yaml code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid mapping of inputs (42ms)\n" +
				"      full check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 7977 \"-\" \"-\"\n" +
				"file downloaded to: ./mytestservice.zip\n" +
				"        ✓ success - service generated (96ms)\n" +
				"\n" +
				"  DASHBOARD UNIT TESTS for locked\n" +
				"    environment tests\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /environment/delete?id=55128442e603d7e01ab1688d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ FAIL locked - cant delete environment\n" +
				"========================================================\n" +
				"    products tests\n" +
				"      product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked. Cant update product\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked - delete product\n" +
				"========================================================\n" +
				"      package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/packages/update?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete package\n" +
				"========================================================\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        ✓ mongo test\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/update?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant update tenant (41ms)\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete tenant\n" +
				"========================================================\n" +
				"      oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/oauth/add/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/oauth/update/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/oauth/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant delete oauth\n" +
				"========================================================\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/add?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant add application\n" +
				"========================================================\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant update application\n" +
				"========================================================\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - will delete application\n" +
				"========================================================\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/add?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add key\n" +
				"========================================================\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/key/delete?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete key\n" +
				"========================================================\n" +
				"      application ext keys\n" +
				"        add application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/add/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add ext key\n" +
				"========================================================\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/ext/update/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update ext key\n" +
				"========================================================\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete ext key\n" +
				"========================================================\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/config/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update configuration\n" +
				"========================================================\n" +
				"    dashboard keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /tenant/db/keys/list HTTP/1.1\" 200 219 \"-\" \"-\"\n" +
				"      ✓ success - ext Key list\n" +
				"========================================================\n" +
				"    owner tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"      ✓ get Auhtorization token\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ get token owner user (47ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=5512867be603d7e01ab1688d&code=CLIENT HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"      ✓ success - locked. cant delete package (40ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/acl/get?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=551286bce603d7e01ab1688e HTTP/1.1\" 200 5247 \"-\" \"-\"\n" +
				"      ✓ get tenant acl owner (45ms)\n" +
				"========================================================\n" +
				"      test with user 1\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user\n" +
				"========================================================\n" +
				"      test with user 2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user2\n" +
				"========================================================\n" +
				"\n" +
				"  DASHBOARD UNIT Tests:\n" +
				"    products tests\n" +
				"      product\n" +
				"        add product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product exists\n" +
				"          ✓ mongo test\n" +
				"        update product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will update product (38ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/get?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"          ✓ success - product/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"          ✓ mongo test\n" +
				"        delete product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product again\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc8 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will delete product\n" +
				"          ✓ mongo test\n" +
				"        list product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/list HTTP/1.1\" 200 170 \"-\" \"-\"\n" +
				"          ✓ success - will list product\n" +
				"      package\n" +
				"        add package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add package, no locked product -> acl will be ignored for dashboard's env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add another package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 392 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - package exists\n" +
				"        get prod package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASIC HTTP/1.1\" 200 137 \"-\" \"-\"\n" +
				"          ✓ success - product/packages/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong package Code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong product Code\n" +
				"        update package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will update package, acl will be ignored\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?code=BASIC2 HTTP/1.1\" 200 390 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=55375fc26aa74450771a1513&code=BASIC HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASI2 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"        delete package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=PACKA HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will delete package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASI4 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"          ✓ fail - cannot delete package being used by current key\n" +
				"          ✓ mongo test\n" +
				"        list package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/list?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"          ✓ success - will list package\n" +
				"      mongo check db\n" +
				"        ✓ asserting product record\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        add tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to client by default\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to product and tag to testing\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ fail - tenant exists\n" +
				"          ✓ mongo test\n" +
				"        update tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 197 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant (58ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cca HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant type and tag\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=aaaabbdd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"        delete tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete?id=aaaabdddd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete/?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will delete tenant\n" +
				"        list tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list HTTP/1.1\" 200 4829 \"-\" \"-\"\n" +
				"          ✓ success - will get empty list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list?type=client HTTP/1.1\" 200 610 \"-\" \"-\"\n" +
				"          ✓ succeess - will list tenants of type client only\n" +
				"      oauth\n" +
				"        add oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 366 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant containing oauth\n" +
				"        update oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth\n" +
				"        list oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 133 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth object\n" +
				"      oauth users\n" +
				"        add oauth users tests\n" +
				"Error @ hash: hash iterations set to [1024] which is greater than 32 => hash iteration reset to 12\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth user (475ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        update oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth users (489ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - will update oauth users without password\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=22d2cb5fc04ce51e06000001 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - user does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=invalid HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid userid given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - userid already exist in another account (484ms)\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?id=5a65fb8f3a0d511af4a85ccb&uId=abcde HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth user\n" +
				"        list oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth users\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will remove oauth user\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will update application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=fdsffsd HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: fdsffsd\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will clear application acl\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will delete application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=fdfdsfs HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"        list applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - cant add application - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 191 \"-\" \"-\"\n" +
				"          ✓ success - will list applications\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=xxxx HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"          ✓ fail - app id not found\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=3902acc0b5e732bdbc80844df6fe6ceb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will delete key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gdsgsfds HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        list application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ success - will list key\n" +
				"      application ext keys\n" +
				"        add application ext keys 1\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=0243306942ef6a1d8856bbee217daabb HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test for key\n" +
				"        add application ext keys 2\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb913a0d511af4a85cd0 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add two external keys (using locked product) but only one with dashboard access (120ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add an external key for DEV environment using its corresponding encryption key (tenant using new acl)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - trying to add an external key for an environment that does not exist\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DASHBOARD HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DEV HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test. 1\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will delete ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=hjghjvbhgj&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        list application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 325 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=fffdfs HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - wrong key, will return empty result\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG (60ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 632 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 316 \"-\" \"-\"\n" +
				"          ✓ success - will list ext keys that contain an ext key with dashboard access\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration (empty config)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gfdgdf HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: gfdgdf\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - invalid environment provided\n" +
				"          ✓ mongo test\n" +
				"        list application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - will list configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=jjjjjjkkkkkk HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: jjjjjjkkkkkk\n" +
				"      Removal of automatically created dashboard tenant keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3&key=fc86a9967250133c8ae98d07e4a1d93d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/delete?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when tenant gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd4 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5&key=3250d38fdbfa18a456f42da15ca6bcfa HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/delete?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when application gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd6 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when key gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when external key gets deleted\n" +
				"      mongo check db\n" +
				"        ✓ asserting tenant record\n" +
				"\n" +
				"  DASHBOARD Integration Tests:\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"    ✓ get Main Auhtorization token\n" +
				"    environment tests\n" +
				"      get environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=dev HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=qwrr HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=freeww HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - Unable to get the environment records\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/ HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - no id or code provided\n" +
				"      listing environments to initiate templates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/list HTTP/1.1\" 200 3957 \"-\" \"-\"\n" +
				"        ✓ success - will get environments\n" +
				"      add environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add STG environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add PROD environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 177 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - environment exists\n" +
				"        ✓ mongo test\n" +
				"      update environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=aaaabbbbccc HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"        ✓ mongo test\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=aaaabbcdddd HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=5a65fb923a0d511af4a85cdc HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will delete environment\n" +
				"        ✓ mongo test\n" +
				"      list environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 13191 \"-\" \"-\"\n" +
				"        ✓ success - will get 3 environments\n" +
				"        ✓ success - will manually add environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 15200 \"-\" \"-\"\n" +
				"        ✓ success - will list environment\n" +
				"      Get environment profile tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/profile HTTP/1.1\" 200 315 \"-\" \"-\"\n" +
				"        ✓ success - will get environment profile\n" +
				"    login tests\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - did not specify environment code, old acl\n" +
				"      ✓ success - did not specify environment code, new acl\n" +
				"    testing settings for logged in users\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - should work for logged in users\n" +
				"      settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - user not logged in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 20591 \"-\" \"-\"\n" +
				"        ✓ success - will get tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will update tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/oauth/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"DELETE /settings/tenant/oauth/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will return oauth obj\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/users/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth user (465ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/oauth/users/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth users (485ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/oauth/users/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth user\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/oauth/users/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth users\n" +
				"        ✓ success - will list applications\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 3341 \"-\" \"-\"\n" +
				"        ✓ success - will get empty object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/add?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will add key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"        ✓ success - will list key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will add ext key for STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/ext/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401&extKeyEnv=STG HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/ext/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will list ext key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/config/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/config/list?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"        ✓ success - will list configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/application/key/delete?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete key\n" +
				"    platforms tests\n" +
				"      list platforms\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list?env=DEV HTTP/1.1\" 200 236 \"-\" \"-\"\n" +
				"        ✓ success - will list platforms and available certificates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      update deployer type\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/update?env=QA HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"        ✓ fail - update change deployer type (84ms)\n" +
				"    hosts tests\n" +
				"      list Hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 946 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"        ✓ mongo - empty the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 331 \"-\" \"-\"\n" +
				"        ✓ success - will get an empty list\n" +
				"        ✓ mongo - fill the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 786 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"      return environments where a service is deployed\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=swaggersample HTTP/1.1\" 200 808 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has more than 1 env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=dashboard HTTP/1.1\" 200 860 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has one env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=noService HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - service doesn't exist\n" +
				"      list Controllers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/awareness?env=dev HTTP/1.1\" 200 6873 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"    node management tests\n" +
				"      list cloud nodes \n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /cloud/nodes/list?env=qa HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ fail - will get nodes list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /cloud/nodes/add HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - will add node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/update?env=qa&nodeId=nodeTest HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"        ✓ fail - will update node\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/tag HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - will tag node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /cloud/nodes/remove?env=qa&nodeId=nodeId HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ fail - will remove node\n" +
				"    change tenant security key\n" +
				"      will change tenant security key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/key/update?access_token=0b64caa5c10ddae4cfff46c8bd6e11311a16e767&id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 6001 \"-\" \"-\"\n" +
				"        ✓ success - change security key (63ms)\n" +
				"      fail - logged in user is not the owner of the app\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ Login first\n" +
				"    prevent operator from removing tenant/application/key/extKey/product/package he is currently logged in with\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/delete?id=10d2cb5fc04ce51e06000001 HTTP/1.1\" 200 152 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001 HTTP/1.1\" 200 157 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/key/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /tenant/application/key/ext/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting extKey\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting package\n" +
				"\n" +
				"  DASHBOARD UNIT Tests: Services & Daemons\n" +
				"    services tests\n" +
				"      list services test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 9710 \"-\" \"-\"\n" +
				"        ✓ success - will get services list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 3914 \"-\" \"-\"\n" +
				"        ✓ success - will get services list specific services\n" +
				"      update service settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /services/settings/update?id=dummyServiceId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"        ✓ success - will update settings\n" +
				"    daemons/groups tests\n" +
				"      daemons tests\n" +
				"        list daemon tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list?getGroupConfigs=true HTTP/1.1\" 200 164 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons with group configurations of each\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list only specified daemons\n" +
				"      group configuration tests\n" +
				"        add group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - add new group config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"          ✓ fail - group config already exists\n" +
				"        update group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=123%3A%3A%3A321 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"        delete group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - deletes group\n" +
				"        list group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 230 \"-\" \"-\"\n" +
				"          ✓ success - list all group configs\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - list only specified group configs\n" +
				"        update service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - service configuration updated successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - delete service configuration successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"        list service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - lists service configuration of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"        update tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates test group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fails - missing required params\n" +
				"        list tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 347 \"-\" \"-\"\n" +
				"          ✓ success - lists tenant external keys of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"\n" +
				"  Docker Certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /login HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"    upload certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=ca HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upload docker certificate (87ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&driver=local&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: envCode\n" +
				"      ✓ mongo test - verify docker certificate exists in mongo\n" +
				"    remove certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success = will remove docker certificate (metadata includes serveral drivers and several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver but several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver for one environment)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&driverName=local HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - docker certificate does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=123%3A%3A%3A321&env=DEV&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"      ✓ mongo test - verify certificate has been deleted from mongo\n" +
				"    choose existing certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=cert HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert_2.pem&envCode=DEV&platform=docker&driver=local&certType=key HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for local\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for docker remote\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - one or more certificates do not exist\n" +
				"      ✓ mongo test - verify the docker certificates exist and include the right drivers and environments in their metadata\n" +
				"\n" +
				"  Testing Custom Registry Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - will add new plugged entry as owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - entry with the same name is already plugged in environment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069 HTTP/1.1\" 200 183 \"-\" \"-\"\n" +
				"      ✓ success - will add new unplugged entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - entry with the same name is not plugged\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 255 \"-\" \"-\"\n" +
				"      ✓ fail - adding entry record with additional properties\n" +
				"    Testing get custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&name=c1 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 125 \"-\" \"-\"\n" +
				"      ✓ fail - no name or id provided\n" +
				"    Testing update custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will update user1's entry as owner\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - trying to plug an entry that will cause a conflict\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry owned by owner as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry in an environment different from the one it was created in\n" +
				"    Testing list custom registry entries\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&start=0&end=2 HTTP/1.1\" 200 388 \"-\" \"-\"\n" +
				"      ✓ success - will list entries with pagination\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as owner, get permission set to true for all entries\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev HTTP/1.1\" 200 568 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as user1, get permission set to true only for entries owned by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries in dashboard environment, get dev entries that are shared\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required fields\n" +
				"    Testing delete custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dashboard HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete entry in an environment different from the one it was created it\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete owner's entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete entry\n" +
				"    Testing upgrade custom registry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade dev environment custom registry\n" +
				"      ✓ success - new custom registry entries are available\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will try to upgrade again, no changes since no old schema is detected\n" +
				"\n" +
				"  Testing Resources Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster1 by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 143 \"-\" \"-\"\n" +
				"      ✓ fail - resource with the same name/type/category already exists\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 453 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster2 by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 240 \"-\" \"-\"\n" +
				"      ✓ fail - adding resource record with additional parameters\n" +
				"    Testing get resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=cluster1 HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - no id or name of resource provided\n" +
				"    Testing update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - will update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource owned by owner as user1\n" +
				"    Testing list resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 921 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as owner, get permission set to true for cluster1 and cluster2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev HTTP/1.1\" 200 922 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as user1, get permission set to true only for cluster2\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard HTTP/1.1\" 200 472 \"-\" \"-\"\n" +
				"      ✓ success - will list resources in dashboard env as owner, get only get shared resources from dev env\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required field\n" +
				"    Testing delete resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dashboard&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete as user1 a resource created by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete resource cluster3 as owner\n" +
				"    Testing upgrade resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/upgrade?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade resources\n" +
				"    Testing get resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/config?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"      ✓ success - will get deploy configuration for resources\n" +
				"    Testing update resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will add deploy config for cluster1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    Testing list/add/edit/delete for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to add a cluster resource of type mongo called dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update/unplug dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - trying to update driver configuration for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 1402 \"-\" \"-\"\n" +
				"      ✓ success - list resources will mark dash_cluster as sensitive\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=dash_cluster HTTP/1.1\" 200 485 \"-\" \"-\"\n" +
				"      ✓ success - get dash_cluster resource marked as sensitive\n" +
				"\n" +
				"  Testing Databases Functionality\n" +
				"    add environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - wil add a db and set tenantSpecific to false by default\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - database already exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"      ✓ fail - session already exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    update environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db and set tenantSpecific to false by default (42ms)\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - database does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    delete environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=invalid HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - invalid database name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=urac HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete database\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete session\n" +
				"      ✓ mongo - testing database\n" +
				"    list environment dbs\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 75 \"-\" \"-\"\n" +
				"      ✓ success - no session and no databases\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add urac db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 274 \"-\" \"-\"\n" +
				"      ✓ success - yes session and yes databases\n" +
				"    update environment db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - add db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - empty db prefix\n" +
				"\n" +
				"  mongo check db\n" +
				"    ✓ asserting environment record\n" +
				"\n" +
				"  Testing Catalog Functionality\n" +
				"    Testing Catalog ADD API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 241 \"-\" \"-\"\n" +
				"      ✓ Fail - Add an invalid catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"      ✓ Success - Add a valid catalog\n" +
				"    Testing Catalog LIST API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/list HTTP/1.1\" 200 3218 \"-\" \"-\"\n" +
				"      ✓ Success - List available catalogs\n" +
				"    Testing Catalog EDIT API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a locked catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Edit a record (56ms)\n" +
				"    Testing Catalog GET API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ fail - invalid catalog id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 581 \"-\" \"-\"\n" +
				"      ✓ success- valid catalog id\n" +
				"    Testing Catalog DELETE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a locked record\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Delete a record\n" +
				"    Testing Catalog UPGRADE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/upgrade HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade recipes to follow new schema (153ms)\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting SOAJS_ENV_WORKDIR for test mode as:  ../test/coverage/instrument/\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:23 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"\"docker service rm\" requires at least 1 argument(s).\n" +
				"See 'docker service rm --help'.\n" +
				"\n" +
				"Usage:  docker service rm [OPTIONS] SERVICE [SERVICE...]\n" +
				"\n" +
				"Remove one or more services\n" +
				"    testing controller deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 1511 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=91asfeu3zgyd8czzzzn7jwaco&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller service and delete it afterwards (530ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:26 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller and use the main file specified in src (260ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:27 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 nginx service with static content (264ms)\n" +
				"    testing service deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4447 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=95eo88l6js8tvooq29xb247fs&mode=global HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 core service, global mode (433ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:29 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 211 \"-\" \"-\"\n" +
				"      ✓ fail - trying to deploy to an environment that is configured to be deployed manually\n" +
				"    testing daemon deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4224 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=dt47a48r6dhhd5fell4km3yot&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4225 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=1xhuxyrgc9wsn6pogrne1v71t&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon that contians cmd info in its src (329ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    testing redeploy service\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 3324 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:32 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy controller service (58ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:33 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will rebuild service (265ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:34 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy nginx and add custom ui to it (311ms)\n" +
				"    delete deployed services\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:35 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV HTTP/1.1\" 200 118 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params (43ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such service - service 123123123 not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such service',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'service 123123123 not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=123123123&mode=replicated HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - service not found\n" +
				"    testing get service logs\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5832 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such container - task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such container',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/instances/logs?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev&taskId=3xk3m23wg7gl5c6lk9rk5hypp&serviceId= HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"      ✓ success - getting service logs (67ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5827 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=4zuurjwbdji1e6wyhr2yxumbt&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    testing autoscale deployed services\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:37 +0000] \"PUT /cloud/services/autoscale?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ set autoscaler\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:38 +0000] \"PUT /cloud/services/autoscale/config?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ update environment autoscaling\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/resource?env=dev&resource=heapster&namespace=kube-system HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - check resource\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/services/scale?env=dev&resource=heapster&namespace=kube-system&scale=2 HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ fail - scale service\n" +
				"    metrics tests\n" +
				"      get service metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:40 +0000] \"GET /cloud/metrics/services?env=DEV HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - get service metrics\n" +
				"      fail - get node metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"GET /cloud/metrics/nodes?env=DEV HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ success - get nodes metrics nodes\n" +
				"    testing plugin deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"POST /cloud/plugins/deploy HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing service maintence deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:42 +0000] \"POST /cloud/services/maintenance HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing namespace list services \n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:43 +0000] \"GET /cloud/namespaces/list?env=dev HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - list namespaces\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /cloud/namespaces/delete?env=dev&namespaceId=soajs HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - delete namespaces\n" +
				"\n" +
				"  DASHBOARD TESTS: Continuous integration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?variables=true HTTP/1.1\" 200 885 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts with variables\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?owner=soajs&variables=true HTTP/1.1\" 200 454 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - activate provider (168ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?provider=travis HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?owner=soajs HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ Success - deactivate provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/recipe HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - add new recipe\n" +
				"    ✓ success - get recipe record from database\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - edit recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/recipe/download?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ Success - download recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - delete recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/script/download HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ success - download script\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/status?id=1234&provider=travis&owner=soajs&enable=true HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - Enable Repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - get repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 187 \"-\" \"-\"\n" +
				"    ✓ Success - change repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/repo/remote/config?port=80 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"    ✓ Success - getRepoYamlFile\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting CD functionality\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:44 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"bljs1s50yk4nlyemvlnfibcz5\n" +
				"fa6afebbb75d\n" +
				"243542d8fe34\n" +
				"746733a0c6e3\n" +
				"    testing service deployment\n" +
				"      ✓ update catalog recipe (47ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:46 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog 1 (1293ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:47 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog2 (1040ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:48 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog3 (278ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call to cd/deploy, nothing should happen (64ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=invalid HTTP/1.1\" 200 141 \"-\" \"-\"\n" +
				"      ✓ fail - mimic call for cd/deploy of controller in dev\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev (85ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific entry for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (65ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific version for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (165ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 295 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ get ledger (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ mark all ledger entries as read\n" +
				"      ✓ trigger catalog update\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/updates?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 5354 \"-\" \"-\"\n" +
				"      ✓ get updates (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd for automatic controller update (50ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 578 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 283 \"-\" \"-\"\n" +
				"      ✓ calling take action on redeploy (69ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cloud/services/list?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 4925 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ calling take action on rebuild (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cd HTTP/1.1\" 200 237 \"-\" \"-\"\n" +
				"      ✓ get CD\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"POST /cd/pause HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ pause CD\n" +
				"Deleting deployments and cleaning up...\n" +
				"2qkaeh3l4yc96z8j6rcc01ds5\n" +
				"6kt2aneyi9w8kna1d6ueg7jjb\n" +
				"9bk9yr1r656n1n5y78coe88cv\n" +
				"b9aec4c9e4c7\n" +
				"5502e2fb79be\n" +
				"\n" +
				"  DASHBOARD Tests: Git Accounts\n" +
				"    github login tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ fail - wrong pw (124ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - wrong provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ success - will login - personal private acc (115ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - cannot login - Organization acc - already exists\n" +
				"    github accounts tests\n" +
				"      list accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/accounts/list HTTP/1.1\" 200 342 \"-\" \"-\"\n" +
				"        ✓ success - will list\n" +
				"    personal private acc\n" +
				"      github getRepos tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getRepos?id=123&provider=github&page=1&per_page=50 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will getRepos\n" +
				"      github getBranches tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&provider=github&name=soajsTestAccount%2FtestMulti&type=repo HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will get Branches repo\n" +
				"      github repo tests\n" +
				"        repo activate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will activate multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - cannot activate again personal multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&name=sample__Single&type=service HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - cannot get Branches for service - wrong name\n" +
				"        repo sync tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/sync?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will sync repo - no change\n" +
				"        repo deactivate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/deactivate?id=123&owner=soajsTestAccount&repo=test.success1 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will deactivate single repo\n" +
				"    pull from a repo in github or bitbucket\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ success - the user is logged in and provided an existing repo and file path\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=michel-el-hajj&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the user isn't logged in\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.unknown&filepath=config.js&branch=develop&serviceName=unknown&env=dev&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the repo doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=configs.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ fail - wrong file path\n" +
				"    personal public acc\n" +
				"      login\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong personal public acc name\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - personal public acc (155ms)\n" +
				"    organization public acc\n" +
				"      login & logout\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong Organization acc\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - Organization acc (117ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"DELETE /gitAccounts/logout?username=soajs&id=123&provider=github HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ will logout org account\n" +
				"\n" +
				"\n" +
				"  495 passing (46s)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"storeCoverage\" task[24m\n" +
				"\n" +
				"[4mRunning \"makeReport\" task[24m\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"File                                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				" __root__/                               |    96.67 |       70 |    96.64 |    96.67 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.63 |    66.67 |    96.64 |    96.63 |... 5,2086,2087 |\n" +
				" lib/catalog/                            |    92.05 |    71.93 |      100 |    92.05 |                |\n" +
				"  index.js                               |    92.05 |    71.93 |      100 |    92.05 |... 209,282,304 |\n" +
				" lib/cd/                                 |    87.24 |     76.6 |    93.16 |    87.74 |                |\n" +
				"  helper.js                              |    86.55 |    77.64 |    85.71 |    86.89 |... 825,826,828 |\n" +
				"  index.js                               |    88.38 |    71.05 |    96.34 |    89.12 |... 537,556,557 |\n" +
				" lib/ci/                                 |    90.38 |    68.42 |    98.84 |    90.38 |                |\n" +
				"  index.js                               |    90.38 |    68.42 |    98.84 |    90.38 |... 549,618,762 |\n" +
				" lib/cloud/autoscale/                    |      100 |    93.88 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |    93.88 |      100 |      100 |                |\n" +
				" lib/cloud/deploy/                       |    84.79 |    75.64 |    96.91 |    84.53 |                |\n" +
				"  helper.js                              |    89.67 |    86.19 |     96.3 |    89.37 |... 504,505,506 |\n" +
				"  index.js                               |    82.48 |    70.77 |    97.14 |    82.29 |... 933,934,936 |\n" +
				" lib/cloud/maintenance/                  |    97.67 |      100 |       95 |    97.56 |                |\n" +
				"  index.js                               |    97.67 |      100 |       95 |    97.56 |             52 |\n" +
				" lib/cloud/metrics/                      |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/namespaces/                   |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/nodes/                        |    98.57 |    93.33 |    97.56 |    98.57 |                |\n" +
				"  index.js                               |    98.57 |    93.33 |    97.56 |    98.57 |             43 |\n" +
				" lib/cloud/services/                     |    95.65 |    91.49 |      100 |    97.06 |                |\n" +
				"  index.js                               |    95.65 |    91.49 |      100 |    97.06 |          51,58 |\n" +
				" lib/customRegistry/                     |    95.04 |       78 |      100 |    95.04 |                |\n" +
				"  index.js                               |    95.04 |       78 |      100 |    95.04 |... 276,454,467 |\n" +
				" lib/daemons/                            |    94.74 |    84.21 |    98.73 |    94.74 |                |\n" +
				"  helper.js                              |    91.94 |    80.77 |      100 |    91.94 | 40,48,52,61,73 |\n" +
				"  index.js                               |    95.68 |    85.51 |    98.51 |    95.68 |... 150,185,187 |\n" +
				" lib/environment/                        |    85.67 |    72.39 |       91 |    87.55 |                |\n" +
				"  helper.js                              |    84.85 |    75.44 |      100 |    84.85 |... 205,206,241 |\n" +
				"  index.js                               |    83.25 |    67.23 |    87.37 |    83.39 |... 7,1309,1313 |\n" +
				"  status.js                              |    83.76 |    67.13 |      100 |    85.02 |... 634,639,703 |\n" +
				"  statusRollback.js                      |    88.89 |    81.05 |      100 |     89.6 |... 206,219,237 |\n" +
				"  statusUtils.js                         |    88.32 |     74.7 |       95 |    92.91 |... 9,1258,1259 |\n" +
				" lib/git/                                |    86.62 |    68.68 |    97.48 |    86.77 |                |\n" +
				"  configGenerator.js                     |    87.04 |     66.9 |       95 |    87.04 |... 364,367,387 |\n" +
				"  helper.js                              |    85.44 |    69.46 |    96.97 |    85.44 |... 729,739,742 |\n" +
				"  index.js                               |    87.44 |    68.95 |    98.03 |     87.8 |... 44,945,1005 |\n" +
				" lib/hosts/                              |    81.82 |    65.41 |    94.34 |    81.82 |                |\n" +
				"  helper.js                              |    89.86 |    84.51 |      100 |    89.86 |... ,97,112,116 |\n" +
				"  index.js                               |    76.64 |    43.55 |    92.86 |    76.64 |... 205,206,215 |\n" +
				" lib/product/                            |    93.68 |    74.34 |      100 |    93.68 |                |\n" +
				"  index.js                               |    93.68 |    74.34 |      100 |    93.68 |... 525,526,552 |\n" +
				" lib/resources/                          |    90.57 |    77.33 |      100 |    90.57 |                |\n" +
				"  index.js                               |    90.57 |    77.33 |      100 |    90.57 |... 437,456,469 |\n" +
				" lib/services/                           |    89.58 |    85.71 |    92.86 |    89.58 |                |\n" +
				"  index.js                               |    89.58 |    85.71 |    92.86 |    89.58 | 23,24,35,36,40 |\n" +
				" lib/swagger/                            |    95.83 |    84.29 |      100 |    95.83 |                |\n" +
				"  index.js                               |    95.83 |    84.29 |      100 |    95.83 |... 192,261,262 |\n" +
				" lib/tenant/                             |    95.96 |    78.79 |      100 |    95.96 |                |\n" +
				"  index.js                               |    95.96 |    78.79 |      100 |    95.96 |... 3,1213,1268 |\n" +
				" models/                                 |    86.02 |    60.76 |    94.12 |    86.02 |                |\n" +
				"  git.js                                 |     87.5 |       75 |    83.33 |     87.5 |    49,53,57,61 |\n" +
				"  host.js                                |    94.74 |       50 |      100 |    94.74 |             42 |\n" +
				"  mongo.js                               |    84.44 |    59.42 |      100 |    84.44 |... 266,267,271 |\n" +
				" schemas/                                |      100 |      100 |      100 |      100 |                |\n" +
				"  acl.js                                 |      100 |      100 |      100 |      100 |                |\n" +
				"  catalog.js                             |      100 |      100 |      100 |      100 |                |\n" +
				"  cb.js                                  |      100 |      100 |      100 |      100 |                |\n" +
				"  cdOptions.js                           |      100 |      100 |      100 |      100 |                |\n" +
				"  customRegistry.js                      |      100 |      100 |      100 |      100 |                |\n" +
				"  environmentSchema.js                   |      100 |      100 |      100 |      100 |                |\n" +
				"  resource.js                            |      100 |      100 |      100 |      100 |                |\n" +
				"  resourceDeployConfig.js                |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceConfig.js                       |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceSchema.js                       |      100 |      100 |      100 |      100 |                |\n" +
				" utils/                                  |    91.67 |    86.54 |      100 |    92.54 |                |\n" +
				"  errors.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  utils.js                               |    91.43 |    86.54 |      100 |    92.31 |... 148,149,161 |\n" +
				" utils/drivers/ci/                       |    91.23 |    70.83 |    93.75 |    92.73 |                |\n" +
				"  index.js                               |    89.58 |       50 |    92.86 |     91.3 | 22,162,163,164 |\n" +
				"  utils.js                               |      100 |    85.71 |      100 |      100 |                |\n" +
				" utils/drivers/ci/drone/                 |     96.2 |    82.47 |      100 |     96.2 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.17 |    82.47 |      100 |    96.17 |... 435,444,489 |\n" +
				" utils/drivers/ci/travis/                |    96.95 |       80 |     96.3 |    96.95 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.94 |       80 |     96.3 |    96.94 |... 214,215,549 |\n" +
				" utils/drivers/git/                      |    96.97 |       75 |      100 |    96.97 |                |\n" +
				"  index.js                               |    96.97 |       75 |      100 |    96.97 |             29 |\n" +
				" utils/drivers/git/bitbucket/            |     87.5 |    64.54 |       95 |     87.5 |                |\n" +
				"  helper.js                              |    84.91 |    65.35 |    91.43 |    84.91 |... 360,382,383 |\n" +
				"  index.js                               |    91.15 |     62.5 |    97.78 |    91.15 |... 187,189,190 |\n" +
				" utils/drivers/git/bitbucket_enterprise/ |    88.84 |    64.08 |    95.52 |    88.84 |                |\n" +
				"  helper.js                              |    85.09 |     62.3 |     93.1 |    85.09 |... 241,263,264 |\n" +
				"  index.js                               |    92.73 |    66.67 |    97.37 |    92.73 |... ,70,114,200 |\n" +
				" utils/drivers/git/github/               |    86.38 |    76.55 |    91.14 |    86.38 |                |\n" +
				"  helper.js                              |    86.21 |    77.06 |    94.87 |    86.21 |... 323,341,342 |\n" +
				"  index.js                               |    86.67 |       75 |     87.5 |    86.67 |... ,98,115,177 |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"All files                                |    90.17 |    74.42 |     96.6 |    90.58 |                |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"\n" +
				"\n" +
				"[4mRunning \"coveralls:your_target\" (coveralls) task[24m\n" +
				"[32m>> [39mSuccessfully submitted coverage results to coveralls\n" +
				"\n" +
				"[32mDone, without errors.[39m\n" +
				"\n" +
				"travis_time:end:177f2130:start=1516632824205360139,finish=1516633017744444809,duration=193539084670\n" +
				"[0K\n" +
				"[32;1mThe command \"grunt coverage\" exited with 0.[0m\n" +
				"\n" +
				"Done. Your build exited with 0.\n"
			},
			"develop": {
				"hide": true,
				"id": 330375599,
				"number": "171",
				"state": "started",
				"result": 0,
				"started_at": "2018-01-18T14:19:22Z",
				"finished_at": "2018-01-18T14:26:29Z",
				"duration": fancyTimeFormat(427),
				"commit": "d1353e7e426432ba966303bd6eab3faad02455a4",
				"message": "Merge branch 'develop' into staging",
				"config": JSON.stringify({
					"sudo": "required",
					"group": "deprecated-2017Q2",
					"language": "node_js",
					"node_js": "6.9.5",
					"services": [
						"mongodb",
						"docker"
					],
					"env": [
						"CXX=g++-4.8"
					],
					"branches": {
						"only": [
							"staging",
							"master"
						]
					},
					"addons": {
						"apt": {
							"sources": [
								"ubuntu-toolchain-r-test"
							],
							"packages": [
								"g++-4.8"
							]
						},
						"hosts": [
							"localhost",
							"dev-controller"
						]
					},
					"before_install": [
						"sudo apt-get update && sudo apt-get install sendmail python make g++"
					],
					"before_script": [
						"npm install -g grunt-cli",
						"docker pull soajsorg/soajs",
						"sleep 10"
					],
					"script": [
						"grunt coverage"
					],
					".result": "configured",
					"dist": "trusty"
				}, null, 2),
				"committer_name": "mikehajj",
				"compare": {
					"label": "7bc673f9c69d",
					"url": "https://github.com/soajs/soajs.dashboard/compare/7bc673f9c69d...9ce0e4849582"
				},
				"deploy": {
					"QA" : "notify",
					"DEV" : "update"
				},
				"logs": "travis_fold:start:worker_info\n" +
				"[0K[33;1mWorker information[0m\n" +
				"hostname: bfb564ba-bce1-4030-9f3b-67cf0539f7fd@1.production-5-worker-org-c-1-gce\n" +
				"version: v3.4.0 https://github.com/travis-ci/worker/tree/ce0440bc30c289a49a9b0c21e4e1e6f7d7825101\n" +
				"instance: travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-ci-sugilite-trusty-1480960799 (via amqp)\n" +
				"startup: 27.852668104s\n" +
				"travis_fold:end:worker_info\n" +
				"[0Ktravis_fold:start:system_info\n" +
				"[0K[33;1mBuild system information[0m\n" +
				"Build language: node_js\n" +
				"Build group: deprecated-2017Q2\n" +
				"Build dist: trusty\n" +
				"Build id: 331844360\n" +
				"Job id: 331844361\n" +
				"Runtime kernel version: 4.4.0-51-generic\n" +
				"travis-build version: c129335c3\n" +
				"[34m[1mBuild image provisioning date and time[0m\n" +
				"Mon Dec  5 18:47:20 UTC 2016\n" +
				"[34m[1mOperating System Details[0m\n" +
				"Distributor ID:\tUbuntu\n" +
				"Description:\tUbuntu 14.04.5 LTS\n" +
				"Release:\t14.04\n" +
				"Codename:\ttrusty\n" +
				"[34m[1mLinux Version[0m\n" +
				"4.4.0-51-generic\n" +
				"[34m[1mCookbooks Version[0m\n" +
				"998099c https://github.com/travis-ci/travis-cookbooks/tree/998099c\n" +
				"[34m[1mgit version[0m\n" +
				"git version 2.11.0\n" +
				"[34m[1mbash version[0m\n" +
				"GNU bash, version 4.3.11(1)-release (x86_64-pc-linux-gnu)\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>\n" +
				"\n" +
				"This is free software; you are free to change and redistribute it.\n" +
				"There is NO WARRANTY, to the extent permitted by law.\n" +
				"[34m[1mgcc version[0m\n" +
				"gcc (Ubuntu 4.8.4-2ubuntu1~14.04.3) 4.8.4\n" +
				"Copyright (C) 2013 Free Software Foundation, Inc.\n" +
				"This is free software; see the source for copying conditions.  There is NO\n" +
				"warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n" +
				"\n" +
				"[34m[1mdocker version[0m\n" +
				"Client:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"\n" +
				"Server:\n" +
				" Version:      1.12.3\n" +
				" API version:  1.24\n" +
				" Go version:   go1.6.3\n" +
				" Git commit:   6b644ec\n" +
				" Built:        Wed Oct 26 21:44:32 2016\n" +
				" OS/Arch:      linux/amd64\n" +
				"[34m[1mclang version[0m\n" +
				"clang version 3.5.0 (tags/RELEASE_350/final)\n" +
				"Target: x86_64-unknown-linux-gnu\n" +
				"Thread model: posix\n" +
				"[34m[1mjq version[0m\n" +
				"jq-1.5\n" +
				"[34m[1mbats version[0m\n" +
				"Bats 0.4.0\n" +
				"[34m[1mgimme version[0m\n" +
				"v1.0.0\n" +
				"[34m[1mnvm version[0m\n" +
				"0.32.0\n" +
				"[34m[1mperlbrew version[0m\n" +
				"/home/travis/perl5/perlbrew/bin/perlbrew  - App::perlbrew/0.73\n" +
				"[34m[1mpostgresql client version[0m\n" +
				"psql (PostgreSQL) 9.6.1\n" +
				"[34m[1mphpenv version[0m\n" +
				"rbenv 1.1.0\n" +
				"[34m[1mrvm version[0m\n" +
				"rvm 1.27.0 (latest) by Wayne E. Seguin <wayneeseguin@gmail.com>, Michal Papis <mpapis@gmail.com> [https://rvm.io/]\n" +
				"[34m[1mdefault ruby version[0m\n" +
				"ruby 2.3.1p112 (2016-04-26 revision 54768) [x86_64-linux]\n" +
				"[34m[1mPre-installed Ruby versions[0m\n" +
				"jruby-9.1.2.0\n" +
				"ruby-1.9.3-p551\n" +
				"ruby-2.0.0-p648\n" +
				"ruby-2.1.10\n" +
				"ruby-2.2.5\n" +
				"ruby-2.3.1\n" +
				"[34m[1mPre-installed Node.js versions[0m\n" +
				"iojs-v1.6\n" +
				"iojs-v1.6.4\n" +
				"v0.10\n" +
				"v0.10.40\n" +
				"v0.11.16\n" +
				"v0.12.2\n" +
				"v0.12.7\n" +
				"v0.6.21\n" +
				"v0.8.28\n" +
				"v4.1.2\n" +
				"v4.6.2\n" +
				"v6.9.1\n" +
				"[34m[1mPre-installed Go versions[0m\n" +
				"1.2.2\n" +
				"1.3.3\n" +
				"1.4.3\n" +
				"1.5.4\n" +
				"1.6.3\n" +
				"1.7\n" +
				"[34m[1mmysql version[0m\n" +
				"mysql  Ver 14.14 Distrib 5.6.33, for debian-linux-gnu (x86_64) using  EditLine wrapper\n" +
				"[34m[1mPre-installed PostgreSQL versions[0m\n" +
				"9.2.19\n" +
				"9.3.15\n" +
				"9.4.10\n" +
				"9.5.5\n" +
				"9.6.1\n" +
				"[34m[1mRedis version[0m\n" +
				"redis-server 3.0.6\n" +
				"[34m[1mMongoDB version[0m\n" +
				"MongoDB 3.2.11\n" +
				"[34m[1mRabbitMQ Version[0m\n" +
				"3.6.6\n" +
				"[34m[1mInstalled Firefox version[0m\n" +
				"firefox 38.4.0esr\n" +
				"[34m[1mant version[0m\n" +
				"Apache Ant(TM) version 1.9.3 compiled on April 8 2014\n" +
				"[34m[1mmvn version[0m\n" +
				"Apache Maven 3.1.1 (0728685237757ffbf44136acec0402957f723d9a; 2013-09-17 15:22:22+0000)\n" +
				"Maven home: /usr/local/maven\n" +
				"Java version: 1.8.0_111, vendor: Oracle Corporation\n" +
				"Java home: /usr/lib/jvm/java-8-oracle/jre\n" +
				"Default locale: en_US, platform encoding: UTF-8\n" +
				"OS name: \"linux\", version: \"4.4.0-51-generic\", arch: \"amd64\", family: \"unix\"\n" +
				"[34m[1mgradle version[0m\n" +
				"\n" +
				"------------------------------------------------------------\n" +
				"Gradle 2.13\n" +
				"------------------------------------------------------------\n" +
				"\n" +
				"Build time:   2016-04-25 04:10:10 UTC\n" +
				"Build number: none\n" +
				"Revision:     3b427b1481e46232107303c90be7b05079b05b1c\n" +
				"\n" +
				"Groovy:       2.4.4\n" +
				"Ant:          Apache Ant(TM) version 1.9.6 compiled on June 29 2015\n" +
				"JVM:          1.8.0_111 (Oracle Corporation 25.111-b14)\n" +
				"OS:           Linux 4.4.0-51-generic amd64\n" +
				"\n" +
				"[34m[1mkerl list installations[0m\n" +
				"17.0\n" +
				"17.1\n" +
				"17.3\n" +
				"17.4\n" +
				"17.5\n" +
				"18.0\n" +
				"18.1\n" +
				"18.2\n" +
				"18.2.1\n" +
				"R14B02\n" +
				"R14B03\n" +
				"R14B04\n" +
				"R15B\n" +
				"R15B01\n" +
				"R15B02\n" +
				"R15B03\n" +
				"R16B\n" +
				"R16B01\n" +
				"R16B02\n" +
				"R16B03\n" +
				"R16B03-1\n" +
				"[34m[1mkiex list[0m\n" +
				"\n" +
				"kiex elixirs\n" +
				"\n" +
				"   elixir-1.0.3\n" +
				"=* elixir-1.0.4\n" +
				"\n" +
				"# => - current\n" +
				"# =* - current && default\n" +
				"#  * - default\n" +
				"\n" +
				"[34m[1mrebar --version[0m\n" +
				"rebar 2.6.4 17 20160831_145136 git 2.6.4-dirty\n" +
				"[34m[1mlein version[0m\n" +
				"WARNING: You're currently running as root; probably by accident.\n" +
				"Press control-C to abort or Enter to continue as root.\n" +
				"Set LEIN_ROOT to disable this warning.\n" +
				"Leiningen 2.7.1 on Java 1.8.0_111 Java HotSpot(TM) 64-Bit Server VM\n" +
				"[34m[1mperlbrew list[0m\n" +
				"  5.8 (5.8.8)\n" +
				"  5.10 (5.10.1)\n" +
				"  5.12 (5.12.5)\n" +
				"  5.14 (5.14.4)\n" +
				"  5.16 (5.16.3)\n" +
				"  5.18 (5.18.4)\n" +
				"  5.20 (5.20.3)\n" +
				"  5.20-extras (5.20.3)\n" +
				"  5.20-shrplib (5.20.3)\n" +
				"  5.20.3\n" +
				"  5.22 (5.22.0)\n" +
				"  5.22-extras (5.22.0)\n" +
				"  5.22-shrplib (5.22.0)\n" +
				"  5.22.0\n" +
				"[34m[1mphpenv versions[0m\n" +
				"  system\n" +
				"  5.4\n" +
				"  5.4.45\n" +
				"  5.5.37\n" +
				"  5.6\n" +
				"* 5.6.24 (set by /home/travis/.phpenv/version)\n" +
				"  7.0\n" +
				"  7.0.7\n" +
				"  hhvm\n" +
				"  hhvm-stable\n" +
				"[34m[1mcomposer --version[0m\n" +
				"Composer version 1.2.0 2016-07-19 01:28:52\n" +
				"travis_fold:end:system_info\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"travis_fold:start:git.checkout\n" +
				"[0Ktravis_time:start:189f4f26\n" +
				"[0K$ git clone --depth=50 --branch=master https://github.com/soajs/soajs.dashboard.git soajs/soajs.dashboard\n" +
				"Cloning into 'soajs/soajs.dashboard'...\n" +
				"\n" +
				"travis_time:end:189f4f26:start=1516632644778250512,finish=1516632645636160459,duration=857909947\n" +
				"[0K$ cd soajs/soajs.dashboard\n" +
				"$ git checkout -qf 9ce0e48495822605fae0a1afe3718c3306e93183\n" +
				"travis_fold:end:git.checkout\n" +
				"[0Ktravis_fold:start:apt\n" +
				"[0K[33;1mAdding APT Sources (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:1768ded0\n" +
				"[0K$ sudo -E apt-add-repository -y \"ppa:ubuntu-toolchain-r/test\"\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/secring.gpg' created\n" +
				"gpg: keyring `/tmp/tmpzmwul48g/pubring.gpg' created\n" +
				"gpg: requesting key BA9EF27F from hkp server keyserver.ubuntu.com\n" +
				"gpg: /tmp/tmpzmwul48g/trustdb.gpg: trustdb created\n" +
				"gpg: key BA9EF27F: public key \"Launchpad Toolchain builds\" imported\n" +
				"gpg: Total number processed: 1\n" +
				"gpg:               imported: 1  (RSA: 1)\n" +
				"OK\n" +
				"\n" +
				"travis_time:end:1768ded0:start=1516632645662982749,finish=1516632647269286999,duration=1606304250\n" +
				"[0K[33;1mInstalling APT Packages (BETA)[0m\n" +
				"$ export DEBIAN_FRONTEND=noninteractive\n" +
				"travis_time:start:04eab060\n" +
				"[0K$ sudo -E apt-get -yq update &>> ~/apt-get-update.log\n" +
				"\n" +
				"travis_time:end:04eab060:start=1516632647279891866,finish=1516632665019623254,duration=17739731388\n" +
				"[0Ktravis_time:start:212f10ba\n" +
				"[0K$ sudo -E apt-get -yq --no-install-suggests --no-install-recommends --force-yes install g++-4.8\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"The following extra packages will be installed:\n" +
				"  cpp-4.8 gcc-4.8 gcc-4.8-base gcc-7-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libisl15 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6\n" +
				"  libtsan0\n" +
				"Suggested packages:\n" +
				"  gcc-4.8-locales g++-4.8-multilib gcc-4.8-doc libstdc++6-4.8-dbg\n" +
				"  gcc-4.8-multilib libgcc1-dbg libgomp1-dbg libitm1-dbg libatomic1-dbg\n" +
				"  libasan0-dbg libtsan0-dbg libquadmath0-dbg libstdc++-4.8-doc\n" +
				"The following NEW packages will be installed:\n" +
				"  gcc-7-base libisl15\n" +
				"The following packages will be upgraded:\n" +
				"  cpp-4.8 g++-4.8 gcc-4.8 gcc-4.8-base libasan0 libatomic1 libgcc-4.8-dev\n" +
				"  libgomp1 libitm1 libmpfr4 libquadmath0 libstdc++-4.8-dev libstdc++6 libtsan0\n" +
				"14 upgraded, 2 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 32.2 MB of archives.\n" +
				"After this operation, 2,905 kB of additional disk space will be used.\n" +
				"Get:1 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-7-base amd64 7.2.0-1ubuntu1~14.04 [17.6 kB]\n" +
				"Get:2 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++6 amd64 7.2.0-1ubuntu1~14.04 [305 kB]\n" +
				"Get:3 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libtsan0 amd64 7.2.0-1ubuntu1~14.04 [271 kB]\n" +
				"Get:4 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libisl15 amd64 0.15-3~14.04 [507 kB]\n" +
				"Get:5 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libmpfr4 amd64 3.1.3-1~14.04 [178 kB]\n" +
				"Get:6 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main g++-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [18.1 MB]\n" +
				"Get:7 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [5,067 kB]\n" +
				"Get:8 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main cpp-4.8 amd64 4.8.5-2ubuntu1~14.04.1 [4,601 kB]\n" +
				"Get:9 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgomp1 amd64 7.2.0-1ubuntu1~14.04 [75.8 kB]\n" +
				"Get:10 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libitm1 amd64 7.2.0-1ubuntu1~14.04 [27.5 kB]\n" +
				"Get:11 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libatomic1 amd64 7.2.0-1ubuntu1~14.04 [9,012 B]\n" +
				"Get:12 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libquadmath0 amd64 7.2.0-1ubuntu1~14.04 [132 kB]\n" +
				"Get:13 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libstdc++-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,051 kB]\n" +
				"Get:14 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libgcc-4.8-dev amd64 4.8.5-2ubuntu1~14.04.1 [1,687 kB]\n" +
				"Get:15 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main libasan0 amd64 4.8.5-2ubuntu1~14.04.1 [63.1 kB]\n" +
				"Get:16 http://ppa.launchpad.net/ubuntu-toolchain-r/test/ubuntu/ trusty/main gcc-4.8-base amd64 4.8.5-2ubuntu1~14.04.1 [15.4 kB]\n" +
				"Fetched 32.2 MB in 45s (710 kB/s)\n" +
				"Selecting previously unselected package gcc-7-base:amd64.\n" +
				"(Reading database ... 88286 files and directories currently installed.)\n" +
				"Preparing to unpack .../gcc-7-base_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up gcc-7-base:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"(Reading database ... 88293 files and directories currently installed.)\n" +
				"Preparing to unpack .../libstdc++6_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Setting up libstdc++6:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"(Reading database ... 88294 files and directories currently installed.)\n" +
				"Preparing to unpack .../libtsan0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libtsan0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Selecting previously unselected package libisl15:amd64.\n" +
				"Preparing to unpack .../libisl15_0.15-3~14.04_amd64.deb ...\n" +
				"Unpacking libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Preparing to unpack .../libmpfr4_3.1.3-1~14.04_amd64.deb ...\n" +
				"Unpacking libmpfr4:amd64 (3.1.3-1~14.04) over (3.1.2-1) ...\n" +
				"Preparing to unpack .../g++-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking g++-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../cpp-4.8_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking cpp-4.8 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgomp1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libgomp1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libitm1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libitm1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libatomic1_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libatomic1:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libquadmath0_7.2.0-1ubuntu1~14.04_amd64.deb ...\n" +
				"Unpacking libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libstdc++-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libgcc-4.8-dev_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../libasan0_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Preparing to unpack .../gcc-4.8-base_4.8.5-2ubuntu1~14.04.1_amd64.deb ...\n" +
				"Unpacking gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) over (4.8.4-2ubuntu1~14.04.3) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ccache (3.1.9-1) ...\n" +
				"Updating symlinks in /usr/lib/ccache ...\n" +
				"Setting up libtsan0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libisl15:amd64 (0.15-3~14.04) ...\n" +
				"Setting up libmpfr4:amd64 (3.1.3-1~14.04) ...\n" +
				"Setting up gcc-4.8-base:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up cpp-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libgomp1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libitm1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libatomic1:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libasan0:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libquadmath0:amd64 (7.2.0-1ubuntu1~14.04) ...\n" +
				"Setting up libgcc-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up gcc-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up libstdc++-4.8-dev:amd64 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Setting up g++-4.8 (4.8.5-2ubuntu1~14.04.1) ...\n" +
				"Processing triggers for libc-bin (2.19-0ubuntu6.9) ...\n" +
				"\n" +
				"travis_time:end:212f10ba:start=1516632665026664875,finish=1516632718829250552,duration=53802585677\n" +
				"[0Ktravis_fold:end:apt\n" +
				"[0Ktravis_fold:start:services\n" +
				"[0Ktravis_time:start:06fcc922\n" +
				"[0K$ sudo service mongod start\n" +
				"mongod start/running, process 4294\n" +
				"\n" +
				"travis_time:end:06fcc922:start=1516632718880715697,finish=1516632718911712375,duration=30996678\n" +
				"[0Ktravis_time:start:061c3428\n" +
				"[0K$ sudo service docker start\n" +
				"start: Job is already running: docker\n" +
				"\n" +
				"travis_time:end:061c3428:start=1516632718918079959,finish=1516632718935524992,duration=17445033\n" +
				"[0Ktravis_fold:end:services\n" +
				"[0Ktravis_fold:start:hosts.before\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant \n" +
				"travis_fold:end:hosts.before\n" +
				"[0Ktravis_fold:start:hosts\n" +
				"[0Ktravis_fold:end:hosts\n" +
				"[0Ktravis_fold:start:hosts.after\n" +
				"[0K\n" +
				"## Managed by Chef on packer-5845ab1f-4d5f-541f-111b-54a89bd64361.c.eco-emissary-99515.internal :heart_eyes_cat:\n" +
				"## cookbook:: travis_build_environment\n" +
				"##     file:: templates/default/etc/cloud/templates/hosts.tmpl.erb\n" +
				"\n" +
				"127.0.1.1 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 travis-job-73c92f8a-766c-471f-826c-90cc431ae517 ip4-loopback trusty64\n" +
				"\n" +
				"127.0.0.1 localhost nettuno travis vagrant  localhost dev-controller\n" +
				"travis_fold:end:hosts.after\n" +
				"[0K\n" +
				"[33;1mSetting environment variables from repository settings[0m\n" +
				"$ export SOAJS_TEST_GIT_PWD=[secure]\n" +
				"$ export SOAJS_TEST_GIT_TOKEN=[secure]\n" +
				"\n" +
				"[33;1mSetting environment variables from .travis.yml[0m\n" +
				"$ export CXX=g++-4.8\n" +
				"\n" +
				"$ export PATH=./node_modules/.bin:$PATH\n" +
				"[33;1mUpdating nvm[0m\n" +
				"travis_fold:start:nvm.install\n" +
				"[0Ktravis_time:start:259cca10\n" +
				"[0K$ nvm install 6.9.5\n" +
				"Downloading and installing node v6.9.5...\n" +
				"Downloading https://nodejs.org/dist/v6.9.5/node-v6.9.5-linux-x64.tar.xz...\n" +
				"Computing checksum with sha256sum\n" +
				"Checksums matched!\n" +
				"Now using node v6.9.5 (npm v3.10.10)\n" +
				"\n" +
				"travis_time:end:259cca10:start=1516632722982336187,finish=1516632727149257648,duration=4166921461\n" +
				"[0Ktravis_fold:end:nvm.install\n" +
				"[0K$ node --version\n" +
				"v6.9.5\n" +
				"$ npm --version\n" +
				"3.10.10\n" +
				"$ nvm --version\n" +
				"0.33.8\n" +
				"travis_fold:start:before_install\n" +
				"[0Ktravis_time:start:2dc3852e\n" +
				"[0K$ sudo apt-get update && sudo apt-get install sendmail python make g++\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release.gpg\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2 InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty Release\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg InRelease\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2 Release\n" +
				"Ign http://dl.google.com stable InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security InRelease\n" +
				"Hit http://dl.google.com stable Release.gpg\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Sources\n" +
				"Hit http://dl.google.com stable Release\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-updates/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse i386 Packages\n" +
				"Ign http://toolbelt.heroku.com ./ InRelease\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty-backports/universe Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Sources\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse amd64 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse i386 Packages\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en\n" +
				"Hit http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/main Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/multiverse Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/restricted Translation-en_US\n" +
				"Ign http://us-central1.gce.archive.ubuntu.com trusty/universe Translation-en_US\n" +
				"Hit http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Release.gpg\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main amd64 Packages\n" +
				"Hit http://apt.postgresql.org trusty-pgdg/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Sources\n" +
				"Hit http://toolbelt.heroku.com ./ Release\n" +
				"Hit http://dl.google.com stable/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Sources\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Ign http://repo.mongodb.org trusty/mongodb-org/3.2/multiverse Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Sources\n" +
				"Hit http://security.ubuntu.com trusty-security/main amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted amd64 Packages\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en_US\n" +
				"Ign http://apt.postgresql.org trusty-pgdg/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe amd64 Packages\n" +
				"Hit https://dl.hhvm.com trusty/main amd64 Packages\n" +
				"Hit http://toolbelt.heroku.com ./ Packages\n" +
				"Get:1 https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/main i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted i386 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/universe i386 Packages\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en_US\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty InRelease\n" +
				"Ign https://dl.hhvm.com trusty/main Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse i386 Packages\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main amd64 Packages\n" +
				"Hit http://security.ubuntu.com trusty-security/main Translation-en\n" +
				"Hit https://apt.dockerproject.org ubuntu-trusty/main i386 Packages\n" +
				"Get:2 https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Hit http://security.ubuntu.com trusty-security/multiverse Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit http://security.ubuntu.com trusty-security/restricted Translation-en\n" +
				"Hit http://security.ubuntu.com trusty-security/universe Translation-en\n" +
				"Ign http://dl.google.com stable/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en_US\n" +
				"Ign https://apt.dockerproject.org ubuntu-trusty/main Translation-en\n" +
				"Ign http://toolbelt.heroku.com ./ Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty InRelease\n" +
				"Ign http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:3 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main Sources\n" +
				"Hit https://packagecloud.io trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty InRelease\n" +
				"Hit https://packagecloud.io trusty/main i386 Packages\n" +
				"Get:4 https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Ign https://packagecloud.io trusty/main Translation-en_US\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Ign https://packagecloud.io trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty Release.gpg\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty Release\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main amd64 Packages\n" +
				"Hit http://ppa.launchpad.net trusty/main i386 Packages\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en_US\n" +
				"Ign http://ppa.launchpad.net trusty/main Translation-en\n" +
				"Reading package lists...\n" +
				"Reading package lists...\n" +
				"Building dependency tree...\n" +
				"Reading state information...\n" +
				"g++ is already the newest version.\n" +
				"g++ set to manually installed.\n" +
				"make is already the newest version.\n" +
				"make set to manually installed.\n" +
				"python is already the newest version.\n" +
				"The following extra packages will be installed:\n" +
				"  procmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"Suggested packages:\n" +
				"  sendmail-doc rmail logcheck sasl2-bin\n" +
				"Recommended packages:\n" +
				"  default-mta mail-transport-agent fetchmail\n" +
				"The following NEW packages will be installed:\n" +
				"  procmail sendmail sendmail-base sendmail-bin sendmail-cf sensible-mda\n" +
				"0 upgraded, 6 newly installed, 0 to remove and 300 not upgraded.\n" +
				"Need to get 844 kB of archives.\n" +
				"After this operation, 4,365 kB of additional disk space will be used.\n" +
				"Get:1 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-base all 8.14.4-4.1ubuntu1 [139 kB]\n" +
				"Get:2 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-cf all 8.14.4-4.1ubuntu1 [86.1 kB]\n" +
				"Get:3 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail-bin amd64 8.14.4-4.1ubuntu1 [469 kB]\n" +
				"Get:4 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty-updates/main procmail amd64 3.22-21ubuntu0.2 [136 kB]\n" +
				"Get:5 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sensible-mda amd64 8.14.4-4.1ubuntu1 [8,246 B]\n" +
				"Get:6 http://us-central1.gce.archive.ubuntu.com/ubuntu/ trusty/universe sendmail all 8.14.4-4.1ubuntu1 [6,248 B]\n" +
				"Fetched 844 kB in 0s (15.8 MB/s)\n" +
				"Selecting previously unselected package sendmail-base.\n" +
				"(Reading database ... 88300 files and directories currently installed.)\n" +
				"Preparing to unpack .../sendmail-base_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-cf.\n" +
				"Preparing to unpack .../sendmail-cf_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail-bin.\n" +
				"Preparing to unpack .../sendmail-bin_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package procmail.\n" +
				"Preparing to unpack .../procmail_3.22-21ubuntu0.2_amd64.deb ...\n" +
				"Unpacking procmail (3.22-21ubuntu0.2) ...\n" +
				"Selecting previously unselected package sensible-mda.\n" +
				"Preparing to unpack .../sensible-mda_8.14.4-4.1ubuntu1_amd64.deb ...\n" +
				"Unpacking sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Selecting previously unselected package sendmail.\n" +
				"Preparing to unpack .../sendmail_8.14.4-4.1ubuntu1_all.deb ...\n" +
				"Unpacking sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"Processing triggers for man-db (2.6.7.1-1ubuntu1) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sendmail-base (8.14.4-4.1ubuntu1) ...\n" +
				"adduser: Warning: The home directory `/var/lib/sendmail' does not belong to the user you are currently creating.\n" +
				"Setting up sendmail-cf (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail-bin (8.14.4-4.1ubuntu1) ...\n" +
				"update-rc.d: warning: default stop runlevel arguments (0 1 6) do not match sendmail Default-Stop values (1)\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-mta (sendmail-mta) in auto mode\n" +
				"update-alternatives: using /usr/lib/sm.bin/sendmail to provide /usr/sbin/sendmail-msp (sendmail-msp) in auto mode\n" +
				"\n" +
				"You are doing a new install, or have erased /etc/mail/sendmail.mc.\n" +
				"If you've accidentaly erased /etc/mail/sendmail.mc, check /var/backups.\n" +
				"\n" +
				"I am creating a safe, default sendmail.mc for you and you can\n" +
				"run sendmailconfig later if you need to change the defaults.\n" +
				"\n" +
				" * Stopping Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Updating sendmail environment ...\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Could not open /etc/mail/sendmail.mc(No such file or directory)\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Turning off Host Status collection\n" +
				"Could not open /etc/mail/databases(No such file or directory), creating it.\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"\n" +
				"Checking filesystem, this may take some time - it will not hang!\n" +
				"  ...   Done.\n" +
				" \n" +
				"Checking for installed MDAs...\n" +
				"Adding link for newly extant program (mail.local)\n" +
				"Adding link for newly extant program (procmail)\n" +
				"sasl2-bin not installed, not configuring sendmail support.\n" +
				"\n" +
				"To enable sendmail SASL2 support at a later date, invoke \"/usr/share/sendmail/update_auth\"\n" +
				"\n" +
				" \n" +
				"Creating/Updating SSL(for TLS) information\n" +
				"Creating /etc/mail/tls/starttls.m4...\n" +
				"Creating SSL certificates for sendmail.\n" +
				"Generating DSA parameters, 2048 bit long prime\n" +
				"This could take some time\n" +
				"............+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				".+.............+.+............+.......+.+...+..........+......+.............+....+........+...+...........................+.......+..+.....................+........+....+.+..........+.....+....+.....+...+.........+......+....+.+.................+.+...+......+.......+....+.......+........+.+.........+......+.+++++++++++++++++++++++++++++++++++++++++++++++++++*\n" +
				"Generating RSA private key, 2048 bit long modulus\n" +
				"................................+++\n" +
				".....+++\n" +
				"e is 65537 (0x10001)\n" +
				" \n" +
				"Updating /etc/hosts.allow, adding \"sendmail: all\".\n" +
				"\n" +
				"Please edit /etc/hosts.allow and check the rules location to\n" +
				"make sure your security measures have not been overridden -\n" +
				"it is common to move the sendmail:all line to the *end* of\n" +
				"the file, so your more selective rules take precedence.\n" +
				"Checking {sendmail,submit}.mc and related databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/databases...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Creating /etc/mail/Makefile...\n" +
				"Reading configuration from /etc/mail/sendmail.conf.\n" +
				"Validating configuration.\n" +
				"Writing configuration to /etc/mail/sendmail.conf.\n" +
				"Writing /etc/cron.d/sendmail.\n" +
				"Disabling HOST statistics file(/var/lib/sendmail/host_status).\n" +
				"Creating /etc/mail/sendmail.cf...\n" +
				"Creating /etc/mail/submit.cf...\n" +
				"Informational: confCR_FILE file empty: /etc/mail/relay-domains\n" +
				"Warning: confCT_FILE source file not found: /etc/mail/trusted-users\n" +
				" it was created\n" +
				"Informational: confCT_FILE file empty: /etc/mail/trusted-users\n" +
				"Warning: confCW_FILE source file not found: /etc/mail/local-host-names\n" +
				" it was created\n" +
				"Warning: access_db source file not found: /etc/mail/access\n" +
				" it was created\n" +
				"Updating /etc/mail/access...\n" +
				"Linking /etc/aliases to /etc/mail/aliases\n" +
				"Informational: ALIAS_FILE file empty: /etc/mail/aliases\n" +
				"Updating /etc/mail/aliases...\n" +
				"/etc/mail/aliases: 0 aliases, longest 0 bytes, 0 bytes total\n" +
				" \n" +
				"Warning: 3 database(s) sources\n" +
				"\twere not found, (but were created)\n" +
				"\tplease investigate.\n" +
				" * Starting Mail Transport Agent (MTA) sendmail\n" +
				"   ...done.\n" +
				"Setting up procmail (3.22-21ubuntu0.2) ...\n" +
				"Processing triggers for ureadahead (0.100.0-16) ...\n" +
				"Setting up sensible-mda (8.14.4-4.1ubuntu1) ...\n" +
				"Setting up sendmail (8.14.4-4.1ubuntu1) ...\n" +
				"\n" +
				"travis_time:end:2dc3852e:start=1516632728501391693,finish=1516632752436032451,duration=23934640758\n" +
				"[0Ktravis_fold:end:before_install\n" +
				"[0Ktravis_fold:start:install.npm\n" +
				"[0Ktravis_time:start:0271b378\n" +
				"[0K$ npm install \n" +
				"npm WARN deprecated github@0.2.4: 'github' has been renamed to '@octokit/rest' (https://git.io/vNB11)\n" +
				"npm WARN deprecated nodemailer@1.11.0: All versions below 4.0.1 of Nodemailer are deprecated. See https://nodemailer.com/status/\n" +
				"npm WARN deprecated graceful-fs@3.0.11: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"npm WARN deprecated minimatch@0.2.14: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated coffee-script@1.3.3: CoffeeScript on NPM has moved to \"coffeescript\" (no hyphen)\n" +
				"npm WARN deprecated minimatch@0.3.0: Please update to minimatch 3.0.2 or higher to avoid a RegExp DoS issue\n" +
				"npm WARN deprecated graceful-fs@1.2.3: please upgrade to graceful-fs 4 for compatibility with current and future versions of Node.js\n" +
				"\n" +
				"> dtrace-provider@0.8.6 install /home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider\n" +
				"> node-gyp rebuild || node suppress-error.js\n" +
				"\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"gyp WARN download NVM_NODEJS_ORG_MIRROR is deprecated and will be removed in node-gyp v4, please use NODEJS_ORG_MIRROR\n" +
				"make: Entering directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"  TOUCH Release/obj.target/DTraceProviderStub.stamp\n" +
				"make: Leaving directory `/home/travis/build/soajs/soajs.dashboard/node_modules/dtrace-provider/build'\n" +
				"\n" +
				"> dtrace-provider@0.7.1 install /home/travis/build/soajs/soajs.dashboard/node_modules/ldapjs/node_modules/dtrace-provider\n" +
				"> node scripts/install.js\n" +
				"\n" +
				"soajs.dashboard@2.0.6 /home/travis/build/soajs/soajs.dashboard\n" +
				"├── async@2.1.4 \n" +
				"├─┬ bitbucket-server-nodejs@2.11.4 \n" +
				"│ ├─┬ query-string@4.3.4 \n" +
				"│ │ ├── object-assign@4.1.1 \n" +
				"│ │ └── strict-uri-encode@1.1.0 \n" +
				"│ └─┬ request-promise@4.2.2 \n" +
				"│   ├── bluebird@3.5.1 \n" +
				"│   ├── request-promise-core@1.1.1 \n" +
				"│   └── stealthy-require@1.1.1 \n" +
				"├── compare-versions@3.0.1 \n" +
				"├── cron@1.2.1 \n" +
				"├─┬ easy-zip@0.0.4 \n" +
				"│ └── async@2.6.0 \n" +
				"├── formidable@1.0.17 \n" +
				"├─┬ github@0.2.4 \n" +
				"│ └── mime@1.6.0 \n" +
				"├─┬ gridfs-stream@1.1.1 \n" +
				"│ └── flushwritable@1.0.0 \n" +
				"├─┬ grunt@0.4.5 \n" +
				"│ ├── async@0.1.22 \n" +
				"│ ├── coffee-script@1.3.3 \n" +
				"│ ├── colors@0.6.2 \n" +
				"│ ├── dateformat@1.0.2-1.2.3 \n" +
				"│ ├── eventemitter2@0.4.14 \n" +
				"│ ├── exit@0.1.2 \n" +
				"│ ├─┬ findup-sync@0.1.3 \n" +
				"│ │ ├─┬ glob@3.2.11 \n" +
				"│ │ │ └── minimatch@0.3.0 \n" +
				"│ │ └── lodash@2.4.2 \n" +
				"│ ├── getobject@0.1.0 \n" +
				"│ ├─┬ glob@3.1.21 \n" +
				"│ │ ├── graceful-fs@1.2.3 \n" +
				"│ │ └── inherits@1.0.2 \n" +
				"│ ├─┬ grunt-legacy-log@0.1.3 \n" +
				"│ │ ├─┬ grunt-legacy-log-utils@0.1.1 \n" +
				"│ │ │ ├── lodash@2.4.2 \n" +
				"│ │ │ └── underscore.string@2.3.3 \n" +
				"│ │ ├── lodash@2.4.2 \n" +
				"│ │ └── underscore.string@2.3.3 \n" +
				"│ ├─┬ grunt-legacy-util@0.2.0 \n" +
				"│ │ ├── async@0.1.22 \n" +
				"│ │ └── lodash@0.9.2 \n" +
				"│ ├── hooker@0.2.3 \n" +
				"│ ├── iconv-lite@0.2.11 \n" +
				"│ ├─┬ js-yaml@2.0.5 \n" +
				"│ │ ├─┬ argparse@0.1.16 \n" +
				"│ ��� │ ├── underscore@1.7.0 \n" +
				"│ │ │ └── underscore.string@2.4.0 \n" +
				"│ │ └── esprima@1.0.4 \n" +
				"│ ├── lodash@0.9.2 \n" +
				"│ ├─┬ minimatch@0.2.14 \n" +
				"│ │ ├── lru-cache@2.2.4 \n" +
				"│ │ └── sigmund@1.0.1 \n" +
				"│ ├─┬ nopt@1.0.10 \n" +
				"│ │ └── abbrev@1.1.1 \n" +
				"│ ├── rimraf@2.2.8 \n" +
				"│ ├── underscore.string@2.2.1 \n" +
				"│ └── which@1.0.9 \n" +
				"├─┬ grunt-contrib-clean@1.0.0 \n" +
				"│ └── async@1.5.2 \n" +
				"├─┬ grunt-contrib-copy@1.0.0 \n" +
				"│ ├─┬ chalk@1.1.3 \n" +
				"│ │ ├── ansi-styles@2.2.1 \n" +
				"│ │ ├─┬ has-ansi@2.0.0 \n" +
				"│ │ │ └── ansi-regex@2.1.1 \n" +
				"│ │ ├── strip-ansi@3.0.1 \n" +
				"│ │ └── supports-color@2.0.0 \n" +
				"│ └── file-sync-cmp@0.1.1 \n" +
				"├── grunt-contrib-jshint@1.1.0 \n" +
				"├─┬ grunt-coveralls@1.0.1 \n" +
				"│ └─┬ coveralls@2.13.3 \n" +
				"│   ├─┬ js-yaml@3.6.1 \n" +
				"│   │ └── esprima@2.7.3 \n" +
				"│   ├── lcov-parse@0.0.10 \n" +
				"│   ├── log-driver@1.2.5 \n" +
				"│   ├── minimist@1.2.0 \n" +
				"│   └─┬ request@2.79.0 \n" +
				"│     ├── caseless@0.11.0 \n" +
				"│     ├─┬ har-validator@2.0.6 \n" +
				"│     │ ├── commander@2.13.0 \n" +
				"│     │ ├─┬ is-my-json-valid@2.17.1 \n" +
				"│     │ │ ├── generate-function@2.0.0 \n" +
				"│     │ │ ├─┬ generate-object-property@1.2.0 \n" +
				"│     │ │ │ └── is-property@1.0.2 \n" +
				"│     │ │ ├── jsonpointer@4.0.1 \n" +
				"│     │ │ └── xtend@4.0.1 \n" +
				"│     │ └─┬ pinkie-promise@2.0.1 \n" +
				"│     │   └── pinkie@2.0.4 \n" +
				"│     ├── qs@6.3.2 \n" +
				"│     └── tunnel-agent@0.4.3 \n" +
				"├─┬ grunt-env@0.4.4 \n" +
				"│ ├── ini@1.3.5 \n" +
				"│ └── lodash@2.4.2 \n" +
				"├─┬ grunt-istanbul@0.7.2 \n" +
				"│ ├── chalk@1.1.1 \n" +
				"│ ├─┬ istanbul@0.4.5 \n" +
				"│ │ ├── abbrev@1.0.9 \n" +
				"│ │ ├── async@1.5.2 \n" +
				"│ │ ├─┬ escodegen@1.8.1 \n" +
				"│ │ │ ├── esprima@2.7.3 \n" +
				"│ │ │ ├── estraverse@1.9.3 \n" +
				"│ │ │ ├── esutils@2.0.2 \n" +
				"│ │ │ ├─┬ optionator@0.8.2 \n" +
				"│ │ │ │ ├── deep-is@0.1.3 \n" +
				"│ │ │ │ ├── fast-levenshtein@2.0.6 \n" +
				"│ │ │ │ ├── levn@0.3.0 \n" +
				"│ │ │ │ ├── prelude-ls@1.1.2 \n" +
				"│ │ │ │ ├── type-check@0.3.2 \n" +
				"│ │ │ │ └── wordwrap@1.0.0 \n" +
				"│ │ │ └─┬ source-map@0.2.0 \n" +
				"│ │ │   └── amdefine@1.0.1 \n" +
				"│ │ ├── esprima@2.7.3 \n" +
				"│ │ ├── glob@5.0.15 \n" +
				"│ │ ├─┬ handlebars@4.0.6 \n" +
				"│ │ │ ├── async@1.5.2 \n" +
				"│ │ │ ├─┬ optimist@0.6.1 \n" +
				"│ │ │ │ └── wordwrap@0.0.3 \n" +
				"│ │ │ ├── source-map@0.4.4 \n" +
				"│ │ │ └─┬ uglify-js@2.8.29 \n" +
				"│ │ │   ├── source-map@0.5.7 \n" +
				"│ │ │   ├── uglify-to-browserify@1.0.2 \n" +
				"│ │ │   └─┬ yargs@3.10.0 \n" +
				"│ │ │     ├── camelcase@1.2.1 \n" +
				"│ │ │     ├─┬ cliui@2.1.0 \n" +
				"│ │ │     │ ├─┬ center-align@0.1.3 \n" +
				"│ │ │     │ │ ├─┬ align-text@0.1.4 \n" +
				"│ │ │     │ │ │ ├─┬ kind-of@3.2.2 \n" +
				"│ │ │     │ │ │ │ └── is-buffer@1.1.6 \n" +
				"│ │ │     │ │ │ ├── longest@1.0.1 \n" +
				"│ │ │     │ │ │ └── repeat-string@1.6.1 \n" +
				"│ │ │     │ │ └���─ lazy-cache@1.0.4 \n" +
				"│ │ │     │ ├── right-align@0.1.3 \n" +
				"│ │ │     │ └── wordwrap@0.0.2 \n" +
				"│ │ │     ├── decamelize@1.2.0 \n" +
				"│ │ │     └── window-size@0.1.0 \n" +
				"│ │ ├─┬ js-yaml@3.10.0 \n" +
				"│ │ │ └── esprima@4.0.0 \n" +
				"│ │ ├── nopt@3.0.6 \n" +
				"│ │ ├─┬ once@1.4.0 \n" +
				"│ │ │ └── wrappy@1.0.2 \n" +
				"│ │ ├── resolve@1.1.7 \n" +
				"│ │ ├── supports-color@3.2.3 \n" +
				"│ │ ├─┬ which@1.3.0 \n" +
				"│ │ │ └── isexe@2.0.0 \n" +
				"│ │ └── wordwrap@1.0.0 \n" +
				"│ └── nue@0.7.1 \n" +
				"├─┬ grunt-jsdoc@2.1.0 \n" +
				"│ ├─┬ cross-spawn@3.0.1 \n" +
				"│ │ ├─┬ lru-cache@4.1.1 \n" +
				"│ │ │ ├── pseudomap@1.0.2 \n" +
				"│ │ │ └── yallist@2.1.2 \n" +
				"│ │ └── which@1.3.0 \n" +
				"│ └─┬ jsdoc@3.5.5 \n" +
				"│   ├── babylon@7.0.0-beta.19 \n" +
				"│   ├─┬ catharsis@0.8.9 \n" +
				"│   │ └─┬ underscore-contrib@0.3.0 \n" +
				"│   │   └── underscore@1.6.0 \n" +
				"│   ├─┬ js2xmlparser@3.0.0 \n" +
				"│   │ └── xmlcreate@1.0.2 \n" +
				"│   ├─┬ klaw@2.0.0 \n" +
				"│   │ └── graceful-fs@4.1.11 \n" +
				"│   ├── marked@0.3.12 \n" +
				"│   ├─┬ requizzle@0.2.1 \n" +
				"│   │ └── underscore@1.6.0 \n" +
				"│   ├── strip-json-comments@2.0.1 \n" +
				"│   ├── taffydb@2.6.2 \n" +
				"│   └── underscore@1.8.3 \n" +
				"├── grunt-mocha-test@0.13.2 \n" +
				"├─┬ jshint@2.9.4 \n" +
				"│ ├── cli@1.0.1 \n" +
				"│ ├─┬ console-browserify@1.1.0 \n" +
				"│ │ └── date-now@0.1.4 \n" +
				"│ ├─┬ htmlparser2@3.8.3 \n" +
				"│ │ ├── domelementtype@1.3.0 \n" +
				"│ │ ├── domhandler@2.3.0 \n" +
				"│ │ ├─┬ domutils@1.5.1 \n" +
				"│ │ │ └─┬ dom-serializer@0.1.0 \n" +
				"│ │ │   ├── domelementtype@1.1.3 \n" +
				"│ │ │   └── entities@1.1.1 \n" +
				"│ │ ├── entities@1.0.0 \n" +
				"│ │ └── readable-stream@1.1.14 \n" +
				"│ ├── lodash@3.7.0 \n" +
				"│ ├─┬ minimatch@3.0.4 \n" +
				"│ │ └─┬ brace-expansion@1.1.8 \n" +
				"│ │   ├── balanced-match@1.0.0 \n" +
				"│ │   └── concat-map@0.0.1 \n" +
				"│ ├── shelljs@0.3.0 \n" +
				"│ └── strip-json-comments@1.0.4 \n" +
				"├── kubernetes-client@2.2.3 \n" +
				"├── lodash@4.17.4 \n" +
				"├─┬ mkdirp@0.5.1 \n" +
				"│ └── minimist@0.0.8 \n" +
				"├─┬ mocha@3.2.0 \n" +
				"│ ├── browser-stdout@1.3.0 \n" +
				"│ ├─┬ commander@2.9.0 \n" +
				"│ │ └── graceful-readlink@1.0.1 \n" +
				"│ ├─┬ debug@2.2.0 \n" +
				"│ │ └── ms@0.7.1 \n" +
				"│ ├── diff@1.4.0 \n" +
				"│ ├── escape-string-regexp@1.0.5 \n" +
				"│ ├─┬ glob@7.0.5 \n" +
				"│ │ ├── fs.realpath@1.0.0 \n" +
				"│ │ ├── inflight@1.0.6 \n" +
				"│ │ ├── inherits@2.0.3 \n" +
				"│ │ └── path-is-absolute@1.0.1 \n" +
				"│ ├── growl@1.9.2 \n" +
				"│ ├── json3@3.3.2 \n" +
				"│ ├─┬ lodash.create@3.1.1 \n" +
				"│ │ ├─┬ lodash._baseassign@3.2.0 \n" +
				"│ │ │ ├── lodash._basecopy@3.0.1 \n" +
				"│ │ │ └─┬ lodash.keys@3.1.2 \n" +
				"│ │ │   ├── lodash._getnative@3.9.1 \n" +
				"│ │ │   ├── lodash.isarguments@3.1.0 \n" +
				"│ │ │   └── lodash.isarray@3.0.4 \n" +
				"│ │ ├── lodash._basecreate@3.0.3 \n" +
				"│ │ └── lodash._isiterateecall@3.0.9 \n" +
				"│ └─┬ supports-color@3.1.2 \n" +
				"│   └── has-flag@1.0.0 \n" +
				"├─┬ moment-timezone@0.5.11 \n" +
				"│ └── moment@2.20.1 \n" +
				"├── ncp@2.0.0 \n" +
				"├─┬ nock@9.0.13 \n" +
				"│ ├─┬ chai@3.5.0 \n" +
				"│ │ ├── assertion-error@1.1.0 \n" +
				"│ │ ├─┬ deep-eql@0.1.3 \n" +
				"│ │ │ └── type-detect@0.1.1 \n" +
				"│ │ └── type-detect@1.0.0 \n" +
				"│ ├─┬ debug@2.6.9 \n" +
				"│ │ └── ms@2.0.0 \n" +
				"│ ├── deep-equal@1.0.1 \n" +
				"│ ├── json-stringify-safe@5.0.1 \n" +
				"│ ├── propagate@0.4.0 \n" +
				"│ └── qs@6.4.0 \n" +
				"├── object-hash@1.1.5 \n" +
				"├─┬ request@2.81.0 \n" +
				"│ ├── aws-sign2@0.6.0 \n" +
				"│ ├── aws4@1.6.0 \n" +
				"│ ├── caseless@0.12.0 \n" +
				"│ ├─┬ combined-stream@1.0.5 \n" +
				"│ │ └── delayed-stream@1.0.0 \n" +
				"│ ├── extend@3.0.1 \n" +
				"│ ├── forever-agent@0.6.1 \n" +
				"│ ├─┬ form-data@2.1.4 \n" +
				"│ │ └── asynckit@0.4.0 \n" +
				"│ ├─┬ har-validator@4.2.1 \n" +
				"│ │ ├─┬ ajv@4.11.8 \n" +
				"│ │ │ ├── co@4.6.0 \n" +
				"│ │ │ └─┬ json-stable-stringify@1.0.1 \n" +
				"│ │ │   └── jsonify@0.0.0 \n" +
				"│ │ └── har-schema@1.0.5 \n" +
				"│ ├─┬ hawk@3.1.3 \n" +
				"│ │ ├── boom@2.10.1 \n" +
				"│ │ ├── cryptiles@2.0.5 \n" +
				"│ │ ├── hoek@2.16.3 \n" +
				"│ │ └── sntp@1.0.9 \n" +
				"│ ├─┬ http-signature@1.1.1 \n" +
				"│ │ ├── assert-plus@0.2.0 \n" +
				"│ │ ├─┬ jsprim@1.4.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├── extsprintf@1.3.0 \n" +
				"│ │ │ ├── json-schema@0.2.3 \n" +
				"│ │ │ └─┬ verror@1.10.0 \n" +
				"│ │ │   └── assert-plus@1.0.0 \n" +
				"│ │ └─┬ sshpk@1.13.1 \n" +
				"│ │   ├── asn1@0.2.3 \n" +
				"│ │   ├── assert-plus@1.0.0 \n" +
				"│ │   ├── bcrypt-pbkdf@1.0.1 \n" +
				"│ │   ├─┬ dashdash@1.14.1 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── ecc-jsbn@0.1.1 \n" +
				"│ │   ├─┬ getpass@0.1.7 \n" +
				"│ │   │ └── assert-plus@1.0.0 \n" +
				"│ │   ├── jsbn@0.1.1 \n" +
				"│ │   └── tweetnacl@0.14.5 \n" +
				"│ ├── is-typedarray@1.0.0 \n" +
				"│ ├── isstream@0.1.2 \n" +
				"│ ├─┬ mime-types@2.1.17 \n" +
				"│ │ └── mime-db@1.30.0 \n" +
				"│ ├── oauth-sign@0.8.2 \n" +
				"│ ├── performance-now@0.2.0 \n" +
				"│ ├── safe-buffer@5.1.1 \n" +
				"│ ├── stringstream@0.0.5 \n" +
				"│ ├─┬ tough-cookie@2.3.3 \n" +
				"│ │ └── punycode@1.4.1 \n" +
				"│ ├── tunnel-agent@0.6.0 \n" +
				"│ └── uuid@3.2.1 \n" +
				"├─┬ rimraf@2.5.4 \n" +
				"│ └── glob@7.1.2 \n" +
				"├─┬ shelljs@0.7.5 \n" +
				"│ ├── interpret@1.1.0 \n" +
				"│ └── rechoir@0.6.2 \n" +
				"├── shortid@2.2.8 \n" +
				"├─┬ sinon@1.17.6 \n" +
				"│ ├── formatio@1.1.1 \n" +
				"│ ├── lolex@1.3.2 \n" +
				"│ ├── samsam@1.1.2 \n" +
				"│ └─┬ util@0.10.3 \n" +
				"│   └── inherits@2.0.1 \n" +
				"├─┬ soajs@2.0.3 \n" +
				"│ ├─┬ body-parser@1.18.2 \n" +
				"│ │ ├── bytes@3.0.0 \n" +
				"│ │ ├── content-type@1.0.4 \n" +
				"│ │ ├── depd@1.1.2 \n" +
				"│ │ ├─┬ http-errors@1.6.2 \n" +
				"│ │ │ ├── depd@1.1.1 \n" +
				"│ │ │ ├── setprototypeof@1.0.3 \n" +
				"│ │ │ └── statuses@1.4.0 \n" +
				"│ │ ├── iconv-lite@0.4.19 \n" +
				"│ │ ├─┬ on-finished@2.3.0 \n" +
				"│ │ │ └── ee-first@1.1.1 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├─┬ raw-body@2.3.2 \n" +
				"│ │ │ └── unpipe@1.0.0 \n" +
				"│ │ └─┬ type-is@1.6.15 \n" +
				"│ │   └── media-typer@0.3.0 \n" +
				"│ ├─┬ connect@3.6.5 \n" +
				"│ │ ├─┬ finalhandler@1.0.6 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── parseurl@1.3.2 \n" +
				"│ │ └── utils-merge@1.0.1 \n" +
				"│ ├─┬ cookie-parser@1.4.3 \n" +
				"│ │ ├── cookie@0.3.1 \n" +
				"│ │ └── cookie-signature@1.0.6 \n" +
				"│ ├─┬ express@4.16.0 \n" +
				"│ │ ├─┬ accepts@1.3.4 \n" +
				"│ │ │ └── negotiator@0.6.1 \n" +
				"│ │ ├── array-flatten@1.1.1 \n" +
				"│ │ ├── content-disposition@0.5.2 \n" +
				"│ │ ├── encodeurl@1.0.2 \n" +
				"│ │ ├── escape-html@1.0.3 \n" +
				"│ │ ├── etag@1.8.1 \n" +
				"│ │ ├── finalhandler@1.1.0 \n" +
				"│ │ ├── fresh@0.5.2 \n" +
				"│ │ ├── merge-descriptors@1.0.1 \n" +
				"│ │ ├── methods@1.1.2 \n" +
				"│ │ ├── path-to-regexp@0.1.7 \n" +
				"│ │ ├─┬ proxy-addr@2.0.2 \n" +
				"│ │ │ ├── forwarded@0.1.2 \n" +
				"│ │ │ └── ipaddr.js@1.5.2 \n" +
				"│ │ ├── qs@6.5.1 \n" +
				"│ │ ├── range-parser@1.2.0 \n" +
				"│ │ ├─┬ send@0.16.0 \n" +
				"│ │ │ ├── destroy@1.0.4 \n" +
				"│ │ │ ├── mime@1.4.1 \n" +
				"│ │ │ └── statuses@1.3.1 \n" +
				"│ │ ├── serve-static@1.13.0 \n" +
				"│ │ ├── setprototypeof@1.1.0 \n" +
				"│ │ ├── statuses@1.3.1 \n" +
				"│ │ └── vary@1.1.2 \n" +
				"│ ├─┬ express-session@1.15.6 \n" +
				"│ │ ├── crc@3.4.4 \n" +
				"│ │ ├── on-headers@1.0.1 \n" +
				"│ │ └─┬ uid-safe@2.1.5 \n" +
				"│ │   └── random-bytes@1.0.0 \n" +
				"│ ├─┬ http-proxy@1.16.2 \n" +
				"│ │ ├── eventemitter3@1.2.0 \n" +
				"│ │ └── requires-port@1.0.0 \n" +
				"│ ├── merge@1.2.0 \n" +
				"│ ├── method-override@2.3.10 \n" +
				"│ ├─┬ morgan@1.9.0 \n" +
				"│ │ └── basic-auth@2.0.0 \n" +
				"│ ├── netmask@1.0.6 \n" +
				"│ ���─┬ oauth2-server@2.4.1 \n" +
				"│ │ └── basic-auth@0.0.1 \n" +
				"│ ├─┬ path-to-regexp@1.7.0 \n" +
				"│ │ └── isarray@0.0.1 \n" +
				"│ ├─┬ soajs.core.drivers@2.0.3 \n" +
				"│ │ ├─┬ dockerode@2.5.3  (git://github.com/soajs/dockerode.git#51ff2e2f1d2ba7b82bcdef31a2b85289218bd2a2)\n" +
				"│ │ │ ├─┬ concat-stream@1.5.2 \n" +
				"│ │ │ │ ├─┬ readable-stream@2.0.6 \n" +
				"│ │ │ │ │ └── isarray@1.0.0 \n" +
				"│ │ │ │ └── typedarray@0.0.6 \n" +
				"│ │ │ ├─┬ docker-modem@1.0.4  (git://github.com/aff04/docker-modem.git#c40f13261825c40ff7d3cf3019b090d7e81bacbf)\n" +
				"│ │ │ │ ├─┬ JSONStream@0.10.0 \n" +
				"│ │ │ │ │ ├── jsonparse@0.0.5 \n" +
				"│ │ │ │ │ └── through@2.3.8 \n" +
				"│ │ │ │ ├── readable-stream@1.0.34 \n" +
				"│ │ │ │ └── split-ca@1.0.1 \n" +
				"│ │ │ └─┬ tar-fs@1.12.0 \n" +
				"│ │ │   ├─┬ pump@1.0.3 \n" +
				"│ │ │   │ └── end-of-stream@1.4.1 \n" +
				"│ │ │   └─┬ tar-stream@1.5.5 \n" +
				"│ │ │     └── bl@1.2.1 \n" +
				"│ │ ├─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │ ├─┬ assign-deep@0.4.6 \n" +
				"│ │ │ │ ├── assign-symbols@0.1.1 \n" +
				"│ │ │ │ ├── is-primitive@2.0.0 \n" +
				"│ │ │ │ └── kind-of@5.1.0 \n" +
				"│ │ │ └── async@2.6.0 \n" +
				"│ │ └─┬ ws@3.3.1 \n" +
				"│ │   ├── async-limiter@1.0.0 \n" +
				"│ │   └── ultron@1.1.1 \n" +
				"│ ├── soajs.core.libs@1.0.1 \n" +
				"│ ├─┬ soajs.core.modules@2.0.1 \n" +
				"│ │ ├── bcryptjs@2.4.3 \n" +
				"│ │ ├─┬ bunyan@1.8.5 \n" +
				"│ ��� │ ├─┬ dtrace-provider@0.8.6 \n" +
				"│ │ │ │ └── nan@2.8.0 \n" +
				"│ │ │ ├─┬ mv@2.1.1 \n" +
				"│ │ │ │ └─┬ rimraf@2.4.5 \n" +
				"│ │ │ │   └── glob@6.0.4 \n" +
				"│ │ │ └── safe-json-stringify@1.0.4 \n" +
				"│ │ ├─┬ bunyan-format@0.2.1 \n" +
				"│ │ │ ├── ansicolors@0.2.1 \n" +
				"│ │ │ ├── ansistyles@0.1.3 \n" +
				"│ │ │ └─┬ xtend@2.1.2 \n" +
				"│ │ │   └── object-keys@0.4.0 \n" +
				"│ │ ├─┬ elasticsearch@12.1.3 \n" +
				"│ │ │ └─┬ promise@7.3.1 \n" +
				"│ │ │   └── asap@2.0.6 \n" +
				"│ │ ├── elasticsearch-deletebyquery@1.6.0 \n" +
				"│ │ ├── jsonschema@1.1.1 \n" +
				"│ │ ├─┬ mongodb@2.2.31 \n" +
				"│ │ │ ├── es6-promise@3.2.1 \n" +
				"│ │ │ ├─┬ mongodb-core@2.1.15 \n" +
				"│ │ │ │ ├── bson@1.0.4 \n" +
				"│ │ │ │ └─┬ require_optional@1.0.1 \n" +
				"│ │ │ │   ├── resolve-from@2.0.0 \n" +
				"│ │ │ │   └── semver@5.5.0 \n" +
				"│ │ │ └─┬ readable-stream@2.2.7 \n" +
				"│ │ │   ├── buffer-shims@1.0.0 \n" +
				"│ │ │   ├── isarray@1.0.0 \n" +
				"│ │ │   ├── process-nextick-args@1.0.7 \n" +
				"│ │ │   ├── string_decoder@1.0.3 \n" +
				"│ │ │   └── util-deprecate@1.0.2 \n" +
				"│ │ ├─┬ nodemailer@1.11.0 \n" +
				"│ │ │ ├─┬ libmime@1.2.0 \n" +
				"│ │ │ │ ├── libbase64@0.1.0 \n" +
				"│ │ │ │ └── libqp@1.1.0 \n" +
				"│ │ │ ├─┬ mailcomposer@2.1.0 \n" +
				"│ │ │ │ └─┬ buildmail@2.0.0 \n" +
				"│ │ │ │   ├── addressparser@0.3.2 \n" +
				"│ │ │ │   └── needle@0.10.0 \n" +
				"│ │ │ ├── needle@0.11.0 \n" +
				"│ │ │ ├─┬ nodemailer-direct-transport@1.1.0 \n" +
				"│ │ │ │ └── smtp-connection@1.3.8 \n" +
				"│ │ │ └─┬ nodemailer-smtp-transport@1.1.0 \n" +
				"│ │ │   └── clone@1.0.3 \n" +
				"│ │ ├─┬ nodemailer-direct-transport@3.3.2 \n" +
				"│ │ │ ├─┬ nodemailer-shared@1.1.0 \n" +
				"│ │ │ │ └── nodemailer-fetch@1.6.0 \n" +
				"│ │ │ └─┬ smtp-connection@2.12.0 \n" +
				"│ │ │   └─┬ httpntlm@1.6.1 \n" +
				"│ │ │     └── httpreq@0.4.24 \n" +
				"│ │ ├── nodemailer-sendmail-transport@1.0.0 \n" +
				"│ │ └─┬ nodemailer-smtp-transport@2.7.2 \n" +
				"│ │   ├── nodemailer-wellknown@0.1.10 \n" +
				"│ │   └── smtp-connection@2.12.0 \n" +
				"│ ├─┬ soajs.urac.driver@1.0.4 \n" +
				"│ │ ├── activedirectory@0.7.2 \n" +
				"│ │ ├─┬ ldapjs@1.0.1 \n" +
				"│ │ │ ├── assert-plus@1.0.0 \n" +
				"│ │ │ ├─┬ backoff@2.5.0 \n" +
				"│ │ │ │ └── precond@0.2.3 \n" +
				"│ │ │ ├── dtrace-provider@0.7.1 \n" +
				"│ │ │ ├─┬ ldap-filter@0.2.2 \n" +
				"│ │ │ │ └── assert-plus@0.1.5 \n" +
				"│ │ │ └─┬ vasync@1.6.4 \n" +
				"│ │ │   └─┬ verror@1.6.0 \n" +
				"│ │ │     └── extsprintf@1.2.0 \n" +
				"│ │ ├── passport@0.4.0 \n" +
				"│ │ └── soajs.core.modules@1.0.9 \n" +
				"│ ├─┬ useragent@2.2.1 \n" +
				"│ │ └─┬ tmp@0.0.33 \n" +
				"│ │   └── os-tmpdir@1.0.2 \n" +
				"│ └── validator@6.2.0 \n" +
				"├── soajs.controller@2.0.3 \n" +
				"├── soajs.mongodb.data@2.0.0 \n" +
				"├── soajs.oauth@2.0.3 \n" +
				"├─┬ soajs.urac@2.0.3 \n" +
				"│ ├─┬ passport@0.3.2 \n" +
				"│ │ └── pause@0.0.1 \n" +
				"│ ├─┬ passport-facebook@2.1.1 \n" +
				"│ │ └─┬ passport-oauth2@1.4.0 \n" +
				"│ │   ├── oauth@0.9.15 \n" +
				"│ │   └── uid2@0.0.3 \n" +
				"│ ├── passport-github@1.1.0 \n" +
				"│ ├─┬ passport-google-oauth@1.0.0 \n" +
				"│ │ ├── passport-google-oauth1@1.0.0 \n" +
				"│ │ └── passport-google-oauth20@1.0.0 \n" +
				"│ ├─┬ passport-local@1.0.0 \n" +
				"│ │ └── passport-strategy@1.0.0 \n" +
				"│ ├─┬ passport-twitter@1.0.4 \n" +
				"│ │ ├── passport-oauth1@1.1.0 \n" +
				"│ │ └─┬ xtraverse@0.1.0 \n" +
				"│ │   └── xmldom@0.1.27 \n" +
				"│ ├─┬ soajs@2.0.2 \n" +
				"│ │ ├─┬ soajs.core.drivers@2.0.2 \n" +
				"│ │ │ └─┬ kubernetes-client@3.14.0  (git://github.com/soajs/kubernetes-client.git#36a4dd23e402383cc57f7a7e3910218ced3ed5be)\n" +
				"│ │ │   └── async@2.6.0 \n" +
				"│ │ └── soajs.core.modules@2.0.0 \n" +
				"│ └── uuid@3.0.1 \n" +
				"├─┬ unzip2@0.2.5 \n" +
				"│ ├─┬ binary@0.3.0 \n" +
				"│ │ ├── buffers@0.1.1 \n" +
				"│ │ └─┬ chainsaw@0.1.0 \n" +
				"│ │   └── traverse@0.3.9 \n" +
				"│ ├─┬ fstream@0.1.31 \n" +
				"│ │ └─┬ graceful-fs@3.0.11 \n" +
				"│ │   └── natives@1.1.1 \n" +
				"│ ├─┬ match-stream@0.0.2 \n" +
				"│ │ └── readable-stream@1.0.34 \n" +
				"│ ├─┬ pullstream@0.4.1 \n" +
				"│ │ ├── over@0.0.5 \n" +
				"│ │ ├── readable-stream@1.0.34 \n" +
				"│ │ └─┬ slice-stream@1.0.0 \n" +
				"│ │   └── readable-stream@1.0.34 \n" +
				"│ ├─┬ readable-stream@1.0.34 \n" +
				"│ │ ├── core-util-is@1.0.2 \n" +
				"│ │ └── string_decoder@0.10.31 \n" +
				"│ └── setimmediate@1.0.5 \n" +
				"└─┬ yamljs@0.2.8 \n" +
				"  └─┬ argparse@1.0.9 \n" +
				"    └── sprintf-js@1.0.3 \n" +
				"\n" +
				"\n" +
				"travis_time:end:0271b378:start=1516632752442275724,finish=1516632785238671709,duration=32796395985\n" +
				"[0Ktravis_fold:end:install.npm\n" +
				"[0Ktravis_fold:start:before_script.1\n" +
				"[0Ktravis_time:start:09263a08\n" +
				"[0K$ npm install -g grunt-cli\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/bin/grunt -> /home/travis/.nvm/versions/node/v6.9.5/lib/node_modules/grunt-cli/bin/grunt\n" +
				"/home/travis/.nvm/versions/node/v6.9.5/lib\n" +
				"└─┬ grunt-cli@1.2.0 \n" +
				"  ├─┬ findup-sync@0.3.0 \n" +
				"  │ └─┬ glob@5.0.15 \n" +
				"  │   ├─┬ inflight@1.0.6 \n" +
				"  │   │ └── wrappy@1.0.2 \n" +
				"  │   ├── inherits@2.0.3 \n" +
				"  │   ├─┬ minimatch@3.0.4 \n" +
				"  │   │ └─┬ brace-expansion@1.1.8 \n" +
				"  │   │   ├── balanced-match@1.0.0 \n" +
				"  │   │   └── concat-map@0.0.1 \n" +
				"  │   ├── once@1.4.0 \n" +
				"  │   └── path-is-absolute@1.0.1 \n" +
				"  ├── grunt-known-options@1.1.0 \n" +
				"  ├─┬ nopt@3.0.6 \n" +
				"  │ └── abbrev@1.1.1 \n" +
				"  └── resolve@1.1.7 \n" +
				"\n" +
				"\n" +
				"travis_time:end:09263a08:start=1516632785559483836,finish=1516632787215454340,duration=1655970504\n" +
				"[0Ktravis_fold:end:before_script.1\n" +
				"[0Ktravis_fold:start:before_script.2\n" +
				"[0Ktravis_time:start:18776dfe\n" +
				"[0K$ docker pull soajsorg/soajs\n" +
				"Using default tag: latest\n" +
				"latest: Pulling from soajsorg/soajs\n" +
				"af49a5ceb2a5: Pulling fs layer\n" +
				"8f9757b472e7: Pulling fs layer\n" +
				"e931b117db38: Pulling fs layer\n" +
				"47b5e16c0811: Pulling fs layer\n" +
				"9332eaf1a55b: Pulling fs layer\n" +
				"7323f579e778: Pulling fs layer\n" +
				"61c8c60d374e: Pulling fs layer\n" +
				"c9a783521b12: Pulling fs layer\n" +
				"452f98a11bd8: Pulling fs layer\n" +
				"384667d2af15: Pulling fs layer\n" +
				"c357a82b5d6f: Pulling fs layer\n" +
				"72f10c562385: Pulling fs layer\n" +
				"47b5e16c0811: Waiting\n" +
				"9332eaf1a55b: Waiting\n" +
				"7323f579e778: Waiting\n" +
				"61c8c60d374e: Waiting\n" +
				"c9a783521b12: Waiting\n" +
				"452f98a11bd8: Waiting\n" +
				"384667d2af15: Waiting\n" +
				"c357a82b5d6f: Waiting\n" +
				"72f10c562385: Waiting\n" +
				"e931b117db38: Verifying Checksum\n" +
				"e931b117db38: Download complete\n" +
				"8f9757b472e7: Verifying Checksum\n" +
				"8f9757b472e7: Download complete\n" +
				"47b5e16c0811: Verifying Checksum\n" +
				"47b5e16c0811: Download complete\n" +
				"9332eaf1a55b: Verifying Checksum\n" +
				"9332eaf1a55b: Download complete\n" +
				"7323f579e778: Verifying Checksum\n" +
				"7323f579e778: Download complete\n" +
				"61c8c60d374e: Verifying Checksum\n" +
				"61c8c60d374e: Download complete\n" +
				"c9a783521b12: Verifying Checksum\n" +
				"c9a783521b12: Download complete\n" +
				"af49a5ceb2a5: Verifying Checksum\n" +
				"af49a5ceb2a5: Download complete\n" +
				"452f98a11bd8: Verifying Checksum\n" +
				"452f98a11bd8: Download complete\n" +
				"384667d2af15: Verifying Checksum\n" +
				"384667d2af15: Download complete\n" +
				"c357a82b5d6f: Verifying Checksum\n" +
				"c357a82b5d6f: Download complete\n" +
				"72f10c562385: Verifying Checksum\n" +
				"72f10c562385: Download complete\n" +
				"af49a5ceb2a5: Pull complete\n" +
				"8f9757b472e7: Pull complete\n" +
				"e931b117db38: Pull complete\n" +
				"47b5e16c0811: Pull complete\n" +
				"9332eaf1a55b: Pull complete\n" +
				"7323f579e778: Pull complete\n" +
				"61c8c60d374e: Pull complete\n" +
				"c9a783521b12: Pull complete\n" +
				"452f98a11bd8: Pull complete\n" +
				"384667d2af15: Pull complete\n" +
				"c357a82b5d6f: Pull complete\n" +
				"72f10c562385: Pull complete\n" +
				"Digest: sha256:8ed6c9de7889224c91f5f31be359c3b1f981112dcde86e503f7f0a1974bfeb9a\n" +
				"Status: Downloaded newer image for soajsorg/soajs:latest\n" +
				"\n" +
				"travis_time:end:18776dfe:start=1516632787223444927,finish=1516632814185488407,duration=26962043480\n" +
				"[0Ktravis_fold:end:before_script.2\n" +
				"[0Ktravis_fold:start:before_script.3\n" +
				"[0Ktravis_time:start:006e2c91\n" +
				"[0K$ sleep 10\n" +
				"\n" +
				"travis_time:end:006e2c91:start=1516632814192526630,finish=1516632824199594539,duration=10007067909\n" +
				"[0Ktravis_fold:end:before_script.3\n" +
				"[0Ktravis_time:start:177f2130\n" +
				"[0K$ grunt coverage\n" +
				"[4mRunning \"clean:doc\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"clean:coverage\" (clean) task[24m\n" +
				"[32m>> [39m0 paths cleaned.\n" +
				"\n" +
				"[4mRunning \"copy:main\" (copy) task[24m\n" +
				"Copied 9 files\n" +
				"\n" +
				"[4mRunning \"env:coverage\" (env) task[24m\n" +
				"\n" +
				"[4mRunning \"instrument\" task[24m\n" +
				"Instrumented 62 files\n" +
				"\n" +
				"[4mRunning \"mochaTest:unit\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  ✓ Init environment model\n" +
				"  testing catalog.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing list\n" +
				"      ✓ Success\n" +
				"      ✓ Success with version\n" +
				"\n" +
				"  testing helper soajs.cd.js\n" +
				"    testing deepVersionComparison\n" +
				"      ✓ success - no update detected, official image\n" +
				"      ✓ success - deployer update detected, official image\n" +
				"      ✓ success - core update detected, official image\n" +
				"      ✓ success - image update, custom image\n" +
				"      ✓ success - image tag is not a number\n" +
				"    testing processUndeployedServices\n" +
				"      ✓ success - will build list of undeployed services, version specified\n" +
				"      ✓ success - will build list of undeployed services, version not specified\n" +
				"      ✓ success - will build list of one service, daemon specified is already deployed\n" +
				"    processOneService\n" +
				"      ✓ success - commit error, service is deployed\n" +
				"      ✓ Success update\n" +
				"      ✓ Success notify, service is deployed\n" +
				"      ✓ Success notify, service is not deployed\n" +
				"    checkRecordConfig\n" +
				"      ✓ Fail\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Success\n" +
				"      ✓ Success 2\n" +
				"      ✓ Success 3\n" +
				"      ✓ Success - repository cd information found for custom deployed service\n" +
				"    getEnvsServices\n" +
				"      ✓ Success\n" +
				"    doesServiceHaveUpdates\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Success doesServiceHaveUpdates\n" +
				"      ✓ Success doesServiceHaveUpdates with v\n" +
				"    getLatestSOAJSImageInfo\n" +
				"      ✓ Success getLatestSOAJSImageInfo\n" +
				"    getServices\n" +
				"      ✓ Success 1\n" +
				"    deepVersionComparison\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success with id\n" +
				"      ✓ Success\n" +
				"      ✓ Success without serviceVersion\n" +
				"    testing getLedger\n" +
				"      ✓ Success\n" +
				"    testing getUpdates\n" +
				"      ✓ Success getUpdates\n" +
				"    testing markRead\n" +
				"      ✓ Success markRead by id\n" +
				"      ✓ Success markRead all\n" +
				"    testing saveConfig\n" +
				"      ✓ Success saveConfig\n" +
				"\n" +
				"  testing ci.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing toggleRepoStatus\n" +
				"      ✓ Success - enable\n" +
				"      ✓ Success - disable\n" +
				"    testing getRepoSettings\n" +
				"      ✓ Success getRepoSettings\n" +
				"    testing updateRepoSettings\n" +
				"      ✓ Success id (number)\n" +
				"      ✓ Success id (string)\n" +
				"    testing getRepoYamlFile\n" +
				"      ✓ success - will get file\n" +
				"\n" +
				"  testing autoscale.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    testing set\n" +
				"      ✓ success - update autoscalers\n" +
				"      ✓ success - turn off autoscalers\n" +
				"      ✓ fail - update autoscalers, driver error\n" +
				"      ✓ fail - turn off autoscalers, driver error\n" +
				"    testing updateEnvAutoscaleConfig\n" +
				"      ✓ success - will update environment autoscale config and set deployer record\n" +
				"      ✓ success - will update environment autoscale config\n" +
				"\n" +
				"  testing deploy.js\n" +
				"    getGitRecord\n" +
				"      ✓ Success getGitRecord\n" +
				"    checkPort\n" +
				"      ✓ Fail. checkPort\n" +
				"      ✓ Success checkPort\n" +
				"    computeCatalogEnvVars\n" +
				"      ✓ Fail computeCatalogEnvVars\n" +
				"      ✓ Success computeCatalogEnvVars\n" +
				"    getDashDbInfo\n" +
				"      ✓ Success getDashDbInfo\n" +
				"    deployContainer\n" +
				"      ✓ Success deployContainer\n" +
				"      ✓ Success deployContainer options\n" +
				"      ✓ Success deployContainer rebuild\n" +
				"      ✓ Success deployContainer with Kubernetes - null mode\n" +
				"      ✓ Success deployContainer with Kubernetes - replicated mode\n" +
				"      ✓ Success deployContainer with Kubernetes - global mode\n" +
				"      ✓ Success deployContainer with Docker \n" +
				"\n" +
				"  testing deploy.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    deployService\n" +
				"      ✓ Success deployService. soajs (332ms)\n" +
				"      ✓ testing deploy service type custom (210ms)\n" +
				"    testing deploy plugin\n" +
				"      ✓ success - deploy heapster plugin\n" +
				"\n" +
				"  testing maintenance.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    streamLogs\n" +
				"      ✓ Failed\n" +
				"    maintenance\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"\n" +
				"  testing metrics.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    metrics\n" +
				"      ✓ get service metrics\n" +
				"      ✓ get node metrics\n" +
				"\n" +
				"  testing namespaces.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    list\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"    delete\n" +
				"      ✓ success\n" +
				"      ✓ success kubernetes\n" +
				"\n" +
				"  testing nodes.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listNodes\n" +
				"      ✓ success\n" +
				"    removeNode\n" +
				"      ✓ success\n" +
				"    updateNode\n" +
				"      ✓ success\n" +
				"    addNode\n" +
				"      ✓ success\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init\n" +
				"    listServices\n" +
				"      ✓ Success\n" +
				"    scaleService\n" +
				"      ✓ Success\n" +
				"    deleteService\n" +
				"      ✓ Success\n" +
				"    testing checkResource\n" +
				"      ✓ success - will find heapster service\n" +
				"      ✓ success - will not find heapster service\n" +
				"\n" +
				"  testing helper daemons.js\n" +
				"    validateCronTime ()\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"    testing checkIfGroupIsDeployed\n" +
				"      ✓ success - will get one deployed daemon\n" +
				"      ✓ success - will not find any deployed daemons\n" +
				"\n" +
				"  testing daemons.js\n" +
				"    ✓ Init model\n" +
				"    addGroupConfig\n" +
				"      ✓ Success type cron\n" +
				"      ✓ Success type once\n" +
				"      ✓ Fail\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing environment.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"    testing removeCert\n" +
				"      ✓ Success removeCert\n" +
				"    testing Update deployer configuration\n" +
				"      ✓ Success removeCert\n" +
				"\n" +
				"  testing status.js\n" +
				"    ✓ Success startDeployment case 1 (10045ms)\n" +
				"    ✓ Success startDeployment case 2 (10012ms)\n" +
				"    ✓ Success startDeployment case 3 (10012ms)\n" +
				"    ✓ Success startDeployment case 4 (10014ms)\n" +
				"    ✓ Success checkProgress case 1 (10026ms)\n" +
				"    ✓ Success checkProgress  case 2 (10058ms)\n" +
				"    ✓ Success rollbackDeployment case 1 (18032ms)\n" +
				"    ✓ Success rollbackDeployment case 2 (18047ms)\n" +
				"    ✓ Success rollbackDeployment case 3 (17042ms)\n" +
				"\n" +
				"  testing statusRollback.js\n" +
				"    ✓ Success removeCertificates\n" +
				"    ✓ Success removeProduct with id\n" +
				"    ✓ Success removeProduct with tenant\n" +
				"    ✓ Success removeCertificates with none\n" +
				"    ✓ Success removeService\n" +
				"    ✓ Success removeService with no id\n" +
				"    ✓ Success removeController\n" +
				"    ✓ Success removeUrac\n" +
				"    ✓ Success removeOauth\n" +
				"    ✓ Success removeNginx\n" +
				"    ✓ Success removeCluster local with serviceId\n" +
				"    ✓ Success removeCluster local with no serviceId\n" +
				"    ✓ Success removeCluster external\n" +
				"    ✓ Success removeCluster none\n" +
				"    ✓ Success redirectTo3rdParty user no roll back\n" +
				"    ✓ Success redirectTo3rdParty user \n" +
				"    ✓ fail redirectTo3rdParty no test \n" +
				"    ✓ Success redirectTo3rdParty user recursive  (20029ms)\n" +
				"    ✓ Success redirectTo3rdParty user recursive no id\n" +
				"    ✓ fail redirectTo3rdParty no options \n" +
				"    removeCatalog\n" +
				"      ✓ Success with recipe\n" +
				"      ✓ Success with no recipe\n" +
				"    initBLModel\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing statusUtils.js\n" +
				"    ✓ Success uploadCertificates case 1\n" +
				"    ✓ Success uploadCertificates case 2\n" +
				"    ✓ Success uploadCertificates case 3\n" +
				"    ✓ Success productize case 1\n" +
				"    ✓ Success productize case 2\n" +
				"    ✓ Success productize case 3\n" +
				"    ✓ Success productize case 4\n" +
				"    ✓ Success deployClusterResource case 1\n" +
				"    ✓ Success deployClusterResource case 2\n" +
				"    ✓ Success deployClusterResource case 3\n" +
				"    ✓ Success handleClusters\n" +
				"    ✓ Success deployservice case  1\n" +
				"    ✓ Success deployservice case 2\n" +
				"    ✓ Success deployController\n" +
				"    ✓ Success deployUrac\n" +
				"    ✓ Success deployOauth\n" +
				"    ✓ Success createNginxRecipe case 1\n" +
				"    ✓ Success createNginxRecipe case 2\n" +
				"    ✓ Success createNginxRecipe case 3\n" +
				"    ✓ Success deployNgin case 1\n" +
				"    ✓ Success deployNgin case 2\n" +
				"    ✓ Success deployNgin case 3\n" +
				"    ✓ Success createUserAndGroup case 1\n" +
				"    ✓ Success createUserAndGroup case 2\n" +
				"    ✓ Success createUserAndGroup case 3\n" +
				"    ✓ Success createUserAndGroup case 4\n" +
				"    ✓ Success createUserAndGroup case 5\n" +
				"    ✓ Success createUserAndGroup case 6\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success createUserAndGroup case 7\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 1\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 2\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 3\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 4\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 5\n" +
				"    ✓ Success redirectTo3rdPartyDeploy case 6\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 1\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 2\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 3\n" +
				"    ✓ Success redirectTo3rdPartyStatus case 5\n" +
				"    ✓ Success initBLModel\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    ✓ Fail - Bad config path\n" +
				"    ✓ Fail - Cannot parse Yaml file\n" +
				"    ✓ Fail - Bad Yaml file\n" +
				"    ✓ Fail - Empty Yaml file\n" +
				"    ✓ Fail - No summary for API\n" +
				"    ✓ Success - config file generated\n" +
				"\n" +
				"  testing helper git.js\n" +
				"    getCustomRepoFiles\n" +
				"      ✓ Fail 1: soa.js\n" +
				"      ✓ Fail 2: swagger.yml\n" +
				"      ✓ success\n" +
				"    comparePaths\n" +
				"      ✓ Success: will remove\n" +
				"      ✓ Success: will sync\n" +
				"    testing removePath\n" +
				"      ✓ success - type service\n" +
				"      ✓ success - type daemon\n" +
				"    extractAPIsList\n" +
				"      ✓ Success new style\n" +
				"      ✓ Success old style\n" +
				"    validateFileContents\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    analyzeConfigSyncFile\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"      ✓ Success Multi\n" +
				"      ✓ Fail Multi\n" +
				"    buildDeployerOptions\n" +
				"      ✓ Success\n" +
				"    getServiceInfo\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanAdd\n" +
				"      ✓ No type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    checkCanSync\n" +
				"      ✓ Fail. no type\n" +
				"      ✓ Success service\n" +
				"      ✓ Success daemon\n" +
				"    extractDaemonJobs\n" +
				"      ✓ Success\n" +
				"    cleanConfigDir\n" +
				"      ✓ Success\n" +
				"    testing checkifRepoIsDeployed\n" +
				"      ✓ success - will get one deployed service\n" +
				"      ✓ success - will not find any deployed services\n" +
				"\n" +
				"  testing git.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    testing login\n" +
				"      ✓ success\n" +
				"      ✓ success password\n" +
				"    testing logout\n" +
				"      ✓ success\n" +
				"      ✓ success 2\n" +
				"    testing listAccounts\n" +
				"      ✓ success listAccounts\n" +
				"    testing getRepos\n" +
				"      ✓ success getRepos\n" +
				"    testing getFiles\n" +
				"      ✓ success getFile\n" +
				"      ✓ success getHAFile\n" +
				"    testing getBranches\n" +
				"      ✓ success getBranches\n" +
				"      ✓ fail - cannot get Branches for service - wrong name\n" +
				"      ✓ success - will get Branches for service\n" +
				"      ✓ success - will get Branches for daemon\n" +
				"    testing activateRepo\n" +
				"      ✓ success activateRepo service\n" +
				"      ✓ success activateRepo multi\n" +
				"      ✓ success activateRepo custom\n" +
				"      ✓ success activateRepo misc\n" +
				"    testing deactivateRepo\n" +
				"      ✓ success deactivate multi\n" +
				"      ✓ success deactivate custom\n" +
				"      ✓ success deactivate service\n" +
				"      ✓ fail deactivateRepo\n" +
				"    testing syncRepo\n" +
				"      ✓ success syncRepo service\n" +
				"      ✓ success syncRepo multi\n" +
				"      ✓ success syncRepo multi 2\n" +
				"      ✓ Fail syncRepo outOfSync\n" +
				"      ✓ Success syncRepo upToDate\n" +
				"\n" +
				"  testing helper host.js\n" +
				"    getTenants\n" +
				"      ✓ Success getTenants with acl_all_env\n" +
				"      ✓ Success getTenants with acl 1\n" +
				"      ✓ Success getTenants with acl 2\n" +
				"      ✓ Success getTenants with acl 3\n" +
				"      ✓ Success getTenants with package_acl_all_env\n" +
				"      ✓ Success getTenants with package_acl\n" +
				"      ✓ Success getTenants with user acl\n" +
				"\n" +
				"  testing host.js\n" +
				"    init ()\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"    listHostEnv\n" +
				"      ✓ Success listHostEnv\n" +
				"    listHAhostEnv\n" +
				"      ✓ Success listHAhostEnv\n" +
				"    awareness\n" +
				"      ✓ Success maintenanceOperation. controller\n" +
				"\n" +
				"  testing product.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing services.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"      ✓ Init model\n" +
				"    list\n" +
				"      ✓ Success list\n" +
				"      ✓ Success list with includeEnvs\n" +
				"    updateSettings\n" +
				"      ✓ Success updateSettings\n" +
				"\n" +
				"  testing swagger.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing tenant.js\n" +
				"    testing init\n" +
				"      ✓ No Model Requested\n" +
				"      ✓ Model Name not found\n" +
				"\n" +
				"  testing models git.js\n" +
				"    testing getAuthToken\n" +
				"      ✓ success 1\n" +
				"    testing getAccount\n" +
				"      ✓ success 1\n" +
				"      ✓ success 2\n" +
				"    testing getRepo\n" +
				"      ✓ success 1\n" +
				"    testing searchForAccount\n" +
				"      ✓ success 1\n" +
				"    testing addRepoToAccount\n" +
				"      ✓ success 1\n" +
				"    testing removeRepoFromAccount\n" +
				"      ✓ success 1\n" +
				"    testing updateRepoInfo\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing models host.js\n" +
				"    testing getEnvironment\n" +
				"      ✓ success 1\n" +
				"\n" +
				"  testing ci drone index.js\n" +
				"    testing getFileName\n" +
				"      ✓ Call getFileName\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"DATA { uri: 'https://my.drone/api/repos/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return 1 repo only\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/console-server/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepos will return repos list\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"DATA { uri: 'https://my.drone/api/user/repos',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ error while fetching repositories\n" +
				"    testing listRepoBranches\n" +
				"DATA { uri: 'https://my.drone/api/repos/soajsTestAccount/soajsTestRepo/builds',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing listEnvVars\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listEnvVars\n" +
				"    testing addEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: { name: 'SOAJS_CD_API_ROUTE', value: '/cd/deploy' },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/SECRET_NAME',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"      ✓ Call deleteEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"DATA { log: { debug: [Function: debug] },\n" +
				"  settings: \n" +
				"   { domain: 'my.drone',\n" +
				"     owner: 'CLOUD',\n" +
				"     repo: 'dashboard',\n" +
				"     ciToken: 'access1' },\n" +
				"  params: \n" +
				"   { repoOwner: 'CLOUD',\n" +
				"     variables: { ENV_NAME_1: 'ENV_VALUE_1', ENV_NAME_2: 'ENV_VALUE_2' } } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_1',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_2',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets/ENV_NAME_3',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_1',\n" +
				"     value: 'ENV_VALUE_1',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard/secrets',\n" +
				"  body: \n" +
				"   { name: 'ENV_NAME_2',\n" +
				"     value: 'ENV_VALUE_2',\n" +
				"     event: [ 'push', 'tag', 'deployment' ] },\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call ensureRepoVars\n" +
				"    testing setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call activate setHook\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call deactivate setHook\n" +
				"    testing listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ Call listSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ get repos on inactive\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true }\n" +
				"      ✓ no repositories found\n" +
				"    testing updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ Call updateSettings\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"      ✓ updateSettings with Insufficient privileges\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_tags: true,\n" +
				"     allow_tag: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { uri: 'https://my.drone/api/repos/CLOUD/dashboard',\n" +
				"  headers: \n" +
				"   { Accept: 'application/json',\n" +
				"     'Content-Type': 'application/json',\n" +
				"     Authorization: 'access1',\n" +
				"     Host: 'my.drone' },\n" +
				"  json: true,\n" +
				"  body: \n" +
				"   { allow_deploys: true,\n" +
				"     allow_deploy: true,\n" +
				"     name: 'dashboard',\n" +
				"     owner: 'CLOUD' } }\n" +
				"DATA { error: { message: 'error' } }\n" +
				"      ✓ error in updating\n" +
				"\n" +
				"  testing ci index.js\n" +
				"    testing addEnvVar\n" +
				"      ✓ Call Travis addEnvVar\n" +
				"      ✓ Call Drone addEnvVar\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call Travis updateEnvVar\n" +
				"      ✓ Call Drone updateEnvVar\n" +
				"    testing deleteEnvVar\n" +
				"      ✓ Call Travis deleteEnvVar\n" +
				"      ✓ Call Drone deleteEnvVar\n" +
				"    testing setHook\n" +
				"      ✓ Call Travis setHook\n" +
				"      ✓ Call Drone setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call Travis listSettings\n" +
				"    testing updateSettings\n" +
				"      ✓ Call Travis updateSettings\n" +
				"      ✓ Call Drone updateSettings\n" +
				"    testing generateToken\n" +
				"      ✓ Call Travis generateToken\n" +
				"    testing listEnvVars\n" +
				"      ✓ Call Travis listEnvVars\n" +
				"      ✓ Call Drone listEnvVars\n" +
				"    testing listRepos\n" +
				"      ✓ Call Travis listRepos\n" +
				"      ✓ Call Drone listRepos\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call Travis ensureRepoVars\n" +
				"      ✓ Call Drone ensureRepoVars\n" +
				"\n" +
				"  testing ci travis index.js\n" +
				"    testing generateToken\n" +
				"      ✓ Call generateToken\n" +
				"    testing listRepos\n" +
				"      ✓ Call listRepos\n" +
				"    testing listRepoBranches\n" +
				"      ✓ Call listRepoBranches\n" +
				"    testing updateEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"    testing ensureRepoVars\n" +
				"      ✓ Call addEnvVar\n" +
				"      ✓ Call updateEnvVar\n" +
				"      ✓ Call deleteEnvVar\n" +
				"      ✓ Call listEnvVars\n" +
				"      ✓ Call ensureRepoVars Success\n" +
				"      ✓ Call ensureRepoVars Fail\n" +
				"    testing updateSettings\n" +
				"      ✓ Call updateSettings\n" +
				"    testing setHook\n" +
				"      ✓ Call setHook\n" +
				"    testing listSettings\n" +
				"      ✓ Call listSettings\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Fail\n" +
				"      ✓ Success - TODO\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success\n" +
				"      ✓ Success - with options name\n" +
				"      ✓ Fail\n" +
				"    testing getRepoContent\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Fail\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success - empty repos\n" +
				"      ✓ Success - repo not found\n" +
				"      ✓ Success - repo found\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket_enterprise index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success public\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket helper.js\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success without name\n" +
				"      ✓ Success with name\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success\n" +
				"      ✓ Success wth token\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success generate (789ms)\n" +
				"    testing checkAuthToken\n" +
				"      ✓ Success refresh\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing buildBranchesArray\n" +
				"      ✓ Success\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"    testing writeFile\n" +
				"      ✓ Success - doesnt exist\n" +
				"    testing clearDir\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/bitbucket index.js\n" +
				"    testing login\n" +
				"      ✓ Success private\n" +
				"      ✓ Success\n" +
				"      ✓ Fail\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github helper.js\n" +
				"    testing authenticate\n" +
				"      ✓ Success type basic\n" +
				"      ✓ Success type oauth\n" +
				"    testing createAuthToken\n" +
				"      ✓ Success (136ms)\n" +
				"    testing checkUserRecord\n" +
				"      ✓ Success checkUserRecord (115ms)\n" +
				"    testing checkOrgRecord\n" +
				"      ✓ Success checkOrgRecord (97ms)\n" +
				"    testing getRepoBranches\n" +
				"      ✓ Success 1\n" +
				"      ✓ Success 2 (1169ms)\n" +
				"    testing getRepoContent\n" +
				"      ✓ Success\n" +
				"    testing getAllRepos\n" +
				"      ✓ Success getAllRepos token (99ms)\n" +
				"      ✓ Success getAllRepos personal (106ms)\n" +
				"      ✓ Success getAllRepos organization (100ms)\n" +
				"    testing addReposStatus\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git/github index.js\n" +
				"    testing login\n" +
				"      ✓ Success public personal (370ms)\n" +
				"      ✓ Success public organization (100ms)\n" +
				"      ✓ Success public organization (433ms)\n" +
				"    testing logout\n" +
				"      ✓ Success\n" +
				"    testing getRepos\n" +
				"      ✓ Success\n" +
				"    testing getBranches\n" +
				"      ✓ Success 1\n" +
				"    testing getJSONContent\n" +
				"      ✓ Success\n" +
				"    testing getAnyContent\n" +
				"      ✓ Success\n" +
				"\n" +
				"  testing git index.js\n" +
				"    testing login\n" +
				"      ✓ Login github\n" +
				"    testing logout\n" +
				"      ✓ logout github\n" +
				"    testing getRepos\n" +
				"      ✓ getRepos github\n" +
				"    testing getBranches\n" +
				"      ✓ getBranches github\n" +
				"    testing getJSONContent\n" +
				"      ✓ getJSONContent github\n" +
				"    testing getAnyContent\n" +
				"      ✓ Fail name not found\n" +
				"      ✓ Success get github\n" +
				"\n" +
				"  testing utils utils.js\n" +
				"    testing checkErrorReturn\n" +
				"      ✓ Fail 1\n" +
				"    testing buildDeployerOptions\n" +
				"      ✓ Fail 1\n" +
				"      ✓ Fail 2\n" +
				"      ✓ Fail 3\n" +
				"      ✓ Fail 4\n" +
				"\n" +
				"\n" +
				"  429 passing (2m)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"mochaTest:integration\" (mochaTest) task[24m\n" +
				"\n" +
				"\n" +
				"  importing sample data\n" +
				"/home/travis/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard /home/travis/build/soajs/soajs.dashboard\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard/provision ~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"MongoDB shell version: 3.2.11\n" +
				"connecting to: test\n" +
				"~/build/soajs/soajs.dashboard/node_modules/soajs.mongodb.data/modules/dashboard\n" +
				"/home/travis/build/soajs/soajs.dashboard\n" +
				"    ✓ do import (1682ms)\n" +
				"    ✓ update environment before starting service (40ms)\n" +
				"    ✓ update requestTimeout\n" +
				"test data imported.\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 4): MongoError: Index with name: name_1 already exists with different options\n" +
				"(node:6900) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 5): MongoError: Index with name: name_1 already exists with different options\n" +
				"    ✓ Start Services (4417ms)\n" +
				"    ✓ reload controller registry (527ms)\n" +
				"\n" +
				"  Swagger\n" +
				"    Simulator Tests\n" +
				"      Testing source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - will check input no source (61ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"        ✓ fail - will check input invalid source\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"        ✓ fail - will check input empty source\n" +
				"      Testing complex simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 119 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing missing item simulation api\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 102 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"      Testing item with multiple errors\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/simulate HTTP/1.1\" 200 291 \"-\" \"-\"\n" +
				"        ✓ success - will check input\n" +
				"    Generator Tests\n" +
				"      service check\n" +
				"        ✓ create temp service (77ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service name taken (79ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 94 \"-\" \"-\"\n" +
				"        ✓ fail - service port taken (70ms)\n" +
				"        ✓ remove temp service (74ms)\n" +
				"      yaml check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 192 \"-\" \"-\"\n" +
				"        ✓ fail - invalid yaml code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid mapping of inputs (42ms)\n" +
				"      full check\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:13 +0000] \"POST /swagger/generate HTTP/1.1\" 200 7977 \"-\" \"-\"\n" +
				"file downloaded to: ./mytestservice.zip\n" +
				"        ✓ success - service generated (96ms)\n" +
				"\n" +
				"  DASHBOARD UNIT TESTS for locked\n" +
				"    environment tests\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /environment/delete?id=55128442e603d7e01ab1688d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ FAIL locked - cant delete environment\n" +
				"========================================================\n" +
				"    products tests\n" +
				"      product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked. Cant update product\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ Fail - locked - delete product\n" +
				"========================================================\n" +
				"      package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5512867be603d7e01ab1688d HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/packages/update?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update package\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?id=5512867be603d7e01ab1688d&code=DEFLT HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete package\n" +
				"========================================================\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        ✓ mongo test\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/update?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant update tenant (41ms)\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant delete tenant\n" +
				"========================================================\n" +
				"      oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/oauth/add/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant add oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/oauth/update/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. cant update oauth\n" +
				"========================================================\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/oauth/delete/?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ FAIL - locked. - cant delete oauth\n" +
				"========================================================\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/add?id=551286bce603d7e01ab1688e HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant add application\n" +
				"========================================================\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - cant update application\n" +
				"========================================================\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - locked. - will delete application\n" +
				"========================================================\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/add?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add key\n" +
				"========================================================\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /tenant/application/key/delete?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete key\n" +
				"========================================================\n" +
				"      application ext keys\n" +
				"        add application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/add/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant add ext key\n" +
				"========================================================\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/ext/update/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update ext key\n" +
				"========================================================\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/application/key/ext/delete/?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant delete ext key\n" +
				"========================================================\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /tenant/application/key/config/update?id=551286bce603d7e01ab1688e&appId=5512926a7a1f0e2123f638de&key=38145c67717c73d3febd16df38abf311&extKeyEnv=DASHBOARD HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ FAIL - cant update configuration\n" +
				"========================================================\n" +
				"    dashboard keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /tenant/db/keys/list HTTP/1.1\" 200 219 \"-\" \"-\"\n" +
				"      ✓ success - ext Key list\n" +
				"========================================================\n" +
				"    owner tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"      ✓ get Auhtorization token\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ get token owner user (47ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/packages/delete?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=5512867be603d7e01ab1688d&code=CLIENT HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"      ✓ success - locked. cant delete package (40ms)\n" +
				"========================================================\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /tenant/acl/get?access_token=be2133a567fb7ab8809ea24d960e11389d2c293a&id=551286bce603d7e01ab1688e HTTP/1.1\" 200 5247 \"-\" \"-\"\n" +
				"      ✓ get tenant acl owner (45ms)\n" +
				"========================================================\n" +
				"      test with user 1\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user\n" +
				"========================================================\n" +
				"      test with user 2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:14 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ login test user2\n" +
				"========================================================\n" +
				"\n" +
				"  DASHBOARD UNIT Tests:\n" +
				"    products tests\n" +
				"      product\n" +
				"        add product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product exists\n" +
				"          ✓ mongo test\n" +
				"        update product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will update product (38ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/get?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"          ✓ success - product/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"PUT /product/update?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"          ✓ mongo test\n" +
				"        delete product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=aaaabbbbccccdddd HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will add product again\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc8 HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"          ✓ success - will delete product\n" +
				"          ✓ mongo test\n" +
				"        list product tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"GET /product/list HTTP/1.1\" 200 170 \"-\" \"-\"\n" +
				"          ✓ success - will list product\n" +
				"      package\n" +
				"        add package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add package, no locked product -> acl will be ignored for dashboard's env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will add another package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:14 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 392 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /product/packages/add?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - package exists\n" +
				"        get prod package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASIC HTTP/1.1\" 200 137 \"-\" \"-\"\n" +
				"          ✓ success - product/packages/get\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TPROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong package Code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/get?productCode=TROD&packageCode=TPROD_BASC HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - product/packages/get - wrong product Code\n" +
				"        update package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid env code in acl\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will update package, acl will be ignored\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?code=BASIC2 HTTP/1.1\" 200 390 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=55375fc26aa74450771a1513&code=BASIC HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong product id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /product/packages/update?id=5a65fb8e3a0d511af4a85cc7&code=BASI2 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"        delete package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=PACKA HTTP/1.1\" 200 58 \"-\" \"-\"\n" +
				"          ✓ success - will delete package\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASI4 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"          ✓ fail - cannot delete package being used by current key\n" +
				"          ✓ mongo test\n" +
				"        list package tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /product/packages/list?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"          ✓ success - will list package\n" +
				"      mongo check db\n" +
				"        ✓ asserting product record\n" +
				"    tenants tests\n" +
				"      tenant\n" +
				"        add tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to client by default\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant and set type to product and tag to testing\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ fail - tenant exists\n" +
				"          ✓ mongo test\n" +
				"        update tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 197 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant (58ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=5a65fb8f3a0d511af4a85cca HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will update tenant type and tag\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/update?id=aaaabbdd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"        delete tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete?id=aaaabdddd HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - invalid tenant id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/delete/?id=5a65fb8f3a0d511af4a85cc9 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"          ✓ success - will delete tenant\n" +
				"        list tenant tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list HTTP/1.1\" 200 4829 \"-\" \"-\"\n" +
				"          ✓ success - will get empty list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"          ✓ success - will add tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/list?type=client HTTP/1.1\" 200 610 \"-\" \"-\"\n" +
				"          ✓ succeess - will list tenants of type client only\n" +
				"      oauth\n" +
				"        add oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/get?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 366 \"-\" \"-\"\n" +
				"          ✓ success - will get tenant containing oauth\n" +
				"        update oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"PUT /tenant/oauth/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"DELETE /tenant/oauth/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth\n" +
				"        list oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"POST /tenant/oauth/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:15 +0000] \"GET /tenant/oauth/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 133 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth object\n" +
				"      oauth users\n" +
				"        add oauth users tests\n" +
				"Error @ hash: hash iterations set to [1024] which is greater than 32 => hash iteration reset to 12\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add oauth user (475ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"POST /tenant/oauth/users/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        update oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will update oauth users (489ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - will update oauth users without password\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=22d2cb5fc04ce51e06000001 HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - user does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:16 +0000] \"PUT /tenant/oauth/users/update?id=5a65fb8f3a0d511af4a85ccb&uId=invalid HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid userid given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/oauth/users/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/oauth/users/update/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 111 \"-\" \"-\"\n" +
				"          ✓ fail - userid already exist in another account (484ms)\n" +
				"        delete oauth tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete?id=5a65fb8f3a0d511af4a85ccb&uId=abcde HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will delete oauth user\n" +
				"        list oauth users tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get oauth users\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/oauth/users/delete/?id=5a65fb8f3a0d511af4a85ccb&uId=5a65fb903a0d511af4a85ccc HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"          ✓ success - will remove oauth user\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/oauth/users/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 201 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"      applications\n" +
				"        add applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/ HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"        update applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will update application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=fdsffsd HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: fdsffsd\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid product code given\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"          ✓ fail - invalid package code given\n" +
				"          ✓ mongo test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will clear application acl\n" +
				"        delete applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85cce HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will delete application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=fdfdsfs HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"        list applications tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will get empty object\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will add application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add/?id=55375fc26aa74450771a1513 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"          ✓ fail - cant add application - wrong id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/list/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 191 \"-\" \"-\"\n" +
				"          ✓ success - will list applications\n" +
				"      application keys\n" +
				"        add application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb8f3a0d511af4a85ccb&appId=xxxx HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"          ✓ fail - app id not found\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb HTTP/1.1\" 200 108 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        delete application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=3902acc0b5e732bdbc80844df6fe6ceb HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"          ✓ success - will delete key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gdsgsfds HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"        list application keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"          ✓ success - will add key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"GET /tenant/application/key/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ success - will list key\n" +
				"      application ext keys\n" +
				"        add application ext keys 1\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=0243306942ef6a1d8856bbee217daabb HTTP/1.1\" 200 123 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test for key\n" +
				"        add application ext keys 2\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/add?id=5a65fb913a0d511af4a85cd0 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb913a0d511af4a85cd0&appId=5a65fb913a0d511af4a85cd1&key=7fe720a14a451365d5b6861df7321c2d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add two external keys (using locked product) but only one with dashboard access (120ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add an external key for DEV environment using its corresponding encryption key (tenant using new acl)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - trying to add an external key for an environment that does not exist\n" +
				"        update application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:17 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DASHBOARD HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13&extKeyEnv=DEV HTTP/1.1\" 200 126 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/ext/update/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test. 1\n" +
				"        delete application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will delete ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=hjghjvbhgj&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key value\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 120 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"          ✓ mongo test\n" +
				"        list application ext keys\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 325 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=fffdfs HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - wrong key, will return empty result\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will add ext key to STG (60ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 632 \"-\" \"-\"\n" +
				"          ✓ success - will list ext key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/ext/list/?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 316 \"-\" \"-\"\n" +
				"          ✓ success - will list ext keys that contain an ext key with dashboard access\n" +
				"      application config\n" +
				"        update application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration (empty config)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"          ✓ success - will update configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=gfdgdf HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: gfdgdf\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /tenant/application/key/config/update?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"          ✓ fail - invalid environment provided\n" +
				"          ✓ mongo test\n" +
				"        list application config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=f09b390f051b75c09123fea2e1d9df13 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - will list configuration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /tenant/application/key/config/list?id=5a65fb8f3a0d511af4a85ccb&appId=5a65fb913a0d511af4a85ccf&key=jjjjjjkkkkkk HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ fail - wrong key: jjjjjjkkkkkk\n" +
				"      Removal of automatically created dashboard tenant keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd2&appId=5a65fb923a0d511af4a85cd3&key=fc86a9967250133c8ae98d07e4a1d93d HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/delete?id=5a65fb923a0d511af4a85cd2 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when tenant gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd4 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5&key=3250d38fdbfa18a456f42da15ca6bcfa HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/delete?id=5a65fb923a0d511af4a85cd4&appId=5a65fb923a0d511af4a85cd5 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when application gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd6 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /tenant/application/key/delete?id=5a65fb923a0d511af4a85cd6&appId=5a65fb923a0d511af4a85cd7&key=07e3d20295e883e673af5f50431c2fb8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when key gets deleted\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/add HTTP/1.1\" 200 56 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/add?id=5a65fb923a0d511af4a85cd8 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/add?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /tenant/application/key/ext/delete?id=5a65fb923a0d511af4a85cd8&appId=5a65fb923a0d511af4a85cd9&key=b30f2b2b18d6919e0cb164d5e02c380c HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will automatically delete dashboard key when external key gets deleted\n" +
				"      mongo check db\n" +
				"        ✓ asserting tenant record\n" +
				"\n" +
				"  DASHBOARD Integration Tests:\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"    ✓ get Main Auhtorization token\n" +
				"    environment tests\n" +
				"      get environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=dev HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/code\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 2047 \"-\" \"-\"\n" +
				"        ✓ success - get environment/id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?id=qwrr HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/?code=freeww HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - Unable to get the environment records\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/ HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - no id or code provided\n" +
				"      listing environments to initiate templates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"GET /environment/list HTTP/1.1\" 200 3957 \"-\" \"-\"\n" +
				"        ✓ success - will get environments\n" +
				"      add environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add STG environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add PROD environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testKubRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerLocal environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will add testDockerRemote environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 177 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"POST /environment/add HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - environment exists\n" +
				"        ✓ mongo test\n" +
				"      update environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will update environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"PUT /environment/update?id=aaaabbbbccc HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"        ✓ mongo test\n" +
				"      delete environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"        ✓ fail - missing params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=aaaabbcdddd HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"        ✓ fail - invalid environment id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:18 +0000] \"DELETE /environment/delete?id=5a65fb923a0d511af4a85cdc HTTP/1.1\" 200 54 \"-\" \"-\"\n" +
				"        ✓ success - will delete environment\n" +
				"        ✓ mongo test\n" +
				"      list environment tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 13191 \"-\" \"-\"\n" +
				"        ✓ success - will get 3 environments\n" +
				"        ✓ success - will manually add environment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/list HTTP/1.1\" 200 15200 \"-\" \"-\"\n" +
				"        ✓ success - will list environment\n" +
				"      Get environment profile tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /environment/profile HTTP/1.1\" 200 315 \"-\" \"-\"\n" +
				"        ✓ success - will get environment profile\n" +
				"    login tests\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - did not specify environment code, old acl\n" +
				"      ✓ success - did not specify environment code, new acl\n" +
				"    testing settings for logged in users\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:19 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - should work for logged in users\n" +
				"      settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get HTTP/1.1\" 200 103 \"-\" \"-\"\n" +
				"        ✓ fail - user not logged in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/get?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 20591 \"-\" \"-\"\n" +
				"        ✓ success - will get tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"        ✓ success - will update tenant\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 52 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"GET /settings/tenant/oauth/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"DELETE /settings/tenant/oauth/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"PUT /settings/tenant/oauth/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 55 \"-\" \"-\"\n" +
				"        ✓ success - will return oauth obj\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:19 +0000] \"POST /settings/tenant/oauth/users/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 59 \"-\" \"-\"\n" +
				"        ✓ success - will add oauth user (465ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/oauth/users/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will update oauth users (485ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/oauth/users/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&uId=5a65fb933a0d511af4a85ced HTTP/1.1\" 200 61 \"-\" \"-\"\n" +
				"        ✓ success - will delete oauth user\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/oauth/users/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will get oauth users\n" +
				"        ✓ success - will list applications\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393 HTTP/1.1\" 200 3341 \"-\" \"-\"\n" +
				"        ✓ success - will get empty object\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/add?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 100 \"-\" \"-\"\n" +
				"        ✓ success - will add key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68 HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"        ✓ success - will list key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/add/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will add ext key for STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/ext/update/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401&extKeyEnv=STG HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /settings/tenant/application/key/ext/delete/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete ext key STG\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/ext/list/?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - will list ext key\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /settings/tenant/application/key/config/update?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will update configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /settings/tenant/application/key/config/list?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"        ✓ success - will list configuration\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /settings/tenant/application/key/delete?access_token=9eccdde555184ee084f1ff88067ecdfea3df4393&appId=5550b473373137a130ebbb68&key=68b1e88e170bfdcf385235d19edc2401 HTTP/1.1\" 200 304 \"-\" \"-\"\n" +
				"        ✓ success - will delete key\n" +
				"    platforms tests\n" +
				"      list platforms\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list?env=DEV HTTP/1.1\" 200 236 \"-\" \"-\"\n" +
				"        ✓ success - will list platforms and available certificates\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /environment/platforms/list HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change selected driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/driver/changeSelected HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ success - will change deployer type\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/type/change?env=DEV HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"        ✓ fail - missing required params\n" +
				"      update deployer type\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/platforms/deployer/update?env=QA HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"        ✓ fail - update change deployer type (84ms)\n" +
				"    hosts tests\n" +
				"      list Hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 946 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"        ✓ mongo - empty the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 331 \"-\" \"-\"\n" +
				"        ✓ success - will get an empty list\n" +
				"        ✓ mongo - fill the hosts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/list?env=dev HTTP/1.1\" 200 786 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"      return environments where a service is deployed\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=swaggersample HTTP/1.1\" 200 808 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has more than 1 env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=dashboard HTTP/1.1\" 200 860 \"-\" \"-\"\n" +
				"        ✓ success - will get the env list in case the service has one env\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /services/env/list?service=noService HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - service doesn't exist\n" +
				"      list Controllers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /hosts/awareness?env=dev HTTP/1.1\" 200 6873 \"-\" \"-\"\n" +
				"        ✓ success - will get hosts list\n" +
				"    node management tests\n" +
				"      list cloud nodes \n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /cloud/nodes/list?env=qa HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"        ✓ fail - will get nodes list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"POST /cloud/nodes/add HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ fail - will add node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/update?env=qa&nodeId=nodeTest HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"        ✓ fail - will update node\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /cloud/nodes/tag HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"        ✓ fail - will tag node\n" +
				"22 Jan 14:56:20 - { Error: getaddrinfo ENOTFOUND kubernetes.default kubernetes.default:443\n" +
				"    at errnoException (dns.js:28:10)\n" +
				"    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)\n" +
				"  code: 'ENOTFOUND',\n" +
				"  errno: 'ENOTFOUND',\n" +
				"  syscall: 'getaddrinfo',\n" +
				"  hostname: 'kubernetes.default',\n" +
				"  host: 'kubernetes.default',\n" +
				"  port: 443 }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /cloud/nodes/remove?env=qa&nodeId=nodeId HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"        ✓ fail - will remove node\n" +
				"    change tenant security key\n" +
				"      will change tenant security key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"PUT /environment/key/update?access_token=0b64caa5c10ddae4cfff46c8bd6e11311a16e767&id=5a65fb923a0d511af4a85cda HTTP/1.1\" 200 6001 \"-\" \"-\"\n" +
				"        ✓ success - change security key (63ms)\n" +
				"      fail - logged in user is not the owner of the app\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"        ✓ get Auhtorization token\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:20 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"        ✓ Login first\n" +
				"    prevent operator from removing tenant/application/key/extKey/product/package he is currently logged in with\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/delete?id=10d2cb5fc04ce51e06000001 HTTP/1.1\" 200 152 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting tenant\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001 HTTP/1.1\" 200 157 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting application\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:20 +0000] \"DELETE /tenant/application/key/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 149 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting key\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /tenant/application/key/ext/delete?id=10d2cb5fc04ce51e06000001&appId=30d2cb5fc04ce51e06000001&key=d1eaaf5fdc35c11119330a8a0273fee9 HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting extKey\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/delete?id=5a65fb8e3a0d511af4a85cc7 HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting product\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /product/packages/delete?id=5a65fb8e3a0d511af4a85cc7&code=BASIC HTTP/1.1\" 200 153 \"-\" \"-\"\n" +
				"      ✓ success - prevent from deleting package\n" +
				"\n" +
				"  DASHBOARD UNIT Tests: Services & Daemons\n" +
				"    services tests\n" +
				"      list services test\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 9710 \"-\" \"-\"\n" +
				"        ✓ success - will get services list\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /services/list HTTP/1.1\" 200 3914 \"-\" \"-\"\n" +
				"        ✓ success - will get services list specific services\n" +
				"      update service settings tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /services/settings/update?id=dummyServiceId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"        ✓ success - will update settings\n" +
				"    daemons/groups tests\n" +
				"      daemons tests\n" +
				"        list daemon tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list?getGroupConfigs=true HTTP/1.1\" 200 164 \"-\" \"-\"\n" +
				"          ✓ success - list all daemons with group configurations of each\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/list HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"          ✓ success - list only specified daemons\n" +
				"      group configuration tests\n" +
				"        add group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - add new group config\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 134 \"-\" \"-\"\n" +
				"          ✓ fail - group config already exists\n" +
				"        update group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=123%3A%3A%3A321 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - invalid id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"        delete group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"          ✓ fail - missing required param\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf5 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - deletes group\n" +
				"        list group config tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 230 \"-\" \"-\"\n" +
				"          ✓ success - list all group configs\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/list HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"          ✓ success - list only specified group configs\n" +
				"        update service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /daemons/groupConfig/add HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - service configuration updated successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - delete service configuration successfully\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"        list service configuration tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/serviceConfig/update?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=someJob HTTP/1.1\" 200 66 \"-\" \"-\"\n" +
				"          ✓ success - lists service configuration of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/serviceConfig/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"        update tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"          ✓ success - updates test group\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /daemons/groupConfig/tenantExtKeys/update?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fails - missing required params\n" +
				"        list tenant external keys tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=anotherJob HTTP/1.1\" 200 347 \"-\" \"-\"\n" +
				"          ✓ success - lists tenant external keys of specified job\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 110 \"-\" \"-\"\n" +
				"          ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /daemons/groupConfig/tenantExtKeys/list?id=5a65fb953a0d511af4a85cf6&jobName=wrongJob HTTP/1.1\" 200 92 \"-\" \"-\"\n" +
				"          ✓ fail - job does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /daemons/groupConfig/delete?id=5a65fb953a0d511af4a85cf6 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"\n" +
				"  Docker Certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /login HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"    upload certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=ca HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upload docker certificate (87ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: driver\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&driver=local&platform=docker&certType=cert HTTP/1.1\" 200 264 \"-\" \"-\"\n" +
				"      ✓ fail - missing params: envCode\n" +
				"      ✓ mongo test - verify docker certificate exists in mongo\n" +
				"    remove certificate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success = will remove docker certificate (metadata includes serveral drivers and several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DASHBOARD&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver but several environments)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will remove docker certificate (metadata includes one driver for one environment)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&driverName=local HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=5a65fb953a0d511af4a85cf7&env=DEV&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - docker certificate does not exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"DELETE /environment/platforms/cert/delete?id=123%3A%3A%3A321&env=DEV&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"      ✓ mongo test - verify certificate has been deleted from mongo\n" +
				"    choose existing certificates tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert.pem&envCode=DEV&platform=docker&driver=local&certType=cert HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /environment/platforms/cert/upload?filename=test_cert_2.pem&envCode=DEV&platform=docker&driver=local&certType=key HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for local\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=remote HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will choose existing docker certificates for docker remote\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"      ✓ fail - invalid certificate id provided\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /environment/platforms/cert/choose?env=STG&platform=docker&driverName=local HTTP/1.1\" 200 116 \"-\" \"-\"\n" +
				"      ✓ fail - one or more certificates do not exist\n" +
				"      ✓ mongo test - verify the docker certificates exist and include the right drivers and environments in their metadata\n" +
				"\n" +
				"  Testing Custom Registry Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:21 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - will add new plugged entry as owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - entry with the same name is already plugged in environment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069 HTTP/1.1\" 200 183 \"-\" \"-\"\n" +
				"      ✓ success - will add new unplugged entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - entry with the same name is not plugged\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"POST /customRegistry/add?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 255 \"-\" \"-\"\n" +
				"      ✓ fail - adding entry record with additional properties\n" +
				"    Testing get custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&name=c1 HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"      ✓ success - get c1 entry by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/get?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 125 \"-\" \"-\"\n" +
				"      ✓ fail - no name or id provided\n" +
				"    Testing update custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will update user1's entry as owner\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 193 \"-\" \"-\"\n" +
				"      ✓ fail - trying to plug an entry that will cause a conflict\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev&id=5a65fb953a0d511af4a85d01 HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry owned by owner as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"PUT /customRegistry/update?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard&id=5a65fb953a0d511af4a85d02 HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update entry in an environment different from the one it was created in\n" +
				"    Testing list custom registry entries\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev&start=0&end=2 HTTP/1.1\" 200 388 \"-\" \"-\"\n" +
				"      ✓ success - will list entries with pagination\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:21 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as owner, get permission set to true for all entries\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&env=dev HTTP/1.1\" 200 568 \"-\" \"-\"\n" +
				"      ✓ success - will list entries as user1, get permission set to true only for entries owned by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dashboard HTTP/1.1\" 200 566 \"-\" \"-\"\n" +
				"      ✓ success - will list entries in dashboard environment, get dev entries that are shared\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /customRegistry/list?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required fields\n" +
				"    Testing delete custom registry entry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dashboard HTTP/1.1\" 200 168 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete entry in an environment different from the one it was created it\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=e73c39ea861662efb0a6ecdc4345d357d888b069&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 145 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete owner's entry as user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /customRegistry/delete?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&id=5a65fb953a0d511af4a85d01&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete entry\n" +
				"    Testing upgrade custom registry\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade dev environment custom registry\n" +
				"      ✓ success - new custom registry entries are available\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /customRegistry/upgrade?access_token=caadafe8a5ef09aa14801ef67e319a17db84652d&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will try to upgrade again, no changes since no old schema is detected\n" +
				"\n" +
				"  Testing Resources Functionality\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 95 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - 551286bce603d7e01ab1688e [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:22 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"    Testing add resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster1 by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 143 \"-\" \"-\"\n" +
				"      ✓ fail - resource with the same name/type/category already exists\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 453 \"-\" \"-\"\n" +
				"      ✓ success - will add resource cluster2 by user1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 240 \"-\" \"-\"\n" +
				"      ✓ fail - adding resource record with additional parameters\n" +
				"    Testing get resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by id\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=cluster1 HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"      ✓ success - get cluster1 record by name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - no id or name of resource provided\n" +
				"    Testing update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - will update resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev&id=5a65fb963a0d511af4a85d0d HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update resource owned by owner as user1\n" +
				"    Testing list resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 921 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as owner, get permission set to true for cluster1 and cluster2\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=634563071c11802b5e66238aa84256f8db264730&env=dev HTTP/1.1\" 200 922 \"-\" \"-\"\n" +
				"      ✓ success - will list resources as user1, get permission set to true only for cluster2\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dashboard HTTP/1.1\" 200 472 \"-\" \"-\"\n" +
				"      ✓ success - will list resources in dashboard env as owner, get only get shared resources from dev env\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - missing required field\n" +
				"    Testing delete resource\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 452 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 105 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dashboard&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 155 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete resource in an environment different from the one it was created in\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=634563071c11802b5e66238aa84256f8db264730 HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete as user1 a resource created by owner\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?env=dev&id=5a65fb963a0d511af4a85d0f&access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will delete resource cluster3 as owner\n" +
				"    Testing upgrade resources\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/upgrade?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade resources\n" +
				"    Testing get resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/config?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"      ✓ success - will get deploy configuration for resources\n" +
				"    Testing update resources deploy config\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will add deploy config for cluster1\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/config/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    Testing list/add/edit/delete for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /resources/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to add a cluster resource of type mongo called dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to update/unplug dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /resources/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ success - trying to update driver configuration for dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"DELETE /resources/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&id=5a65fb963a0d511af4a85d11 HTTP/1.1\" 200 204 \"-\" \"-\"\n" +
				"      ✓ fail - trying to delete dash_cluster\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 1402 \"-\" \"-\"\n" +
				"      ✓ success - list resources will mark dash_cluster as sensitive\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"GET /resources/get?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=dash_cluster HTTP/1.1\" 200 485 \"-\" \"-\"\n" +
				"      ✓ success - get dash_cluster resource marked as sensitive\n" +
				"\n" +
				"  Testing Databases Functionality\n" +
				"    add environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - will add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - wil add a db and set tenantSpecific to false by default\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 113 \"-\" \"-\"\n" +
				"      ✓ fail - database already exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 121 \"-\" \"-\"\n" +
				"      ✓ fail - session already exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    update environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db and set tenantSpecific to false by default (42ms)\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:22 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update a db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - will update session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 112 \"-\" \"-\"\n" +
				"      ✓ fail - invalid cluster provided\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - invalid session params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - database does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/update?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"      ✓ mongo - testing database content\n" +
				"    delete environment db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - missing params\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=invalid HTTP/1.1\" 200 114 \"-\" \"-\"\n" +
				"      ✓ fail - invalid database name\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"      ✓ fail - session does not exist\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=urac HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete database\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /environment/dbs/delete?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev&name=session HTTP/1.1\" 200 64 \"-\" \"-\"\n" +
				"      ✓ success - delete session\n" +
				"      ✓ mongo - testing database\n" +
				"    list environment dbs\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 75 \"-\" \"-\"\n" +
				"      ✓ success - no session and no databases\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add session db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /environment/dbs/add?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 62 \"-\" \"-\"\n" +
				"      ✓ success - add urac db\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /environment/dbs/list?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 274 \"-\" \"-\"\n" +
				"      ✓ success - yes session and yes databases\n" +
				"    update environment db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - add db prefix\n" +
				"Connection To Mongo has been closed! DBTN_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /environment/dbs/updatePrefix?access_token=548905a7880a5d3f3fc964b417553c9f3ce777ee&env=dev HTTP/1.1\" 200 70 \"-\" \"-\"\n" +
				"      ✓ success - empty db prefix\n" +
				"\n" +
				"  mongo check db\n" +
				"    ✓ asserting environment record\n" +
				"\n" +
				"  Testing Catalog Functionality\n" +
				"    Testing Catalog ADD API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 241 \"-\" \"-\"\n" +
				"      ✓ Fail - Add an invalid catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"POST /catalog/recipes/add HTTP/1.1\" 200 49 \"-\" \"-\"\n" +
				"      ✓ Success - Add a valid catalog\n" +
				"    Testing Catalog LIST API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/list HTTP/1.1\" 200 3218 \"-\" \"-\"\n" +
				"      ✓ Success - List available catalogs\n" +
				"    Testing Catalog EDIT API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Edit a locked catalog\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"PUT /catalog/recipes/update?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Edit a record (56ms)\n" +
				"    Testing Catalog GET API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ fail - invalid catalog id\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/get?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 581 \"-\" \"-\"\n" +
				"      ✓ success- valid catalog id\n" +
				"    Testing Catalog DELETE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=invalidId HTTP/1.1\" 200 166 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a record that doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=58b4026e511807397f8228f5 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"      ✓ Fail - Delete a locked record\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"DELETE /catalog/recipes/delete?id=5a65fb973a0d511af4a85d12 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ Success - Delete a record\n" +
				"    Testing Catalog UPGRADE API\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /catalog/recipes/upgrade HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will upgrade recipes to follow new schema (153ms)\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting SOAJS_ENV_WORKDIR for test mode as:  ../test/coverage/instrument/\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:23 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:23 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"\"docker service rm\" requires at least 1 argument(s).\n" +
				"See 'docker service rm --help'.\n" +
				"\n" +
				"Usage:  docker service rm [OPTIONS] SERVICE [SERVICE...]\n" +
				"\n" +
				"Remove one or more services\n" +
				"    testing controller deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 1511 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:25 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=91asfeu3zgyd8czzzzn7jwaco&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller service and delete it afterwards (530ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:26 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 controller and use the main file specified in src (260ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:27 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 nginx service with static content (264ms)\n" +
				"    testing service deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4447 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:28 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=95eo88l6js8tvooq29xb247fs&mode=global HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 core service, global mode (433ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:29 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 211 \"-\" \"-\"\n" +
				"      ✓ fail - trying to deploy to an environment that is configured to be deployed manually\n" +
				"    testing daemon deployment\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4224 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:30 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=dt47a48r6dhhd5fell4km3yot&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 4225 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=1xhuxyrgc9wsn6pogrne1v71t&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 daemon that contians cmd info in its src (329ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"POST /cloud/services/soajs/deploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 115 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params\n" +
				"    testing redeploy service\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:31 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 3324 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:32 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy controller service (58ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:33 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will rebuild service (265ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:34 +0000] \"PUT /cloud/services/redeploy?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ success - will redeploy nginx and add custom ui to it (311ms)\n" +
				"    delete deployed services\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:35 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV HTTP/1.1\" 200 118 \"-\" \"-\"\n" +
				"      ✓ fail - missing required params (43ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such service - service 123123123 not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such service',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'service 123123123 not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=123123123&mode=replicated HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - service not found\n" +
				"    testing get service logs\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5832 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"22 Jan 14:56:36 - { Error: (HTTP code 404) no such container - task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found \n" +
				"    at /home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:256:17\n" +
				"    at getCause (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:286:7)\n" +
				"    at Modem.buildPayload (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:255:5)\n" +
				"    at IncomingMessage.<anonymous> (/home/travis/build/soajs/soajs.dashboard/node_modules/docker-modem/lib/modem.js:231:14)\n" +
				"    at emitNone (events.js:91:20)\n" +
				"    at IncomingMessage.emit (events.js:185:7)\n" +
				"    at endReadableNT (_stream_readable.js:974:12)\n" +
				"    at _combinedTickCallback (internal/process/next_tick.js:74:11)\n" +
				"    at process._tickDomainCallback (internal/process/next_tick.js:122:9)\n" +
				"  reason: 'no such container',\n" +
				"  statusCode: 404,\n" +
				"  json: { message: 'task 3xk3m23wg7gl5c6lk9rk5hypp/logs not found' } }\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/instances/logs?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev&taskId=3xk3m23wg7gl5c6lk9rk5hypp&serviceId= HTTP/1.1\" 200 124 \"-\" \"-\"\n" +
				"      ✓ success - getting service logs (67ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"GET /cloud/services/list?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=dev HTTP/1.1\" 200 5827 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:36 +0000] \"DELETE /cloud/services/delete?access_token=03a77026ede502e47ee6f28c10bd50107b5d2870&env=DEV&serviceId=4zuurjwbdji1e6wyhr2yxumbt&mode=replicated HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    testing autoscale deployed services\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:37 +0000] \"PUT /cloud/services/autoscale?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ set autoscaler\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:38 +0000] \"PUT /cloud/services/autoscale/config?env=dashboard HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ update environment autoscaling\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/resource?env=dev&resource=heapster&namespace=kube-system HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - check resource\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:39 +0000] \"GET /cloud/services/scale?env=dev&resource=heapster&namespace=kube-system&scale=2 HTTP/1.1\" 200 127 \"-\" \"-\"\n" +
				"      ✓ fail - scale service\n" +
				"    metrics tests\n" +
				"      get service metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:40 +0000] \"GET /cloud/metrics/services?env=DEV HTTP/1.1\" 200 25 \"-\" \"-\"\n" +
				"        ✓ success - get service metrics\n" +
				"      fail - get node metrics\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"GET /cloud/metrics/nodes?env=DEV HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"        ✓ success - get nodes metrics nodes\n" +
				"    testing plugin deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:41 +0000] \"POST /cloud/plugins/deploy HTTP/1.1\" 200 135 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing service maintence deployment\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:42 +0000] \"POST /cloud/services/maintenance HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"      ✓ fail - deploying heapster\n" +
				"    testing namespace list services \n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:43 +0000] \"GET /cloud/namespaces/list?env=dev HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - list namespaces\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /cloud/namespaces/delete?env=dev&namespaceId=soajs HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"      ✓ fail - delete namespaces\n" +
				"\n" +
				"  DASHBOARD TESTS: Continuous integration\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci HTTP/1.1\" 200 107 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?variables=true HTTP/1.1\" 200 885 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts with variables\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci?owner=soajs&variables=true HTTP/1.1\" 200 454 \"-\" \"-\"\n" +
				"    ✓ Success - list Accounts for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - activate provider (168ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?provider=travis HTTP/1.1\" 200 171 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/providers?owner=soajs HTTP/1.1\" 200 182 \"-\" \"-\"\n" +
				"    ✓ Success - list Providers for specific owner\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/provider HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ Success - deactivate provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"POST /ci/recipe HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - add new recipe\n" +
				"    ✓ success - get recipe record from database\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - edit recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/recipe/download?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ Success - download recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"DELETE /ci/recipe?id=5a65fbac8820b36de72d7cb8 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"    ✓ success - delete recipe\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/script/download HTTP/1.1\" 200 - \"-\" \"-\"\n" +
				"    ✓ success - download script\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/status?id=1234&provider=travis&owner=soajs&enable=true HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - Enable Repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 122 \"-\" \"-\"\n" +
				"    ✓ Success - get repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"PUT /ci/settings?id=12464664&provider=travis&owner=soajs HTTP/1.1\" 200 187 \"-\" \"-\"\n" +
				"    ✓ Success - change repo settings\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /ci/repo/remote/config?port=80 HTTP/1.1\" 200 132 \"-\" \"-\"\n" +
				"    ✓ Success - getRepoYamlFile\n" +
				"\n" +
				"  testing hosts deployment\n" +
				"***************************************************************\n" +
				"* Setting CD functionality\n" +
				"***************************************************************\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:44 +0000] \"GET /authorization HTTP/1.1\" 200 83 \"-\" \"-\"\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - 10d2cb5fc04ce51e06000001 [22/Jan/2018:14:56:44 +0000] \"POST /token HTTP/1.1\" 200 158 \"-\" \"-\"\n" +
				"Deleting previous deployments ...\n" +
				"bljs1s50yk4nlyemvlnfibcz5\n" +
				"fa6afebbb75d\n" +
				"243542d8fe34\n" +
				"746733a0c6e3\n" +
				"    testing service deployment\n" +
				"      ✓ update catalog recipe (47ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:46 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog 1 (1293ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:47 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog2 (1040ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:48 +0000] \"POST /cloud/services/soajs/deploy?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 57 \"-\" \"-\"\n" +
				"      ✓ success - deploy 1 service using catalog3 (278ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call to cd/deploy, nothing should happen (64ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=invalid HTTP/1.1\" 200 141 \"-\" \"-\"\n" +
				"      ✓ fail - mimic call for cd/deploy of controller in dev\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev (85ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific entry for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (65ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd again with specific version for controller\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (165ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 295 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ get ledger (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"PUT /cd/ledger/read?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 24 \"-\" \"-\"\n" +
				"      ✓ mark all ledger entries as read\n" +
				"      ✓ trigger catalog update\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/updates?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 5354 \"-\" \"-\"\n" +
				"      ✓ get updates (311ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ configure cd for automatic controller update (50ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"POST /cd/deploy?deploy_token=myGitToken HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ mimic call for cd/deploy of controller in dev again (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:49 +0000] \"GET /cd/ledger?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 578 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 283 \"-\" \"-\"\n" +
				"      ✓ calling take action on redeploy (69ms)\n" +
				"Connection To Mongo has been closed! test_urac\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cloud/services/list?access_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774&env=stg HTTP/1.1\" 200 4925 \"-\" \"-\"\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"PUT /cd/action?deploy_token=a32e16ef3462b119f0d0cbd145f0e1baae60f774 HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ calling take action on rebuild (62ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"GET /cd HTTP/1.1\" 200 237 \"-\" \"-\"\n" +
				"      ✓ get CD\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:50 +0000] \"POST /cd/pause HTTP/1.1\" 200 27 \"-\" \"-\"\n" +
				"      ✓ pause CD\n" +
				"Deleting deployments and cleaning up...\n" +
				"2qkaeh3l4yc96z8j6rcc01ds5\n" +
				"6kt2aneyi9w8kna1d6ueg7jjb\n" +
				"9bk9yr1r656n1n5y78coe88cv\n" +
				"b9aec4c9e4c7\n" +
				"5502e2fb79be\n" +
				"\n" +
				"  DASHBOARD Tests: Git Accounts\n" +
				"    github login tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ fail - wrong pw (124ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:51 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 131 \"-\" \"-\"\n" +
				"      ✓ fail - wrong provider\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"      ✓ success - will login - personal private acc (115ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 106 \"-\" \"-\"\n" +
				"      ✓ fail - cannot login - Organization acc - already exists\n" +
				"    github accounts tests\n" +
				"      list accounts\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/accounts/list HTTP/1.1\" 200 342 \"-\" \"-\"\n" +
				"        ✓ success - will list\n" +
				"    personal private acc\n" +
				"      github getRepos tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getRepos?id=123&provider=github&page=1&per_page=50 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will getRepos\n" +
				"      github getBranches tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&provider=github&name=soajsTestAccount%2FtestMulti&type=repo HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ success - will get Branches repo\n" +
				"      github repo tests\n" +
				"        repo activate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will activate multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/repo/activate?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ fail - cannot activate again personal multi repo\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getBranches?id=123&name=sample__Single&type=service HTTP/1.1\" 200 101 \"-\" \"-\"\n" +
				"          ✓ fail - cannot get Branches for service - wrong name\n" +
				"        repo sync tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/sync?id=123 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will sync repo - no change\n" +
				"        repo deactivate tests\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"PUT /gitAccounts/repo/deactivate?id=123&owner=soajsTestAccount&repo=test.success1 HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"          ✓ success - will deactivate single repo\n" +
				"    pull from a repo in github or bitbucket\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ success - the user is logged in and provided an existing repo and file path\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=michel-el-hajj&repo=soajs.dashboard&filepath=config.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the user isn't logged in\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.unknown&filepath=config.js&branch=develop&serviceName=unknown&env=dev&type=service HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"      ✓ fail - the repo doesn't exist\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"GET /gitAccounts/getYaml?owner=soajs&repo=soajs.dashboard&filepath=configs.js&branch=develop&serviceName=dashboard&env=dashboard&type=service HTTP/1.1\" 200 50 \"-\" \"-\"\n" +
				"      ✓ fail - wrong file path\n" +
				"    personal public acc\n" +
				"      login\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong personal public acc name\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - personal public acc (155ms)\n" +
				"    organization public acc\n" +
				"      login & logout\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 109 \"-\" \"-\"\n" +
				"        ✓ fail - wrong Organization acc\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"POST /gitAccounts/login HTTP/1.1\" 200 128 \"-\" \"-\"\n" +
				"        ✓ success - will login - Organization acc (117ms)\n" +
				"::ffff:127.0.0.1 - - [22/Jan/2018:14:56:52 +0000] \"DELETE /gitAccounts/logout?username=soajs&id=123&provider=github HTTP/1.1\" 200 98 \"-\" \"-\"\n" +
				"        ✓ will logout org account\n" +
				"\n" +
				"\n" +
				"  495 passing (46s)\n" +
				"\n" +
				"\n" +
				"[4mRunning \"storeCoverage\" task[24m\n" +
				"\n" +
				"[4mRunning \"makeReport\" task[24m\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"File                                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				" __root__/                               |    96.67 |       70 |    96.64 |    96.67 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.63 |    66.67 |    96.64 |    96.63 |... 5,2086,2087 |\n" +
				" lib/catalog/                            |    92.05 |    71.93 |      100 |    92.05 |                |\n" +
				"  index.js                               |    92.05 |    71.93 |      100 |    92.05 |... 209,282,304 |\n" +
				" lib/cd/                                 |    87.24 |     76.6 |    93.16 |    87.74 |                |\n" +
				"  helper.js                              |    86.55 |    77.64 |    85.71 |    86.89 |... 825,826,828 |\n" +
				"  index.js                               |    88.38 |    71.05 |    96.34 |    89.12 |... 537,556,557 |\n" +
				" lib/ci/                                 |    90.38 |    68.42 |    98.84 |    90.38 |                |\n" +
				"  index.js                               |    90.38 |    68.42 |    98.84 |    90.38 |... 549,618,762 |\n" +
				" lib/cloud/autoscale/                    |      100 |    93.88 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |    93.88 |      100 |      100 |                |\n" +
				" lib/cloud/deploy/                       |    84.79 |    75.64 |    96.91 |    84.53 |                |\n" +
				"  helper.js                              |    89.67 |    86.19 |     96.3 |    89.37 |... 504,505,506 |\n" +
				"  index.js                               |    82.48 |    70.77 |    97.14 |    82.29 |... 933,934,936 |\n" +
				" lib/cloud/maintenance/                  |    97.67 |      100 |       95 |    97.56 |                |\n" +
				"  index.js                               |    97.67 |      100 |       95 |    97.56 |             52 |\n" +
				" lib/cloud/metrics/                      |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/namespaces/                   |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |      100 |      100 |      100 |      100 |                |\n" +
				" lib/cloud/nodes/                        |    98.57 |    93.33 |    97.56 |    98.57 |                |\n" +
				"  index.js                               |    98.57 |    93.33 |    97.56 |    98.57 |             43 |\n" +
				" lib/cloud/services/                     |    95.65 |    91.49 |      100 |    97.06 |                |\n" +
				"  index.js                               |    95.65 |    91.49 |      100 |    97.06 |          51,58 |\n" +
				" lib/customRegistry/                     |    95.04 |       78 |      100 |    95.04 |                |\n" +
				"  index.js                               |    95.04 |       78 |      100 |    95.04 |... 276,454,467 |\n" +
				" lib/daemons/                            |    94.74 |    84.21 |    98.73 |    94.74 |                |\n" +
				"  helper.js                              |    91.94 |    80.77 |      100 |    91.94 | 40,48,52,61,73 |\n" +
				"  index.js                               |    95.68 |    85.51 |    98.51 |    95.68 |... 150,185,187 |\n" +
				" lib/environment/                        |    85.67 |    72.39 |       91 |    87.55 |                |\n" +
				"  helper.js                              |    84.85 |    75.44 |      100 |    84.85 |... 205,206,241 |\n" +
				"  index.js                               |    83.25 |    67.23 |    87.37 |    83.39 |... 7,1309,1313 |\n" +
				"  status.js                              |    83.76 |    67.13 |      100 |    85.02 |... 634,639,703 |\n" +
				"  statusRollback.js                      |    88.89 |    81.05 |      100 |     89.6 |... 206,219,237 |\n" +
				"  statusUtils.js                         |    88.32 |     74.7 |       95 |    92.91 |... 9,1258,1259 |\n" +
				" lib/git/                                |    86.62 |    68.68 |    97.48 |    86.77 |                |\n" +
				"  configGenerator.js                     |    87.04 |     66.9 |       95 |    87.04 |... 364,367,387 |\n" +
				"  helper.js                              |    85.44 |    69.46 |    96.97 |    85.44 |... 729,739,742 |\n" +
				"  index.js                               |    87.44 |    68.95 |    98.03 |     87.8 |... 44,945,1005 |\n" +
				" lib/hosts/                              |    81.82 |    65.41 |    94.34 |    81.82 |                |\n" +
				"  helper.js                              |    89.86 |    84.51 |      100 |    89.86 |... ,97,112,116 |\n" +
				"  index.js                               |    76.64 |    43.55 |    92.86 |    76.64 |... 205,206,215 |\n" +
				" lib/product/                            |    93.68 |    74.34 |      100 |    93.68 |                |\n" +
				"  index.js                               |    93.68 |    74.34 |      100 |    93.68 |... 525,526,552 |\n" +
				" lib/resources/                          |    90.57 |    77.33 |      100 |    90.57 |                |\n" +
				"  index.js                               |    90.57 |    77.33 |      100 |    90.57 |... 437,456,469 |\n" +
				" lib/services/                           |    89.58 |    85.71 |    92.86 |    89.58 |                |\n" +
				"  index.js                               |    89.58 |    85.71 |    92.86 |    89.58 | 23,24,35,36,40 |\n" +
				" lib/swagger/                            |    95.83 |    84.29 |      100 |    95.83 |                |\n" +
				"  index.js                               |    95.83 |    84.29 |      100 |    95.83 |... 192,261,262 |\n" +
				" lib/tenant/                             |    95.96 |    78.79 |      100 |    95.96 |                |\n" +
				"  index.js                               |    95.96 |    78.79 |      100 |    95.96 |... 3,1213,1268 |\n" +
				" models/                                 |    86.02 |    60.76 |    94.12 |    86.02 |                |\n" +
				"  git.js                                 |     87.5 |       75 |    83.33 |     87.5 |    49,53,57,61 |\n" +
				"  host.js                                |    94.74 |       50 |      100 |    94.74 |             42 |\n" +
				"  mongo.js                               |    84.44 |    59.42 |      100 |    84.44 |... 266,267,271 |\n" +
				" schemas/                                |      100 |      100 |      100 |      100 |                |\n" +
				"  acl.js                                 |      100 |      100 |      100 |      100 |                |\n" +
				"  catalog.js                             |      100 |      100 |      100 |      100 |                |\n" +
				"  cb.js                                  |      100 |      100 |      100 |      100 |                |\n" +
				"  cdOptions.js                           |      100 |      100 |      100 |      100 |                |\n" +
				"  customRegistry.js                      |      100 |      100 |      100 |      100 |                |\n" +
				"  environmentSchema.js                   |      100 |      100 |      100 |      100 |                |\n" +
				"  resource.js                            |      100 |      100 |      100 |      100 |                |\n" +
				"  resourceDeployConfig.js                |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceConfig.js                       |      100 |      100 |      100 |      100 |                |\n" +
				"  serviceSchema.js                       |      100 |      100 |      100 |      100 |                |\n" +
				" utils/                                  |    91.67 |    86.54 |      100 |    92.54 |                |\n" +
				"  errors.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  utils.js                               |    91.43 |    86.54 |      100 |    92.31 |... 148,149,161 |\n" +
				" utils/drivers/ci/                       |    91.23 |    70.83 |    93.75 |    92.73 |                |\n" +
				"  index.js                               |    89.58 |       50 |    92.86 |     91.3 | 22,162,163,164 |\n" +
				"  utils.js                               |      100 |    85.71 |      100 |      100 |                |\n" +
				" utils/drivers/ci/drone/                 |     96.2 |    82.47 |      100 |     96.2 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.17 |    82.47 |      100 |    96.17 |... 435,444,489 |\n" +
				" utils/drivers/ci/travis/                |    96.95 |       80 |     96.3 |    96.95 |                |\n" +
				"  config.js                              |      100 |      100 |      100 |      100 |                |\n" +
				"  index.js                               |    96.94 |       80 |     96.3 |    96.94 |... 214,215,549 |\n" +
				" utils/drivers/git/                      |    96.97 |       75 |      100 |    96.97 |                |\n" +
				"  index.js                               |    96.97 |       75 |      100 |    96.97 |             29 |\n" +
				" utils/drivers/git/bitbucket/            |     87.5 |    64.54 |       95 |     87.5 |                |\n" +
				"  helper.js                              |    84.91 |    65.35 |    91.43 |    84.91 |... 360,382,383 |\n" +
				"  index.js                               |    91.15 |     62.5 |    97.78 |    91.15 |... 187,189,190 |\n" +
				" utils/drivers/git/bitbucket_enterprise/ |    88.84 |    64.08 |    95.52 |    88.84 |                |\n" +
				"  helper.js                              |    85.09 |     62.3 |     93.1 |    85.09 |... 241,263,264 |\n" +
				"  index.js                               |    92.73 |    66.67 |    97.37 |    92.73 |... ,70,114,200 |\n" +
				" utils/drivers/git/github/               |    86.38 |    76.55 |    91.14 |    86.38 |                |\n" +
				"  helper.js                              |    86.21 |    77.06 |    94.87 |    86.21 |... 323,341,342 |\n" +
				"  index.js                               |    86.67 |       75 |     87.5 |    86.67 |... ,98,115,177 |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"All files                                |    90.17 |    74.42 |     96.6 |    90.58 |                |\n" +
				"-----------------------------------------|----------|----------|----------|----------|----------------|\n" +
				"\n" +
				"\n" +
				"[4mRunning \"coveralls:your_target\" (coveralls) task[24m\n" +
				"[32m>> [39mSuccessfully submitted coverage results to coveralls\n" +
				"\n" +
				"[32mDone, without errors.[39m\n" +
				"\n" +
				"travis_time:end:177f2130:start=1516632824205360139,finish=1516633017744444809,duration=193539084670\n" +
				"[0K\n" +
				"[32;1mThe command \"grunt coverage\" exited with 0.[0m\n" +
				"\n" +
				"Done. Your build exited with 0.\n"
			}
		};
		return cb();
	}
	
	function downloadProviderRecipe(currentScope, oneRecipeId){
		if(currentScope.myBrowser === 'safari'){
			$window.alert("The Downloader is not compatible with Safari, please choose another browser.");
			return null;
		}
		
		currentScope.providerRecipes.forEach(function(myRecipe){
			if(myRecipe._id.toString() === oneRecipeId.toString()){
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'get',
					routeName: '/dashboard/ci/recipe/download',
					headers: {
						"Accept": "application/zip"
					},
					responseType: 'arraybuffer',
					params: {
						'id': oneRecipeId.toString()
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						currentScope.form.displayAlert('danger', error.message);
					}
					else {
						openSaveAsDialog(myRecipe.name + ".zip", response, "application/zip");
					}
				});
			}
		});
	}
	
	function getRepoRecipeFromBranch(currentScope, gitAccount, provider, repo, providerRecipes, cb){
		getServiceBranches(currentScope, {
			gitAccount: gitAccount,
			repo: repo,
			cd:false
		}, function(gitBranchResponse){
			var newInput = {
				'name': 'branch',
				'label': 'Branch',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select a branch from your repository to load the associated Continuous Integration Recipe.',
				'onAction': function(id, data, form){
					getRepoCIremoteRecipe(currentScope, {
						provider: provider.provider,
						owner: gitAccount.owner,
						repo: repo.name,
						branch: data
					}, function(response){
						var fileContent, fileSHA, message;
						var type = "warning";
						
						if(response && response.sha){
							fileContent = response.file;
							fileSHA = response.sha;
							message = "The Recipe in your repository is custom made and does not match any of the provider's recipes.";
							providerRecipes[provider.provider].forEach(function(oneRecipe){
								if(oneRecipe.sha === fileSHA){
									message = "The Recipe in your repository matches the provider's recipe named [ " + oneRecipe.name + " ].";
									type = "info";
								}
							});
						}
						else{
							message = "No Recipe found in your repository, you can download any of the above recipes from the provider's.";
						}
						
						var customRecipe = {
							_id: "custom",
							provider: provider.provider,
							name: "Custom Recipe Detected",
							sha: fileSHA,
							recipe: fileContent
						};
						
						var match = false;
						providerRecipes[provider.provider].forEach(function(recipes){
							if(recipes._id === customRecipe._id){
								recipes = customRecipe;
								match = true;
							}
						});
						
						if(!match){
							providerRecipes[provider.provider].push(customRecipe);
						}
						
						message = "<alert class='w100 c-both' type='" + type + "'><span>" + message + "</span>";
						if(response && response.sha){
							message += "<a class='btn btn-default f-right' onclick='expandCustomRecipeContent(); return false;' id='customRepoRecipeContentBTN' style='position: relative; top: -6px;'>Show Recipe Content</a>";
						}
						message += "</alert><br />";
						
						if(response && response.sha){
							message +=  "<div><pre id='customRepoRecipeContent' style='width:100%; display:none;'><code class='yaml' >" + fileContent + "</code></pre></div>";
						}
						
						form.entries.forEach(function(oneFormEntry){
							if(oneFormEntry.type === 'accordion' && oneFormEntry.name === 'repoRecipe'){
								var divExists = false;
								oneFormEntry.entries.forEach(function(oneSubEntry){
									if(oneSubEntry.name === 'repoRecipeBranchAnswer'){
										divExists = true;
									}
								});
								if(!divExists){
									oneFormEntry.entries.push({
										"type": "html",
										"name": "repoRecipeBranchAnswer",
										"value": "<br /><div id='repoRecipeBranchAnswer'></div>"
									});
								}
								
								$timeout(function(){
									var ele = angular.element(document.getElementById('repoRecipeBranchAnswer'));
									ele.html(message);
									$compile(ele.contents())(currentScope);
								}, 700);
							}
						});
					});
				}
			};
			gitBranchResponse.branches.forEach(function (oneBranch) {
				delete oneBranch.commit.url;
				newInput.value.push({'v': oneBranch.name, 'l': oneBranch.name});
			});
			
			return cb(newInput);
		});
	}
	
	function getProviderRecipes(currentScope, opts, cb){
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/providers',
			params: {
				'provider': opts.provider,
				"owner": opts.owner
			}
		}, function (error, response) {
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getRepoCIremoteRecipe(currentScope, opts, cb){
		// overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/repo/remote/config',
			params: {
				'provider': opts.provider,
				"repo": opts.repo,
				"owner": opts.owner,
				"branch": opts.branch
			}
		}, function (error, response) {
			// overlayLoading.hide();
			if (error) {
				currentScope.form.displayAlert('danger', error.message);
			}
			else {
				return cb(response);
			}
		});
	}
	
	function getCIRecipe(currentScope, gitAccount, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci',
			params: {
				'port': (mydomainport || '80'),
				"variables": true,
				"owner": gitAccount.owner
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var output = [];
				response.forEach(function(oneAccount){
					if(oneAccount.provider){
						output.push(oneAccount);
					}
				});
				if( cb && typeof cb === 'function'){
					return cb(output);
				}
			}
		});
	}
	
	function toggleStatus(currentScope, status, oneRepo, provider, cb) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/ci/status',
			params: {
				'id': oneRepo.full_name,
				'enable': status,
				'owner': provider.owner,
				'provider': provider.provider
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var statusL = (status) ? 'Enabled' : 'Disabled';
				currentScope.displayAlert('success', 'Recipe ' + statusL + ' successfully');
				return cb();
			}
		});
	}
	
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
				currentScope.form.displayAlert('danger', error.message);
			} else {
				if(opts.cd){
					currentScope.branches = response.branches;
				}
			}
			if(opts.cd){
				currentScope.loadingBranches = false;
				cb();
			}
			else{
				return cb(response);
			}
		});
	}
	
	return {
		"getCIRecipe": getCIRecipe,
		"configureRepo": configureRepo
	}
}]);

function expandRecipeContent(elId){
	var cssProp = jQuery('#', elId).css('display');
	if(cssProp === 'none'){
		jQuery('#e_' + elId).slideDown();
		// jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#e_'+ elId + ' code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#' + elId).slideUp();
		// jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
	
}

function expandCustomRecipeContent(){
	var cssProp = jQuery('#customRepoRecipeContent').css('display');
	if(cssProp === 'none'){
		jQuery('#customRepoRecipeContent').slideDown();
		jQuery('#customRepoRecipeContentBTN').html('Hide Recipe Content');
		jQuery('#customRepoRecipeContent code').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	}
	else{
		jQuery('#customRepoRecipeContent').slideUp();
		jQuery('#customRepoRecipeContentBTN').html('Show Recipe Content');
	}
}