"use strict";
/**
 * Custom configuration values
 */

let protocol = window.location.protocol;

let mydomain = "localhost:4000";

//set the key
let myKey = "";
if(customSettings && customSettings.key && customSettings.key !== ''){
    myKey = customSettings.key;
}

let titlePrefix = "SOAJS";
let themeToUse = "default";
let whitelistedDomain = ['localhost', '127.0.0.1', mydomain];
let apiConfiguration = {
	domain: window.location.protocol + '//' + mydomain,
	key: myKey
};

let consoleAclConfig = {
	"DASHBOARD": ["dashboard", "oauth", "urac", 'multitenant', 'repositories', 'marketplace', 'infra', "console"],
	"OTHER": ["urac", "oauth"]
};

let SOAJSRMS = ['soajs.controller','soajs.urac','soajs.oauth','soajs.dashboard','soajs.prx','soajs.gcs', 'soajs.multitenant', 'soajs.repositories', 'soajs.infra', 'soajs.console'];
let KUBERNETES_SYSTEM_DEPLOYMENTS = [ 'kube-dns', 'kube-proxy', 'kube-apiserver', 'kube-scheduler', 'kube-controller-manager', 'kube-flannel-ds' ];
let soajsAppModules = ['ui.bootstrap', 'ui.bootstrap.datetimepicker', 'ui.select', 'luegg.directives', 'angular-sortable-view', 'ngRoute', 'ngCookies', 'ngStorage', 'textAngular', "ngFileUpload", "swaggerUi", "ui.ace", "ngCkeditor", "chart.js", "ng-showdown"];

let modules = {
	"develop": {
		"dashboard": {
			marketplace: 'modules/dashboard/marketplace/install.js',
			deployMarketplace: 'modules/dashboard/deployMarketplace/install.js',
			gitAccountManagement: 'modules/dashboard/gitManagement/install.js',
			gitRepositories: 'modules/dashboard/repositories/install.js',
			swaggerEditorApp: 'modules/dashboard/swaggerEditor/install.js',
			catalogs: 'modules/dashboard/catalogs/install.js',
			infra: 'modules/dashboard/infra/install.js',
			myAccount: 'modules/dashboard/myAccount/install.js'
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
			environments: 'modules/dashboard/environments/install.js'
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
	}
};

let whitelistedRepos = [
	'soajs/soajs.examples',
	'soajs/soajs.jsconf',
	'soajs/soajs.artifact',
	'soajs/soajs.quick.demo',
	'soajs/soajs.nodejs.express',
	'soajs/soajs.nodejs.hapi',
	'soajs/soajs.java.jaxrs_jersey',
	'soajs/soajs.golang.mux'
];
