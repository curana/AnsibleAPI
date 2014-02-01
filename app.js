/*
	AnsibleAPI
	==========

	Version: 0.1
	Author: Benedikt Niessen, 2014

	Description:
		This is a very simple API for Ansible.
*/

var restify = require('restify'),
	exec    = require('child_process').exec,
	async   = require('async');

var server = restify.createServer({
  name: 'AnsibleAPI',
});

// RESTify Parameters
server.use(restify.bodyParser());
server.use(restify.queryParser());

/********************************************/
/* ROUTES */
/*
	POST /run?callback=http://example.com/callback.php
*/
server.post('/run', function (req, res, next) {
	// Parse input parameter
	var params = JSON.parse(req.body);

	run(params, function(error, output) {
		if (error) {
			res.send(error);
		}
		else {
			res.send(output);
		}

		return next();
	});
});

/*
	GET /listhosts?hosts=XXX
*/
server.get('/listhosts', function (req, res, next) {
	// Parse input parameter
	var params = req.params;

	listHosts(params, function(error, output) {
		if (error) {
			res.send(error);
		}
		else {
			res.send(output);
		}

		return next();
	})
});

server.listen(8080);


/********************************************/
/* LOGIC */
/*
	listHosts
*/
function listHosts(params, cb) {
	var command = ansibleCmd('listhosts', params),
		result  = [];

	exec(command, {}, function (error, stdout, stderr) {
		var regExpIp = new RegExp(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g),
			hosts    = stdout.match(regExpIp);

		cb(error, hosts);
	});
}

/*
	run	
*/
function run(params, cb) {
	var command = ansibleCmd('run', params),
		result  = {success: [], failed: []};

	exec(command, {}, function (error, stdout, stderr) {
		var regExpIp = new RegExp(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g);

		async.parallel({
			success: function(cb) {
				if (stdout) {
			        // SUCCESS
					var s_hosts   = stdout.match(regExpIp),						// IP-Addresses
						s_results = new RegExp(/({.*})/g).exec(stdout),			// JSON results
						success   = [],
						i 		  = 0;

					// foreach
					async.eachSeries(s_hosts, function(s_host, next) {
						success.push({host: s_hosts[i], msg: JSON.parse(s_results[i])});
						i++;
						next();
					}, 
					function(error) {
						cb(error, success);
					});
				}
				else {
					cb(null, []);
				}
		    },

		    failed: function(cb) {
		    	if (stderr) {
			    	// FAILED
					var f_hosts   = stderr.match(regExpIp),							// IP-Addresses
						f_results = stderr.match(new RegExp(/FAILED => .*/g)),
						failed    = [],
						f 		  = 0;

					// foreach
					async.eachSeries(f_hosts, function(f_host, next) {
						failed.push({host: f_hosts[f], msg: f_results[f].replace('FAILED => ', '')});
						f++;
						next();
					}, 
					function(error) {
						cb(error, failed);
					});
				}
				else {
					cb(null, []);
				}
		    }
		},
		function(error, results) {
		    cb(error, results);
		});
	});
}
		


/********************************************/
/* HELPER */
/*
	ansibleCmd			Returns the command to run ansible
*/
function ansibleCmd(route, params) {
	var cmd = 'ansible ' + params.hosts + ' -o';

	if (route == 'run') {
		if (typeof params.m != 'undefined') { cmd = cmd + ' -m ' + params.m; }
		if (typeof params.B != 'undefined') { cmd = cmd + ' -B ' + params.B; }
		if (typeof params.B != 'undefined' && typeof params.P != 'undefined') { cmd = cmd + ' -P ' + params.P; }
		if (typeof params.C != 'undefined') { cmd = cmd + ' -C'; }
		if (typeof params.c != 'undefined') { cmd = cmd + ' -c ' + params.c; }
		if (typeof params.f != 'undefined') { cmd = cmd + ' -f ' + params.f; }
		if (typeof params.i != 'undefined') { cmd = cmd + ' -i ' + params.i; }
		if (typeof params.l != 'undefined') { cmd = cmd + ' -l ' + params.l; }
		if (typeof params.M != 'undefined') { cmd = cmd + ' -M ' + params.M; }
		if (typeof params.privatekey != 'undefined') { cmd = cmd + ' --private-key=' + params.privatekey; }
		if (typeof params.s != 'undefined') { cmd = cmd + ' -s'; }
		if (typeof params.U != 'undefined') { cmd = cmd + ' -U ' + params.U; }
		if (typeof params.T != 'undefined') { cmd = cmd + ' -T ' + params.T; }
		if (typeof params.u != 'undefined') { cmd = cmd + ' -u ' + params.u; }
		if (typeof params.a != 'undefined') { cmd = cmd + ' -a ' + params.a; }
	}
	else if (route == 'listhosts') {
		cmd = cmd + ' --list-hosts';
	}

	if (params.debug) {
		console.log('Command: ' + cmd);
	}

	return cmd;
}