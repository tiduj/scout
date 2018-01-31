var scout = {
	config: {
		urls: {
			apiRoot: '',
			domainRoot: '',
			sgvEntries: 'entries/sgv.json',
			deviceStatus: 'devicestatus.json',
			status: 'status.json',
			treatments: 'treatments.json',
			socketio_js: 'socket.io/socket.io.js'
		},
		sgv: {
			target_min: 80,
			target_max: 200,
			spike_delta: 12
		},
		old_minutes: 15,
		missed_minutes: 8,
		pct_split_mins: 15,
		modifyTitle: false,
		timeFormat: 'MM/DD/YYYY HH:mm',
		favicon_alternate_ms: 5000,
		reload_ms: 30*1000,
		notification_ms: 5000,
		notifyOldData_mins: 20,
		uploaderBat_default_readings: 1000,
		fetch_mode: location.search.indexOf('websocket=true') != -1 ? 'websocket': 'ajax'
	}
};

scout.util = {
	colorForSgv: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 0, 0)';
		if (sgv > scout.config.sgv.target_max) return 'rgb(255, 127, 0)';
		return 'rgb(0, 255, 0)';
	},

	bgColorForSgv: function(sgv) {
		if (sgv < scout.config.sgv.target_min) return 'rgb(255, 127, 127)';
		if (sgv > scout.config.sgv.target_max) return 'rgb(255, 127, 0)';
		return 'rgb(0, 255, 0)';
	},

	updateInRange: function(obj, sgv) {
		if (sgv < scout.config.sgv.target_min) obj.inRange[1]++;
		else if (sgv > scout.config.sgv.target_max) obj.inRange[3]++;
		else obj.inRange[2]++;
		if (sgv > obj.highBg) obj.highBg = sgv;
		if (sgv < obj.lowBg) obj.lowBg = sgv;
	},

	pctA1c: function(avg_sgv) {
		return (46.7 + avg_sgv)/28.7;
	},

	round: function(num, places) {
		return parseInt(num * Math.pow(10, places)) / Math.pow(10, places);
	},

	directionToArrow: function(dir) {
		return {
			/*
			NONE: '⇼', 
			DoubleUp: '⇈',
			SingleUp: '↑',
			FortyFiveUp: '↗',
			Flat: '→',
			FortyFiveDown: '↘',
			SingleDown: '↓',
			DoubleDown: '⇊',
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': '⇕'
			*/
			NONE: unescape('%u21FC'), 
			DoubleUp: unescape('%u21C8'),
			SingleUp: unescape('%u2191'),
			FortyFiveUp: unescape('%u2197'),
			Flat: unescape('%u2192'),
			FortyFiveDown: unescape('%u2198'),
			SingleDown: unescape('%u2193'),
			DoubleDown: unescape('%u21CA'),
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': unescape('%u21D5')
		}[dir];
	},

	directionToThickArrow: function(dir) {
		return {
			/*
			NONE: '⇼', 
			DoubleUp: '▲▲',
			SingleUp: '▲',
			FortyFiveUp: '⬈',
			Flat: '▶',
			FortyFiveDown: '⬊',
			SingleDown: '▼',
			DoubleDown: '▼▼',
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': '⬍'
			*/
			NONE: unescape('%u21FC'), 
			DoubleUp: unescape('%u25B2%u25B2'),
			SingleUp: unescape('%u25B2'),
			FortyFiveUp: unescape('%u2B08'),
			Flat: unescape('%u25B6'),
			FortyFiveDown: unescape('%u2B0A'),
			SingleDown: unescape('%u25BC'),
			DoubleDown: unescape('%u25BC%u25BC'),
			'NOT COMPUTABLE': '-',
			'RATE OUT OF RANGE': unescape('%u2B0D')
		}[dir];
	},

	timeAgo: function(date) {
		var mom = moment(date).fromNow();
		if (mom == "a few seconds ago") return "just now";
		return mom;
	},

	minsAgo: function(date) {
		return moment.duration(moment().diff(date)).asMinutes();
	},

	noise: function(n) {
		return [
			'?',
			'✓',
			'⚠ Light Noise',
			'⚠ Moderate Noise',
			'⚠ High Noise'
		][parseInt(n)];
	},

	isOldData: function(date) {
		return moment.duration(moment().diff(date)).asMinutes() >= scout.config.old_minutes;
	},

	isMissedData: function(date) {
		return moment.duration(moment().diff(date)).asMinutes() >= scout.config.missed_minutes;
	},

	getShortTimeDiff: function(date) {
		var df = moment.duration(moment().diff(date));
		if (df.asMinutes() < 60) return Math.round(df.asMinutes())+"m";
		if (df.asHours() < 10) return parseInt(df.asHours())+"h"+scout.util.zeroPad(df.asMinutes()%60);
		return parseInt(df.asHours())+"h";
	},

	zeroPad: function(digit) {
		var d = parseInt(digit);
		if (d < 10) return "0"+d;
		return d;
	},

	convertTrDate: function(sgvDate) {
		return (""+sgvDate).replace(/T/, " ");
	},

	sensorAgeColor: function(hrs) {
		if (hrs < 6*24) return 'rgba(255,0,0,0.5)';
		if (hrs > 8*24) return 'rgba(0,0,255,0.5)';
		return 'rgba(0,255,0,0.5)';
	},

	batColor: function(bat) {
		if (bat < 15) return 'rgba(255,0,0,0.5)';
		if (bat < 35) return 'rgba(255,255,0,0.5)';
		return 'rgba(0,255,0,0.5)';
	},

	fmtDuration: function(tm) {
		var dur = moment.duration(tm);
		var out = "";
		if (dur.asDays() >= 1) out += parseInt(dur.asDays())+" days, ";
		if (dur.asHours() >= 1) {
			var hrs = parseInt(dur.asHours()%24);
			out += hrs+" hour";
			if (hrs != 1) out += "s";
			out += ", ";
		}
		out += parseInt(dur.asMinutes()%60)+" minutes, ";
		return out.substring(0, out.length-2);
	},

	fmtDelta: function(delta) {
		return delta > 0 ? '+'+scout.util.round(delta, 1) : scout.util.round(delta, 1);
	},

	modifyFavicon: function(href) {
		var link = document.querySelector("link[rel='icon']");
		link.setAttribute('type', 'image/png');
		link.setAttribute('href', href);
	},
};

