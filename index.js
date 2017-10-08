var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var https = require('https');
var http = require('http');
var qs = require('querystring');
var zlib = require('zlib');

var plantUml = require('./plantuml_encode');

var options = {
	"umlPath": "assets/images/uml",
	"type": "plantuml-service",
	"host": "plantuml-service.herokuapp.com",
	"protocol": "https",
	"path": "/svg/",
	"blockRegex": "^```uml((.*[\r\n])+?)?```$"
}

require('shelljs/global');


function plantumlServerEscape(block) {
	//UTF8
	var compressedUml = unescape(encodeURIComponent(block));
	compressedUml = zlib.deflateRawSync(compressedUml, { level: 9 }).toString('utf8');
	compressedUml = plantUml.encode64(compressedUml);
	return compressedUml;
}

module.exports = {
	hooks: {
		"init": function () {
			var output = this.output;
			var config = this.config.values.pluginsConfig["plantuml-cloud"];
			if (config.umlPath != undefined) {
				options.umlPath = config.umlPath;
			}
			if (config.type != undefined) {
				options.type = config.type;
			}
			if (config.host != undefined) {
				options.host = config.host;
			}
			if (config.protocol != undefined) {
				options.protocol = config.protocol;
			}
			if (config.path != undefined) {
				options.path = config.path;
			}
			if (config.blockRegex != undefined) {
				options.blockRegex = config.blockRegex;
			}
			var umlPath = output.resolve(options.umlPath);
			mkdir('-p', umlPath);
		},
		"page:before": function (page) {
			var output = this.output;
			var content = page.content;

			var umls = [];
			var re = new RegExp(options.blockRegex, 'img');

			while ((match = re.exec(content))) {
				var rawBlock = match[0];
				var umlBlock = match[1];
				var md5 = crypto.createHash('md5').update(umlBlock).digest('hex');
				var svgPath = path.join(options.umlPath, md5 + '.svg');
				umls.push({
					rawBlock: match[0],
					umlBlock: match[1],
					svgPath: svgPath
				});
			}

			Promise.all([umls.map(uml => {
				var svgTag = '![](/' + uml.svgPath + ')';
				page.content = content = content.replace(uml.rawBlock, svgTag);

				return output.hasFile(uml.svgPath).then(exists => {
					if (!exists) {
						return new Promise((resolve, reject) => {

							var client = http;
							if (options.protocol == "https") {
								client = https;
							}

							var path = options.path + qs.escape(uml.umlBlock);
							if (options.type == "plantuml-server") {
								path = options.path + plantumlServerEscape(uml.umlBlock);
							}

							client.request({
								host: options.host,
								path: path
							}, (res) => {
								var ws = fs.createWriteStream(output.resolve(uml.svgPath));
								res.pipe(ws);
								res.on('end', resolve);
							}).end();
						});
					}
				})
			})]);

			return page;
		},

		"page": function (page) { return page; },
		"page:after": function (page) { return page; }
	}
};
