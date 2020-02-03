"use strict";
/**
 * Custom configuration values
 */
var _soajsStore = "https://www.soajs.io/store";
var mydomain = "soajs.org";

//detect domain
if(location && location.host){
	var customDomain = location.host;
	customDomain = customDomain.split(":")[0];
	customDomain = customDomain.split(".");
	customDomain.shift();
	customDomain = customDomain.join(".");
	mydomain = customDomain;
}

var protocol = window.location.protocol;

//detect port
var mydomainport = (protocol ==='https:') ? 443 : 80;
if (location && location.port && parseInt(location.port) !== 80) {
	mydomainport = location.port;
}
mydomain += ":" + mydomainport;

//set the api domain
var mydomainAPI = "dashboard-api";
if(customSettings && customSettings.api && customSettings.api !== ''){
	mydomainAPI = customSettings.api;
}

//set the key
var myKey = "";
if(customSettings && customSettings.key && customSettings.key !== ''){
	myKey = customSettings.key;
}

var titlePrefix = "SOAJS";
var themeToUse = "default";
var whitelistedDomain = ['localhost', '127.0.0.1', mydomainAPI + '.' + mydomain];
var apiConfiguration = {
	domain: window.location.protocol + '//' + mydomainAPI + '.' + mydomain,
	key: myKey
};

var consoleAclConfig = {
	"DASHBOARD": ["dashboard", "oauth", "urac", 'multitenant', 'repositories'],
	"OTHER": ["urac"]
};
var SOAJSRMS = ['soajs.controller','soajs.urac','soajs.oauth','soajs.dashboard','soajs.prx','soajs.gcs', 'soajs.multitenant', 'soajs.repositories'];
var KUBERNETES_SYSTEM_DEPLOYMENTS = [ 'kube-dns', 'kube-proxy', 'kube-apiserver', 'kube-scheduler', 'kube-controller-manager', 'kube-flannel-ds' ];
var soajsAppModules = ['ui.bootstrap', 'ui.bootstrap.datetimepicker', 'ui.select', 'luegg.directives', 'angular-sortable-view', 'ngRoute', 'ngCookies', 'ngStorage', 'textAngular', "ngFileUpload", "swaggerUi", "ui.ace", "ngCkeditor", "chart.js"];

var modules = {
	"develop": {
		"dashboard": {
			services: 'modules/dashboard/services/install.js',
			endpoints: 'modules/dashboard/endpoints/install.js',
			githubApp: 'modules/dashboard/gitAccounts/install.js',
			gitAccountManagement: 'modules/dashboard/gitManagement/install.js',
			gitRepositories: 'modules/dashboard/repositories/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js',
			catalogs: 'modules/dashboard/catalogs/install.js',
			ci: 'modules/dashboard/ci/install.js',
			cd: 'modules/dashboard/cd/install.js',
			templates: 'modules/dashboard/templates/install.js',
			importExport: 'modules/dashboard/importExport/install.js',
			infra: 'modules/dashboard/infra/install.js'
		}
	},
	"manage": {
		"dashboard": {
			productization: 'modules/dashboard/productization/install.js',
			multitenancy: 'modules/dashboard/multitenancy/install.js',
			members: 'modules/dashboard/members/install.js'
		}
	},
	"deploy": {
		"dashboard": {
			environments: 'modules/dashboard/environments/install.js',
			resources: 'modules/dashboard/resources/install.js',
			secrets: 'modules/dashboard/secrets/install.js',
			volumes: 'modules/dashboard/volumes/install.js'
		}
	},
	"dashboard": {
		"dashboard": {
			dashboard: 'modules/dashboard/analyticDashboard/install.js',
		}
	},
	"settings": {
		"dashboard": {
			dashboard: 'modules/dashboard/settings/install.js',
		}
	},
	"common": {
		"dashboard": {
			myAccount: 'modules/dashboard/myAccount/install.js'
		}
	}
};

var whitelistedRepos = [
	'soajs/soajs.examples',
	'soajs/soajs.jsconf',
	'soajs/soajs.artifact',
	'soajs/soajs.quick.demo',
	'soajs/soajs.nodejs.express',
	'soajs/soajs.nodejs.hapi',
	'soajs/soajs.java.jaxrs_jersey',
	'soajs/soajs.golang.mux'
];