scout.chartConf = {
	sgv: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: 'Glucose',
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				borderColor: 'rgb(0, 0, 0)',
				fill: false,
				data: []
			}, {
				label: 'Average',
				fill: false,
				pointRadius: 0,
				borderDash: [5, 5],
				backgroundColor: 'rgba(0, 127, 255, 0.5)',
				borderColor: 'rgba(0, 127, 255, 0.5)',
				type: 'line',
				data: [],
				tooltips: false
			}, {
				label: 'Bolus',
				fill: false,
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgba(255, 0, 0, 0.5)',
				type: 'bubble',
				tooltips: false,
				datalabels: {
					display: true,
					backgroundColor: 'rgba(255, 0, 0, 0.5)',
					borderRadius: 4,
					color: 'white',
					font: {
						weight: 'bold'
					},
					align: 'start',
					anchor: 'start'

				}
			}]
		},
		options: {
			// custom
			usePointBackgroundColor: true,

			responsive: true,
	        title: {
	            text: "Glucose"
	        },
	        tooltips: {
	        	mode: 'index',
	        	intersect: false
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
						//unit: 'hour',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'MMM D'
						},
						// round: 'day'
						tooltipFormat: 'MMM D hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}, ],
				yAxes: [{
					scaleLabel: {
						display: false,
						labelString: 'mg/dL'
					},
					ticks: {
						suggestedMin: 40,
						suggestedMax: 280,
						stepSize: 40

					}
				}],
			},
			legend: {
				display: false
			},
			annotation: {
				events: [],
				annotations: [
				{
					drawTime: "beforeDatasetsDraw",
					id: "lowRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: 0,
					yMax: scout.config.sgv.target_min,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 0, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "highRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_max,
					yMax: 400,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 127, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "goodRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_min,
					yMax: scout.config.sgv.target_max,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(0, 255, 0, 0.1)",
					borderColor: "rgba(0, 255, 0, 1)",
					borderWidth: 2
				}]
			}
		},
	},

	pct: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: "Median",
				backgroundColor: 'rgba(0, 255, 0, 0.5)',
				borderColor: 'rgb(0, 255, 0)',
				fill: false,
				data: []
			}, {
				label: "Average",
				backgroundColor: 'rgba(255, 255, 0, 0.5)',
				borderColor: 'rgb(255, 255, 0)',
				fill: false,
				data: []
			}, {
				label: "25%",
				backgroundColor: 'rgba(0, 0, 255, 0.5)',
				borderColor: 'rgb(0, 0, 255)',
				fill: false,
				data: []
			}, {
				label: "75%",
				backgroundColor: 'rgba(0, 0, 255, 0.5)',
				borderColor: 'rgb(0, 0, 255)',
				fill: '-1',
				data: []
			}, {
				label: "10%",
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgb(255, 0, 0)',
				fill: false,
				data: []
			}, {
				label: "90%",
				backgroundColor: 'rgba(255, 0, 0, 0.5)',
				borderColor: 'rgb(255, 0, 0)',
				fill: '-1',
				data: []
			}]
		},
		options: {
			responsive: true,
	        title: {
	            text: "Glucose"
	        },
	        tooltips: {
	        	mode: 'index',
	        	intersect: false
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
						//unit: 'hour',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a'
						},
						// round: 'day'
						tooltipFormat: 'hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}, ],
				yAxes: [{
					scaleLabel: {
						display: false,
						labelString: 'mg/dL'
					},
					ticks: {
						suggestedMin: 40,
						suggestedMax: 280,
						stepSize: 40

					}
				}],
			},
			legend: {
				display: false
			},
			elements: {
				point: {
					radius: 1
				}
			},
			annotation: {
				events: [],
				annotations: [
				{
					drawTime: "beforeDatasetsDraw",
					id: "lowRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: 0,
					yMax: scout.config.sgv.target_min,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 0, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "highRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_max,
					yMax: 400,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 127, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "goodRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_min,
					yMax: scout.config.sgv.target_max,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(0, 255, 0, 0.1)",
					borderColor: "rgba(0, 255, 0, 1)",
					borderWidth: 2
				}]
			}
		},
	},

	bg: {
		type: 'doughnut',
	    data: {
			labels: ["Unknown", "Low", "In Range", "High"],
			datasets: [{
				label: "mg/dL",
				backgroundColor: [
					"rgb(169, 169, 169)",
					"rgb(128, 0, 0)",
					"rgb(0, 255, 0)",
					"rgb(255, 127, 0)"
				],
			  	data: []
			}]
	    },
	    options: {
	    	responsive: true,
			title: {
				display: false,
				text: 'Current Blood Glucose'
			},
			legend: {
				display: false
			},
	      	annotation: {
				events: [],
				annotations: [{
					drawTime: "beforeDatasetsDraw",
					id: "bgCurrent",
					type: "text",
					yMin: 0,
					yMax: scout.config.sgv.target_min,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 0, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "highRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_max,
					yMax: 400,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(255, 127, 0, 0.1)"
				}, {
					drawTime: "beforeDatasetsDraw",
					id: "goodRange",
					type: "box",
					xScaleID: "x-axis-0",
					yScaleID: "y-axis-0",
					yMin: scout.config.sgv.target_min,
					yMax: scout.config.sgv.target_max,
					xMin: moment("1969-12-31T23:59:59-0500"),
					xMax: moment("2969-12-31T23:59:59-0500"),
					backgroundColor: "rgba(0, 255, 0, 0.1)",
					borderColor: "rgba(0, 255, 0, 1)",
					borderWidth: 2
				}]
			}
	    }
	},

	sab: {
		type: 'bar',
		data: {
			datasets: [{
				label: 'Sensor time',
				backgroundColor: [],
				data: []
			}]
		},

		options: {
			responsive: true,
			legend: {
				display: false
			},

			title: {
				display: false
			},

	        tooltips: {
	        	mode: 'index',
	        	intersect: false,
	        	callbacks: {
	        		label: function(tooltipItem, data) {
	        			return parseInt(tooltipItem.yLabel)+" days ("+parseInt(tooltipItem.yLabel*24)+" hours)";
	        		}
	        	}
	        },

			scales: {
				xAxes: [{
					type: 'time',
					time: {
						unit: 'day',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'MMM D'
						},
						tooltipFormat: 'MMM D hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'days'
					},
					ticks: {
						suggestedMin: 0,
					}
				}]
			}
		}
	},

	bat: {
		type: 'line',
		data: {
			labels: [// date
			],
			datasets: [{
				label: 'Battery',
				backgroundColor: [],
				borderColor: [],
				fill: false,
				data: []
			}]
		},
		options: {
			responsive: true,
	        title: {
	            text: "Battery"
	        },
	        tooltips: {
	        	mode: 'index',
	        	intersect: false
	        },
			scales: {
				xAxes: [{
					type: "time",
					time: {
						parser: scout.config.timeFormat,
						//unit: 'hour',
						//unitStepSize: 4,
						displayFormats: {
							'minute': 'hh:mm a',
							'hour': 'hh:mm a',
							'day': 'MMM D'
						},
						// round: 'day'
						tooltipFormat: 'MMM D hh:mm a'
					},
					scaleLabel: {
						display: false,
						labelString: 'Date'
					}
				}, ],
				yAxes: [{
					scaleLabel: {
						display: false,
						labelString: '%'
					},
					ticks: {
						suggestedMin: 0,
						suggestedMax: 100

					}
				}],
			},
			legend: {
				display: false
			},

			elements: {
				point: {
					radius: 0
				}
			}
		}
	}
};

scout.chart = {
	sgv: null,
	bg: null
};

scout.tpl = {
	renderHTML: function(tplId, dict) {
		var tpl = document.querySelector("script#" + tplId);
		var html = tpl.innerHTML;
		for (var key in dict) {
			html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
		}
		return html;
	}
}

