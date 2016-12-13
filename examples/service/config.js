'use strict';
module.exports = {
	"serviceName": "myService",
	"servicePort": 4050,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": false,
	"errors": {
		"400": "Database Error"
	},

	"schema": {
		"commonFields": {
			"title": {
				"source": ['body.title'],
				"required": false,
				"validation": {
					"type": "string"
				}
			},
			"description": {
				"source": ['body.description'],
				"required": false,
				"validation": {
					"type": "string"
				}
			}
		},
		"/list": {
			_apiInfo: {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			}
		},
		"/add": {
			_apiInfo: {
				"l": "Add Entry",
				"group": "Entries"
			},
			"commonFields": ['description', 'title']
		}
	}
};