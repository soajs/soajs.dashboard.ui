'use strict';

const config = require('./config');

const path = require('path');
// const fs = require('fs');

const express = require('express');
const app = express();
const port = config.port;

// fs.stat(path.normalize(__dirname + "/../default.config.js"), (error, stats) => {
// 	if (error) {
// 		if (error.code === 'ENOENT' && !stats) {
// 			fs.copyFile(path.normalize(__dirname + "/../config.js"), path.normalize(__dirname + "/../default.config.js"), (err) => {
// 				if (err) throw err;
//
// 				checkUIConfig();
// 			});
// 		} else {
// 			throw error;
// 		}
// 	} else {
// 		checkUIConfig();
// 	}
// });
checkUIConfig();
function checkUIConfig() {
	//bind the ui
	app.use(express.static(path.join(__dirname, '../')));
	app.use((req, res, next) => {
		res.sendFile(path.join(__dirname, "../", "index.html"));
	});
	//start the express app
	app.listen(port, () => {
		console.log(`SOAJS UI Console started on ${config.host} and listening on port ${port}!`);
	});
}