scout.inRange = {
	init: function() {
		var today = moment().format("YYYY-MM-DD");
		var lastwk = moment().subtract({days: 7}).format("YYYY-MM-DD");
		document.querySelector("#in_range_single").value = today;
		document.querySelector("#in_range_start").value = lastwk;
		document.querySelector("#in_range_end").value = today;

	},

	submitFormSingle: function() {
		var date = document.querySelector("#in_range_single").value;
		scout.inRange.addDay(moment(date).format());
	},


	submitFormRange: function() {
		var date1 = moment(document.querySelector("#in_range_start").value);
		var date2 = moment(document.querySelector("#in_range_end").value);
		scout.inRange.addRange(moment.min(date1, date2).format(), moment.max(date1, date2).format());
	},

	addDay: function(date) {
		scout.fetch.eq(date, function(data) {
			scout.inRange.embedSingle(data, [date]);
		});
	},

	addRange: function(st_date, end_date) {
		scout.fetch.range(st_date, end_date, function(data) {
			scout.inRange.embedSingle(data, [st_date, end_date]);
		});
	},

	embedSingle: function(fullData, dates) {
		var data = fullData["sgv"];
		console.debug("embed data", data);
		var outer = document.querySelector("#in_range");
		var id = Math.random().toString(36).substring(2);
		var dict = scout.inRange.dataDict(data, id, dates);
		dict['id'] = id;
		dict['date'] = dates.join("--");
		var html = scout.tpl.renderHTML("in_range_tpl", dict);
		var newDiv = document.createElement("div");
		newDiv.innerHTML = html;
		outer.appendChild(newDiv.children[0]);
		scout.bg.load("in_range_canvas_"+id, data);
		scout.sgv.load("in_range_sgv_canvas_"+id, fullData, null, {tooltips: true, thinLines: true});
	},

	dataDict: function(data, id, dates) {
		var dict = {};
		var chartData = scout.bg.genChartData(data);

		if (dates.length == 1) {
			dict['header_date'] = moment(dates[0]).format("MMMM Do, YYYY");
		} else {
			dict['header_date'] = moment(dates[0]).format("MMMM Do")+" - "+moment(dates[1]).format("MMMM Do, YYYY");
		}

		var inRangePct = chartData.inRange[2]/chartData.bgCount
		var avgBg = chartData.bgSum/chartData.bgCount

		dict['in_range_pct'] = "In range: "+scout.util.round(inRangePct, 4)*100+"%";
		dict['avg_bg'] = "Average BG: "+Math.round(avgBg);
		dict['avg_a1c'] = scout.util.round(scout.util.pctA1c(avgBg), 2)+"%A1c";
		dict['high_bg'] = "High: "+Math.round(chartData.highBg);
		dict['low_bg'] = "Low: "+Math.round(chartData.lowBg);
		dict['total_num'] = "Total entries: "+chartData.bgCount;

		return dict;
	}
};


scout.hourlyPct = {
	init: function() {
		var today = moment().format("YYYY-MM-DD");
		var lastwk = moment().subtract({days: 7}).format("YYYY-MM-DD");
		document.querySelector("#hourly_pct_start").value = lastwk;
		document.querySelector("#hourly_pct_end").value = today;

	},

	submitForm: function() {
		var date1 = moment(document.querySelector("#hourly_pct_start").value);
		var date2 = moment(document.querySelector("#hourly_pct_end").value);
		scout.hourlyPct.addRange(moment.min(date1, date2).format(), moment.max(date1, date2).format());
	},

	addRange: function(st_date, end_date) {
		scout.fetch.range(st_date, end_date, function(data) {
			scout.hourlyPct.embedSingle(data, [st_date, end_date]);
		});
	},

	embedSingle: function(fullData, dates) {
		var data = fullData["sgv"];
		console.debug("embed data", data);
		var outer = document.querySelector("#hourly_pct");
		var tpl = document.querySelector("script#hourly_pct_tpl");
		var id = Math.random().toString(36).substring(2);
		var html = tpl.innerHTML
			.replace(/\{id\}/g, id)
			.replace(/\{date\}/g, dates.join("--"));
		var dict = scout.hourlyPct.dataDict(data, id, dates);
		for (var key in dict) {
			html = html.replace(new RegExp("\\{" + key + "\\}", "g"), dict[key]);
		}
		var newDiv = document.createElement("div");
		newDiv.innerHTML = html;
		outer.appendChild(newDiv.children[0]);
		//scout.sgv.load("hourly_pct_canvas_"+id, data, null, {tooltips: true, thinLines: true});
		scout.pct.load("hourly_pct_canvas_"+id, fullData);
	},

	dataDict: function(data, id, dates) {
		var dict = {};
		var chartData = scout.bg.genChartData(data);

		if (dates.length == 1) {
			dict['header_date'] = moment(dates[0]).format("MMMM Do, YYYY");
		} else {
			dict['header_date'] = moment(dates[0]).format("MMMM Do")+" - "+moment(dates[1]).format("MMMM Do, YYYY");
		}

		var inRangePct = chartData.inRange[2]/chartData.bgCount
		var avgBg = chartData.bgSum/chartData.bgCount

		var stats = "In range: "+scout.util.round(inRangePct, 4)*100+"%<br>" +
					"Average BG: "+scout.util.round(avgBg, 0)+" ("+scout.util.round(scout.util.pctA1c(avgBg), 2)+"%A1c)<br>"+
					"Total entries: "+chartData.bgCount;
		dict['stats'] = stats;

		return dict;
	}
};

scout.pct = {
	init: function(canvasId) {
		var pctCtx = document.getElementById(canvasId).getContext("2d");
		// todo: deep copy?
		var pctConf = scout.chartConf.pct;
		return new Chart(pctCtx, pctConf);
	},

	genChartData: function(fullData) {
		// TODO: redo these calculations; there's something fishy
		// with the data that gets put on the graph, it looks off.
		var data = fullData["sgv"];
		var dFmt = "YYYY-MM-DD";
		var perDay = {}
		var dayi = 0;
		for (var i=0; i<data.length; i++) {
			var day = moment(data[i]["date"]).format(dFmt);
			if ( Object.keys(perDay).indexOf(day) != -1) {
				perDay[day].push(data[i]);
			} else {
				perDay[day] = [data[i]];
			}
		}
		console.debug("pct perDay", perDay);
		var perMins = [];
		for (var i=0; i<Object.keys(perDay).length; i++) {
			var day = perDay[Object.keys(perDay)[i]];
			for (var j=0; j<day.length; j++) {
				var dt = moment(day[j]['date']);
				var ms = Math.floor(dt.diff(dt.clone().startOf('day'), 'minutes')/scout.config.pct_split_mins);
				if (perMins[ms] != null) {
					perMins[ms].push(day[j]);
				} else {
					perMins[ms] = [day[j]];
				}
			}
		}
		console.debug("pct perMins", perMins);

		var median = [];
		var avg = [];
		var pct25 = [];
		var pct10 = [];
		function percentile(arr, p) {
			if (arr.length === 0) return 0;
			if (typeof p !== 'number') throw new TypeError('p must be a number');
			if (p <= 0) return arr[0];
			if (p >= 1) return arr[arr.length - 1];

			var index = arr.length * p,
			    lower = Math.floor(index),
			    upper = lower + 1,
			    weight = index % 1;

			if (upper >= arr.length) return arr[lower];
			return arr[lower] * (1 - weight) + arr[upper] * weight;
		}

		for (var i=0; i<perMins.length; i++) {
			var sgvObjs = perMins[i];
			var av = 0;
			var rawSgvs = [];
			for (var j=0; j<sgvObjs.length; j++) {
				rawSgvs.push(sgvObjs[j]['sgv']);
				av += parseInt(sgvObjs[j]['sgv']);
			}
			av = av/rawSgvs.length;
			rawSgvs.sort();
			if (rawSgvs.length % 2 == 0) {
				median[i] = (rawSgvs[rawSgvs.length/2 - 1] + rawSgvs[rawSgvs.length/2])/2;
			} else {
				median[i] = rawSgvs[(rawSgvs.length-1)/2];
			}
			pct25[i] = percentile(rawSgvs, 0.25);
			pct10[i] = percentile(rawSgvs, 0.10);
			avg[i] = av;

		}
		console.debug("pct median", median);
		console.debug("pct avg", avg);
		return {
			"median": median,
			"avg": avg,
			"pct25": pct25,
			"pct10": pct10
		};

	},

	render: function(chart, chartData) {
		console.debug("pct chartData", chartData);
		var median = chartData["median"];
		var pct25 = chartData["pct25"];
		var pct10 = chartData["pct10"];
		var avg = chartData["avg"];
		var stDay = moment().startOf('day');
		{
			// median
			var dataset = chart.config.data.datasets[0];
			dataset.data = [];
			for (var i=0; i<median.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(median[i])
				});
			}
		}
		{
			// avg
			var dataset = chart.config.data.datasets[1];
			dataset.data = [];
			for (var i=0; i<avg.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(avg[i])
				});
			}
		}
		{
			// 25-low
			var dataset = chart.config.data.datasets[2];
			dataset.data = [];
			for (var i=0; i<pct25.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(pct25[i])
				});
			}
		}
		{
			// 25-hi
			var dataset = chart.config.data.datasets[3];
			dataset.data = [];
			for (var i=0; i<pct25.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(2*median[i] - pct25[i])
				});
			}
		}
		{
			// 10-low
			var dataset = chart.config.data.datasets[4];
			dataset.data = [];
			for (var i=0; i<pct10.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(pct10[i])
				});
			}
		}
		{
			// 10-hi
			var dataset = chart.config.data.datasets[5];
			dataset.data = [];
			for (var i=0; i<pct10.length; i++) {
				var date = stDay.clone().add({minutes: i*15});
				dataset.data.push({
					x: date,
					y: Math.round(2*median[i] - pct10[i])
				});
			}
		}

		chart.update();
	},

	load: function(canvasId, fullData) {
		var chart = scout.pct.init(canvasId);
		scout.pct.render(chart, scout.pct.genChartData(fullData));
		chart.update();
		return chart;
	}
}

scout.bg = {
	init: function(canvasId) {
		var bgCtx = document.getElementById(canvasId).getContext("2d");
		// hack for deep clone. we don't want to store data in chartConf.
		var bgConf = JSON.parse(JSON.stringify(scout.chartConf.bg));
		return new Chart(bgCtx, bgConf);
	},

	genChartData: function(data) {
		var dat = {
			inRange: [0, 0, 0, 0],
			bgSum: 0,
			bgCount: 0,
			highBg: data.length>0 ? data[0]['sgv'] : 0,
			lowBg: data.length>0 ? data[0]['sgv'] : 0,
		};
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			scout.util.updateInRange(dat, obj['sgv']);
			dat.bgSum += obj['sgv'];
			dat.bgCount++;
		}
		console.debug("bg chartD", dat);
		return dat;
	},

	render: function(chart, chartData) {
		var bgSet = chart.config.data.datasets[0];
		bgSet.data = [];
		for (var i=0; i<chartData.inRange.length; i++) {
			bgSet.data.push(chartData.inRange[i]);
		}
		var middleText = scout.util.round(chartData.inRange[2]/chartData.bgCount, 2)*100+'%';
		// scout.util.round(chartData.bgSum/chartData.bgCount, 0);
		//displayedData[0]['sgv'] +' ' +directionToArrow(displayedData[0]['direction'])
		chart.config.options['elements']['center'] = {
			maxText: '100%',
			text: middleText,
			fontColor: 'rgb(0, 0, 0)'
		};
		chart.update();
	},

	load: function(canvasId, data) {
		var chart = scout.bg.init(canvasId);
		scout.bg.render(chart, scout.bg.genChartData(data));
		chart.update();
		return chart;
	}
};

scout.sgv = {
	primaryInit: function() {
		scout.chart.sgv = scout.sgv.init("sgvCanvas");
		scout.sgv.bindJump();
	},

	init: function(canvasId, extraConf) {
		var sgvCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var sgvConf = Object.assign({}, scout.chartConf.sgv);

		if (extraConf) {
			sgvConf['options']['tooltips']['enabled'] = extraConf['tooltips'];
			sgvConf['options']['usePointBackgroundColor'] = extraConf['usePointBackgroundColor'];
			if (extraConf['thinLines']) {
				sgvConf['data']['datasets'][0]['borderWidth'] = 2;
				sgvConf['options']['elements'] = {point: {radius: 0}};
			}
		}

		// hack for deep copy of data fields.
		sgvConf.data = JSON.parse(JSON.stringify(scout.chartConf.sgv.data));
		return new Chart(sgvCtx, sgvConf);
	},

	bindJump: function() {
		function click(cb) {
			return function() {
				this.parentElement.querySelector(".is-active").classList.remove('is-active');
				this.classList.add('is-active');
				scout.sgv.currentLength = cb;
				cb(scout.sgv.primaryCallback);
			}
		}
		document.querySelector("#sgv-jump-halfday").addEventListener('click', click(scout.fetch.halfday));
		document.querySelector("#sgv-jump-today").addEventListener('click', click(scout.fetch.today));
		document.querySelector("#sgv-jump-threeday").addEventListener('click', click(scout.fetch.threeday));
		document.querySelector("#sgv-jump-week").addEventListener('click', click(scout.fetch.week));
	},

	primaryCallback: function(data) {
		scout.sgv.callback(scout.chart.sgv, data);
	},

	primaryDSCallback: function() {
		scout.sgv.primaryCallback({
			'sgv': scout.ds.getLatestHrs('sgv', 12),
			'tr': scout.ds.getLatestHrs('tr', 12)
		});
	},

	callback: function(chart, data) {
		scout.sgv.sgvCallback(chart, data);
		scout.sgv.trCallback(chart, data);
	},

	sgvCallback: function(chart, fullData) {
		var data = fullData["sgv"];
		console.log("sgvCallback data", data);
		var dataset = chart.config.data.datasets[0];
		dataset.data = [];
		var sum = 0;
		if (chart.options.usePointBackgroundColor) dataset.pointBackgroundColor = [];
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			dataset.data.push({
				x: moment(obj['date']),
				y: obj['sgv']
			});
			sum += obj['sgv'];
			if (chart.options.usePointBackgroundColor) {
				dataset.pointBackgroundColor.push(scout.util.colorForSgv(obj['sgv']))
			}
		}
		var avg = Math.round(sum/dataset.data.length);
		console.debug("sgv avg", avg);
		var avgset = chart.config.data.datasets[1];
		avgset['data'] = [];
		for (var i=0; i<dataset.data.length; i++) {
			avgset['data'].push({
				x: dataset.data[i]['x'],
				y: avg
			});
		}
		chart.update();
	},

	trCallback: function(chart, fullData) {
		console.debug("trCallback", fullData);
		var data = fullData["tr"];
		var sgvData = fullData["sgv"];
		var dataset = chart.config.data.datasets[2];
		dataset.data = [];
		var yCoord = 80;
		for (var i=0; i<data.length; i++) {
			var obj = data[i];
			var pt = {
				x: moment(obj['created_at']),
				y: yCoord,
				r: obj['insulin']
			};
			if (pt['r']) {
				console.debug("bolus", obj['created_at'], pt);
				dataset.data.push(pt);
			} else console.debug("skipped non-bolus", obj['created_at'], pt);
		}
		chart.update();
	},


	load: function(canvasId, data, bolusData, extraConf) {
		var chart = scout.sgv.init(canvasId, extraConf);
		scout.sgv.callback(chart, data);
		if (bolusData) scout.sgv.bolusCallback(chart, bolusData, data);
		chart.update();
		return chart;
	}
};

scout.ds = {
	sgv: [],
	tr: [],
	devicestatus: [],
	/*
	cals: [],
	profiles: [],
	mbgs: []*/

	_add: function(type, data) {
		var cat = scout.ds[type];
		var adds = 0;
		for (var i=0; i<data.length; i++) {
			if (cat.filter(function(e) { return e['_id'] == data[i]['_id']; }).length == 0) {
				cat.push(data[i]);
				adds++;
			}
		}
		console.debug("ds.add["+type+"] "+adds+"/"+data.length);
		return adds;
	},

	// API poll
	add: function(type, data) {
		var adds = scout.ds._add(type, data);
		if (adds > 0) {
			scout.ds._sort(type);
			scout.ds._typeCallback(type);
		}
	},

	_convertSgv: function(sgv, prev) {
		// TODO: calculate delta
		return {
			'date': sgv['mills'],
			'dateString': moment(sgv['millis']).format(),
			'sysTime': moment(sgv['millis']).format(),
			'type': 'sgv',
			'delta': prev != null ? sgv['mgdl']-prev['mgdl'] : 0,
			'device': sgv['device'],
			'direction': sgv['direction'],
			'filtered': sgv['filtered'],
			'noise': sgv['noise'],
			'rssi': sgv['rssi'],
			'sgv': sgv['mgdl'],
			'unfiltered': sgv['unfiltered'],
			'_id': sgv['mills']
		};
	},

	_convertSgvs: function(sgvs) {
		console.debug("convertSgvs: ", sgvs);
		var upd = [];
		for (var i=0; i<sgvs.length; i++) {
			upd[i] = scout.ds._convertSgv(sgvs[i], i>0 ? sgvs[i-1] : null);
		}
		console.debug("convertSgvs done: ", upd);
		return upd;
	},

	// websocket
	deltaAdd: function(data) {
		// TODO: optimize typeCallback multiple-run (at least with re-rendering graph)
		console.debug("ds.deltaAdd:", data);
		if (data["sgvs"]) scout.ds.add("sgv", scout.ds._convertSgvs(data["sgvs"]));
		if (data["devicestatus"]) scout.ds.add("devicestatus", data["devicestatus"]);
		if (data["treatments"]) scout.ds.add("tr", data["treatments"]);
	},

	_typeCallback: function(type) {
		if (type == 'sgv') {
			scout.current.loadSgv(scout.ds.getLatest('sgv'));


			scout.sgv.primaryDSCallback();
			// update graph
		}
		else if (type == 'devicestatus') {
			scout.device.renderStatus(scout.ds['devicestatus']);
		}
		else if (type == 'treatments') {
			// update graph

			scout.sgv.primaryDSCallback();
		}
	},

	filter: function(type, filter) {
		return scout.ds[type].filter(filter);
	},

	_sort: function(type) {
		scout.ds[type].sort(function(a, b) {
			return a.date-b.date;
		});
		console.debug("ds.sort["+type+"]");
	},

	_dateCol: function(type) {
		if (type == 'sgv') return 'date';
		if (type == 'tr') return 'created_at';
	},

	getLatestHrs: function(type, hrs) {
		return scout.ds.filter(type, function(e) {
			return moment.duration(moment().diff(e[scout.ds._dateCol(type)])).asHours() <= hrs;
		});
	},

	getLatest: function(type) {
		var typ = scout.ds[type];
		return typ[typ.length-1];
	}
};

scout.current = {
	currentEntry: null,
	loadSgv: function(cur) {
		if (!cur) return;
		var new_data = (scout.current.currentEntry == null || scout.current.currentEntry['date'] != cur['date']);
		if (new_data) console.log("loadSgv new data @", new Date());
		scout.current.currentEntry = cur;

		var sgvText = cur['sgv'];
		var direction = scout.util.directionToArrow(cur['direction']);
		var delta = scout.util.fmtDelta(cur['delta']);
		var noise = scout.util.noise(cur['noise']);

		var curSgv = document.querySelector("#current_sgv");
		var curMins = document.querySelector("#current_minsago");

		curSgv.classList.remove('old-data');
		curMins.classList.remove('old-data');
		curSgv.classList.remove('missed-data');
		curMins.classList.remove('missed-data');

		if (scout.util.isOldData(cur['date'])) {
			direction = "old";
			curSgv.classList.add('old-data');
			curMins.classList.add('old-data');
			if (scout.current.shouldNotifyOldData(cur)) {
				console.debug("shouldNotifyOldData: yes");
				scout.current.notifyOldData(cur);
			} else console.debug("shouldNotifyOldData: no");
		} else if (scout.util.isMissedData(cur['date'])) {
			direction = "miss";
			curSgv.classList.add('missed-data');
			curMins.classList.add('missed-data');
		}

		curSgv.innerHTML = sgvText;
		curSgv.style.color = scout.util.colorForSgv(cur['sgv']);
		curMins.innerHTML = scout.util.timeAgo(cur['date']);
		document.querySelector("#current_direction").innerHTML = direction;
		document.querySelector("#current_delta").innerHTML = delta;
		if (noise.length > 2) {
			noise += "<br />";
		}
		document.querySelector("#current_noise").innerHTML = noise;

		var title = cur['sgv']+''+direction+' '+delta+' '+noise+' - scout';
		if (scout.config.modifyTitle) {
			var tobj = document.querySelector("title");
			if (tobj.innerHTML != title) tobj.innerHTML = title;
		}
		scout.current.updateFavicon(cur, new_data);
		scout.current.notify(cur);
	},

	updateFavicon: function(cur, alternate) {
		scout.util.modifyFavicon(scout.current.buildBgIcon(cur));
		if (alternate) {
			setTimeout(function() {
				console.debug("favicon tick");
				scout.util.modifyFavicon(scout.current.buildBgIcon(cur, true));
				setTimeout(function() {
					console.debug("favicon tock");
					scout.util.modifyFavicon(scout.current.buildBgIcon(cur, false));
				}, scout.config.favicon_alternate_ms);
			}, scout.config.favicon_alternate_ms);
		}
	},

	buildBgIcon: function(cur, show_delta) {
		var sgv = parseInt(cur['sgv']);
		var delta = scout.util.fmtDelta(cur['delta']);
		var arrow = scout.util.directionToThickArrow(cur['direction']);
		var noise = scout.util.noise(cur['noise']);
		if (noise.length > 1) arrow = noise.substring(0, 1);
		var canvas = document.getElementById("favicon_canvas");
		
		with (canvas.getContext("2d")) {
			clearRect(0, 0, canvas.width, canvas.height);
			if (scout.util.isOldData(cur['date'])) {
				var tline = "old";
				var tdiff = scout.util.getShortTimeDiff(cur['date']);
				fillStyle = "rgb(255,255,255)";
				fillRect(0, 0, 64, 64);

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = "30px Arial";
				fillText(tdiff, 32, 30);

				font = "40px Arial";
				fillText(tline, 32, 63);
			} else if (scout.util.isMissedData(cur['date'])) {
				var tdiff = scout.util.getShortTimeDiff(cur['date']);
				fillStyle = scout.util.bgColorForSgv(sgv);
				fillStyle = "rgb(255,255,255)";
				fillRect(0, 0, 64, 64);

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				font = "30px Arial";
				fillText(tdiff, 32, 30);

				font = "40px Arial";
				fillText(sgv, 32, 63);
			} else {
				fillStyle = scout.util.bgColorForSgv(sgv);
				fillRect(0, 0, 64, 64);

				fillStyle = "rgb(0,0,0)";
				textAlign = "center";

				if (show_delta) {
					font = "30px Arial";
					if (delta.length > 4 && delta.indexOf(".") != -1) {
						delta = delta.split(".")[0];
					}
					fillText(delta, 32, 30);
					textAlign = "center";
				} else {
					font = "bold 40px Arial";
					fillText(arrow, 32, 30);
				}

				font = "40px Arial";
				fillText(sgv, 32, 63);
			}
		}
		return canvas.toDataURL("image/png");
	},

	shouldNotify: function(cur) {
		return (
			cur['noise'] > 1 || 
			cur['sgv'] < scout.config.sgv.target_min || 
			cur['sgv'] > scout.config.sgv.target_max ||
			Math.abs(cur['delta']) >= scout.config.sgv.spike_delta
		) && (cur["_id"] != scout.current.nflast["_id"]);
	},

	nfobj: null,
	nflast: {"_id": null},

	notify: function(cur, force) {
		if (!("Notification" in window)) {
			console.error("No Notification object");
			return;
		}
		if (Notification.permission == "granted") {
			var shouldNotify = scout.current.shouldNotify(cur);
			console.debug("notify", shouldNotify, "force:", force);
			if (shouldNotify || !!force) {
				scout.current.nflast = cur;
				var direction = scout.util.directionToArrow(cur['direction']);
				var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
				var noise = scout.util.noise(cur['noise']);

				var text = "BG level is "+cur['sgv']+""+direction;
				var body = "Delta: "+delta+" "+noise;
				var bgIcon = scout.current.buildBgIcon(cur);
				var options = {
					body: body,
					icon: bgIcon,
					badge: bgIcon,
					tag: "scout-notify"
				}
				if (scout.current.nfobj) scout.current.nfobj.close();
				scout.current.nfobj = new Notification(text, options);
				scout.current.nfobj.onclick = function(event) {
					window.focus();
					document.body.focus();
					this.close();
				}
				setTimeout(function() {
					scout.current.nfobj.close()
				}, scout.config.notification_ms);
				return scout.current.nfobj;
			}
		} else if (Notification.permission != "denied") {
			console.error("Notification permission status:", Notification.permission);
			Notification.requestPermission(function(permission) {
				if (permission == "granted") scout.current.notify(cur);
			});
		} else {
			console.error("Notification permission status:", Notification.permission);
		}
	},

	notifyOldData: function(cur) {
		if (!("Notification" in window)) {
			console.error("No Notification object");
			return;
		}
		if (Notification.permission == "granted") {
			console.debug("notifyOldData", cur);

			var direction = scout.util.directionToArrow(cur['direction']);
			var delta = cur['delta'] > 0 ? '+'+scout.util.round(cur['delta'], 1) : scout.util.round(cur['delta'], 1);
			var noise = scout.util.noise(cur['noise']);

			var text = "Old data: " + scout.util.timeAgo(cur['date']);
			var body = "BG: "+cur['sgv']+" Delta: "+delta+" "+noise;
			var bgIcon = scout.current.buildBgIcon(cur);
			var options = {
				body: body,
				icon: bgIcon,
				badge: bgIcon,
				tag: "scout-notify"
			}
			if (scout.current.nfobj) scout.current.nfobj.close();
			scout.current.nfobj = new Notification(text, options);
			scout.current.nfobj.onclick = function(event) {
				window.focus();
				document.body.focus();
				this.close();
			}
			setTimeout(function() {
				scout.current.nfobj.close()
			}, scout.config.notification_ms);
			return scout.current.nfobj;
		} else if (Notification.permission != "denied") {
			console.error("Notification permission status:", Notification.permission);
			Notification.requestPermission(function(permission) {
				if (permission == "granted") scout.current.notify(cur);
			});
		} else {
			console.error("Notification permission status:", Notification.permission);
		}
	},

	shouldNotifyOldData: function(cur) {
		var reload = 60/parseInt(scout.config.reload_ms/1000);
		return parseInt(scout.util.minsAgo(cur['date'])*reload) % (scout.config.notifyOldData_mins*reload) < 1;
	}
};

scout.sgvfetch = function(args, cb) {
	var parsed = "";
	if (args.count) parsed += "&count="+args.count;
	if (args.date) {
		if (args.date.gte) parsed += "&find[dateString][$gte]=" + args.date.gte;
		if (args.date.lte) parsed += "&find[dateString][$lte]=" + args.date.lte;
	}
	parsed += "&ts=" + (+new Date());
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.sgvEntries+"?"+parsed, function(resp) {
		var data = JSON.parse(resp.text);
		scout.ds.add("sgv", data);
		cb(data);
	});
}

scout.fetch = function(args, cb) {
	scout.sgvfetch(args, function(sgv) {
		scout.trfetch(args, function(tr) {
			cb({
				"sgv": sgv,
				"tr": tr
			});
		});
	});
}

scout.fetch.gte = function(fmt, cb) {
	return scout.fetch({date: {"gte": fmt}, count: 99999}, cb);
}

scout.fetch.range = function(st, end, cb) {
	// "find[dateString][$gte]="+st+"&find[dateString][$lte]="+end+"&count=99999
	return scout.fetch({"date": {"gte": st, "lte": end}, "count": 99999}, cb);
}

scout.fetch.eq = function(fmt, cb) {
	return scout.fetch.range(fmt, moment(fmt).add({hours: 24}).format(), cb);
}

scout.fetch.halfday = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 12}).format(), cb);
}

scout.fetch.today = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 24}).format(), cb);
}

scout.fetch.threeday = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 72}).format(), cb);
}

scout.fetch.week = function(cb) {
	return scout.fetch.gte(moment().subtract({hours: 168}).format(), cb);
}

scout.device = {
	fetchStatus: function(count, cb) {
		superagent.get(scout.config.urls.apiRoot + scout.config.urls.deviceStatus + "?count=" + parseInt(count) + "&ts=" + (+new Date()), function(resp) {
			var data = JSON.parse(resp.text);
			scout.ds.add('devicestatus', data);
			cb(data);
		});
	},

	fetchSensorStart: function(cb) {
		scout.trfetch({
			eventType: "Sensor+Start",
			date: {
				gte: 2017
			},
			count: 1
		}, cb);
	},

	renderStatus: function(data) {
		var latest = data[0];
		console.log("latest devicestatus:", latest);
		document.querySelector("#device_battery").innerHTML = latest["uploader"]["battery"];
		document.querySelector("#device_name").innerHTML = latest["device"];
	},

	renderSensor: function(trData) {
		var latest = trData[0];
		console.log("latest sensorstart:", latest);
		document.querySelector("#cgm_sensor_age").innerHTML = moment(latest["created_at"]).fromNow();
	},

	update: function() {
		scout.device.fetchStatus(1, scout.device.renderStatus);

		scout.device.fetchSensorStart(scout.device.renderSensor);
	}
};

scout.trfetch = function(args, cb) {
	var parsed = "";
	if (args.count) parsed += "&count="+args.count;
	if (args.date) {
		if (args.date.gte) parsed += "&find[created_at][$gte]=" + scout.util.convertTrDate(args.date.gte);
		if (args.date.lte) parsed += "&find[created_at][$lte]=" + scout.util.convertTrDate(args.date.lte);
	}
	if (args.eventType) parsed += "&find[eventType]=" + escape(args.eventType);
	parsed += "&ts=" + (+new Date())
	console.debug("trfetch", args, parsed);
	superagent.get(scout.config.urls.apiRoot + scout.config.urls.treatments+"?"+parsed, function(resp) {
		var data = JSON.parse(resp.text);
		scout.ds.add("tr", data);
		cb(data);
	});
};

scout.trfetch.bolus = function(args, cb) {
	args["eventType"] = "Meal Bolus";
	return scout.trfetch(args, cb);
}

scout.trfetch.bolus.gte = function(fmt, cb) {
	return scout.trfetch.bolus({date: {"gte": fmt}, count: 99999}, cb);
}

scout.trfetch.bolus.range = function(st, end, cb) {
	return scout.trfetch.bolus({date: {"gte": st, "lte": end}, count: 99999}, cb);
}

scout.trfetch.bgcheck = function(args, cb) {
	args["eventType"] = "BG Check";
	return scout.trfetch(args, cb);
}

scout.trfetch.bgcheck.gte = function(fmt, cb) {
	return scout.trfetch.bgcheck({date: {"gte": fmt}, count: 99999}, cb);
}

scout.trfetch.bgcheck.range = function(st, end, cb) {
	return scout.trfetch.bgcheck({date: {"gte": st, "lte": end}, count: 99999}, cb);
}

// Sensor Age Bar chart
scout.sab = {
	init: function(canvasId, extraConf) {
		var sabCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var sabConf = Object.assign({}, scout.chartConf.sab);

		// hack for deep copy of data fields.
		sabConf.data = JSON.parse(JSON.stringify(scout.chartConf.sab.data));
		return new Chart(sabCtx, sabConf);
	},

	callback: function(chart, data) {
		var dataset = chart.data.datasets[0];
		var times = [];
		for (var i=0; i<data.length; i++) {
			var time = data[i]['created_at'];
			times.push(moment(time));
		}

		// oldest to newest
		times.sort(function(a, b) { return a-b; });
		for (var i=0; i<times.length; i++) {
			var nxt = new Date();
			if (i-1 != times.length) {
				nxt = times[i+1];
			}
			var diff = moment.duration(moment(nxt).diff(times[i]));
			dataset.data.push({
				x: times[i],
				y: diff.asDays()
			});
			dataset.backgroundColor.push(scout.util.sensorAgeColor(diff.asHours()));
		}

	},

	load: function(canvasId, data, extraConf) {
		var chart = scout.sab.init(canvasId, extraConf);
		scout.sab.callback(chart, data);
		chart.update();
		return chart;
	}
};

scout.sensorAge = {
	init: function() {
		scout.trfetch({
			count: 9999,
			eventType: "Sensor Start",
			date: {
				gte: 2017
			}
		}, function(data) {
			scout.sab.load("sageBarCanvas", data);
			scout.sensorAge.currentStatus(data);
		});
	},

	currentStatus: function(data) {
		var cont = document.getElementById("sensor_age_status");
		var data = scout.sensorAge.currentStatusData(data);
		cont.innerHTML = scout.tpl.renderHTML("sensor_age_status_tpl", data);
	},

	currentStatusData: function(data) {
		var latest = data[0];
		var created = moment(latest['created_at']);
		var avgAge = scout.sensorAge.avgAgeHours(data);
		return {
			"sensor_last_inserted": created.format(scout.config.timeFormat+" a"),
			"current_sensor_age": scout.util.fmtDuration(moment().diff(created)),
			"avg_sensor_age": scout.util.fmtDuration(moment.duration({hours: avgAge}))
		}
	},

	avgAgeHours: function(data) {
		var hrs = [];
		var times = [];
		for (var i=0; i<data.length; i++) {
			var time = data[i]['created_at'];
			times.push(moment(time));
		}

		// oldest to newest
		times.sort(function(a, b) { return a-b; });
		for (var i=0; i<times.length; i++) {
			if (i-1 != times.length) {
				var nxt = times[i+1];
				var diff = moment.duration(moment(nxt).diff(times[i]));
				hrs.push(diff.asHours());
			}
		}
		var avg = 0;
		for (var i=0; i<hrs.length; i++) {
			avg += hrs[i];
		}
		return avg/hrs.length;
	}
};

// Battery status chart
scout.bat = {
	init: function(canvasId, extraConf) {
		var batCtx = document.getElementById(canvasId).getContext("2d");
		// single-layer copy. can't use full deep copy due to moment()
		var batConf = Object.assign({}, scout.chartConf.bat);

		// hack for deep copy of data fields.
		batConf.data = JSON.parse(JSON.stringify(scout.chartConf.bat.data));
		return new Chart(batCtx, batConf);
	},

	callback: function(chart, data) {
		var dataset = chart.data.datasets[0];
		dataset.backgroundColor = [];
		dataset.borderColor = [];
		var pcts = [];
		for (var i=0; i<data.length; i++) {
			var pct = parseInt(data[i]['uploader']['battery']);
			var time = moment(data[i]['created_at']);
			dataset.data.push({
				x: time,
				y: pct
			});
			dataset.backgroundColor.push(scout.util.batColor(pct));
			dataset.borderColor.push(scout.util.batColor(pct));
		}

	},

	load: function(canvasId, data, extraConf) {
		var chart = scout.bat.init(canvasId, extraConf);
		scout.bat.callback(chart, data);
		chart.update();
		return chart;
	}
};

scout.uploaderBat = {
	init: function() {
		scout.uploaderBat.refreshGraph();
	},

	getReadingsCount: function() {
		var readings = document.getElementById("uploader_bat_readings");
		if (!readings) {
			return scout.config.uploaderBat_default_readings;
		}
		return parseInt(readings.value);
	},

	currentStatus: function(data) {
		var cont = document.getElementById("uploader_bat_status");
		var data = scout.uploaderBat.currentStatusData(data);
		cont.innerHTML = scout.tpl.renderHTML("uploader_bat_status_tpl", data);
	},

	currentStatusData: function(data) {
		var latest = data[0];
		var created = moment(latest['created_at']);
		return {
			"current_bat": latest["uploader"]["battery"],
			"current_bat_date": created.format(scout.config.timeFormat+" a"),
			"readings": scout.uploaderBat.getReadingsCount()
		};
	},

	updateCanvas: function(data) {
		var cont = document.getElementById("uploader_bat_canvas_container");
		cont.innerHTML = scout.tpl.renderHTML("uploader_bat_canvas_tpl", {});
		scout.bat.load("uploaderBatCanvas", data);
	},

	refreshCurrentStatus: function() {
		scout.device.fetchStatus(1, function(data) {
			scout.uploaderBat.currentStatus(data);
		});
	},

	refreshGraph: function() {
		scout.device.fetchStatus(scout.uploaderBat.getReadingsCount(), function(data) {
			console.log("uploaderBat", data);
			scout.uploaderBat.updateCanvas(data);
			scout.uploaderBat.currentStatus(data);
		});
	}
};

scout.ws = {
	socket: null,
	silentInit: function() {
		scout.ws.socket = io(scout.config.urls.domainRoot);
		var socket = scout.ws.socket;
		
		socket.on('connect', function() {
		    console.log('Client connected to server.');
		    var history = 48;
		    socket.emit('authorize', {
		        client: 'web',
		        secret: null,
		        token: null,
		        history: history
		    }, function authCallback(data) {
		        console.log('Client rights:', data);
		    });
		  });

		socket.on('dataUpdate', function(data) {
			console.log('SilentDataUpdate', data);
			scout.ws.foo++;
			//scout.ds.deltaAdd(data);
		});
	},
	foo: 0,
	init: function() {
		scout.ws.socket = io(scout.config.urls.domainRoot);
		var socket = scout.ws.socket;
		
		socket.on('connect', function() {
		    console.log('Client connected to server.');
		    var history = 48;
		    socket.emit('authorize', {
		        client: 'web',
		        secret: null,
		        token: null,
		        history: history
		    }, function authCallback(data) {
		        console.log('Client rights:', data);
		    });
		  });

		socket.on('dataUpdate', function(data) {
			console.log('dataUpdate', data);
			scout.ds.deltaAdd(data);
		});
	}
};

scout.init = {
	fetch: function() {
		if (scout.config.fetch_mode == 'ajax') {
			scout.init.ajax();
			scout.init.silentWebsocket();
		} else if (scout.config.fetch_mode == 'websocket') {
			scout.init.websocket();
		}
	},

	ajax: function() {
		scout.sgv.currentLength = scout.fetch.halfday;
		scout.sgv.currentLength(scout.sgv.primaryCallback);
		setInterval(function() {
			scout.sgv.currentLength(scout.sgv.primaryCallback);
		}, scout.config.reload_ms);
		scout.device.update();
	},

	websocket: function() {
		var scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = scout.config.urls.domainRoot + scout.config.urls.socketio_js;
		scr.onload = scout.ws.init;
		document.body.appendChild(scr);
	},
	silentWebsocket: function() {
		var scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = scout.config.urls.domainRoot + scout.config.urls.socketio_js;
		scr.onload = scout.ws.silentInit;
		document.body.appendChild(scr);
	}
};

Chart.defaults.global.plugins.datalabels.display = false;
Chart.defaults.global.animation.duration = 250;
Chart.pluginService.register({
	afterUpdate: function (chart) {
		if (chart.config.options.elements.center) {
			var helpers = Chart.helpers;
			var centerConfig = chart.config.options.elements.center;
			var globalConfig = Chart.defaults.global;
			var ctx = chart.chart.ctx;

			var fontStyle = helpers.getValueOrDefault(centerConfig.fontStyle, globalConfig.defaultFontStyle);
			var fontFamily = helpers.getValueOrDefault(centerConfig.fontFamily, globalConfig.defaultFontFamily);

			if (centerConfig.fontSize)
				var fontSize = centerConfig.fontSize;
			// figure out the best font size, if one is not specified
			else {
				ctx.save();
				var fontSize = helpers.getValueOrDefault(centerConfig.minFontSize, 1);
				var maxFontSize = helpers.getValueOrDefault(centerConfig.maxFontSize, 256);
				var maxText = helpers.getValueOrDefault(centerConfig.maxText, centerConfig.text);

				do {
					ctx.font = helpers.fontString(fontSize, fontStyle, fontFamily);
					var textWidth = ctx.measureText(maxText).width;

					// check if it fits, is within configured limits and that we are not simply toggling back and forth
					if (textWidth < chart.innerRadius * 2 && fontSize < maxFontSize)
						fontSize += 1;
					else {
						// reverse last step
						fontSize -= 1;
						break;
					}
				} while (true)
				ctx.restore();
			}

			// save properties
			chart.center = {
				font: helpers.fontString(fontSize, fontStyle, fontFamily),
				fillStyle: helpers.getValueOrDefault(centerConfig.fontColor, globalConfig.defaultFontColor)
			};
		}
	},
	afterDraw: function (chart) {
		if (chart.center) {
			var centerConfig = chart.config.options.elements.center;
			var ctx = chart.chart.ctx;

			ctx.save();
			ctx.font = chart.center.font;
			ctx.fillStyle = chart.center.fillStyle;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			var centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
			var centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
			ctx.fillText(centerConfig.text, centerX, centerY);
			ctx.restore();
		}
	},
});

window.onload = function() {
	scout.sgv.primaryInit();
	scout.init.fetch();
};
