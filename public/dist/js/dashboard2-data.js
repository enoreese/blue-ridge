/*Dashboard Init*/
 
"use strict"; 

/*****Ready function start*****/
$(document).ready(function(){
	$('#statement').DataTable({
		"bFilter": false,
		"bLengthChange": false,
		"bPaginate": false,
		"bInfo": false,
	});


if($('#chart_1').length > 0) {
	// Line Chart
	var data=[{
		period: 'January',
		USDJPY: 50,
		GBPAUD: 80,
		AUDZAR: 20
	}, {
		period: 'February',
		USDJPY: 130,
		GBPAUD: 100,
		AUDZAR: 80
	}, {
		period: 'March',
		USDJPY: 80,
		GBPAUD: 60,
		AUDZAR: 70
	}, {
		period: 'April',
		USDJPY: 70,
		GBPAUD: 200,
		AUDZAR: 140
	}, {
		period: 'May',
		USDJPY: 180,
		GBPAUD: 150,
		AUDZAR: 140
	}, {
		period: 'June',
		USDJPY: 105,
		GBPAUD: 100,
		AUDZAR: 80
	},
	 {
		period: 'July',
		USDJPY: 250,
		GBPAUD: 150,
		AUDZAR: 200
	}];
	var dataNew=[{
		period: 'January',
		USDJPY: 10,
		GBPAUD: 80,
		AUDZAR: 40
	}, {
		period: 'February',
		USDJPY: 110,
		GBPAUD: 150,
		AUDZAR: 80
	}, {
		period: 'March',
		USDJPY: 80,
		GBPAUD: 60,
		AUDZAR: 70
	}, {
		period: 'April',
		USDJPY: 70,
		GBPAUD: 100,
		AUDZAR: 190
	}, {
		period: 'May',
		USDJPY: 180,
		GBPAUD: 150,
		AUDZAR: 140
	}, {
		period: 'June',
		USDJPY: 315,
		GBPAUD: 100,
		AUDZAR: 80
	},
	 {
		period: 'July',
		USDJPY: 850,
		GBPAUD: 120,
		AUDZAR: 100
	}];
	var lineChart = Morris.Area({
		element: 'chart_1',
		data: data,
		xkey: 'period',
		ykeys: ['USDJPY', 'GBPAUD', 'AUDZAR'],
		labels: ['USDJPY', 'GBPAUD', 'AUDZAR'],
		pointSize: 3,
		lineWidth: 2,
		pointStrokeColors:['#ff6028'],
		pointFillColors:['#ffffff'],
		behaveLikeLine: true,
		gridLineColor: 'rgba(33,33,33,0.1)',
		smooth: false,
		hideHover: 'auto',
		lineColors: ['#ffcfbe', '#ff6028', '#c63300'],
		resize: true,
		gridTextColor:'#878787',
		gridTextFamily:"Roboto",
		parseTime: false,
		fillOpacity:0.4
	});	
	/* Switchery Init*/
	var elems = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
	$('#morris_switch').each(function() {
		new Switchery($(this)[0], $(this).data());
	});
	var swichMorris = function() {
		if($("#morris_switch").is(":checked")) {
			lineChart.setData(data);
			lineChart.redraw();
		} else {
			lineChart.setData(dataNew);
			lineChart.redraw();
		}
	}
	swichMorris();	
	$(document).on('change', '#morris_switch', function () {
		swichMorris();
	});	
	}
});
/*****Ready function end*****/

/*****Load function start*****/
$(window).on("load",function(){
	window.setTimeout(function(){
		$.toast({
			heading: 'Welcome back to Blueridge',
			// text: 'Use the predefined ones, or specify a custom position object.',
			position: 'bottom-right',
			loaderBg:'#e8af48',
			icon: 'success',
			hideAfter: 3500, 
			stack: 6
		});
	}, 3000);
});
/*****Load function* end*****/

/*****E-Charts function start*****/
var echartsConfig = function() { 
}
/*****E-Charts function end*****/

/*****Sparkline function start*****/
var sparklineLogin = function() { 
	if( $('#sparkline_6').length > 0 ){
		$("#sparkline_6").sparkline([9,7,7,8,8,6,8,5,6], {
			type: 'bar',
			width: '100%',
			height: '155',
			barWidth: '8',
			resize: true,
			barSpacing: '10',
			barColor: '#ff6028',
			highlightSpotColor: '#ff6028'
		});
	}	
}
/*****Sparkline function end*****/

/*****Resize function start*****/
var sparkResize,echartResize;
$(window).on("resize", function () {
	/*Sparkline Resize*/
	clearTimeout(sparkResize);
	sparkResize = setTimeout(sparklineLogin, 200);
	
	/*E-Chart Resize*/
	clearTimeout(echartResize);
	echartResize = setTimeout(echartsConfig, 200);
}).resize(); 
/*****Resize function end*****/

/*****Function Call start*****/
sparklineLogin();
echartsConfig();
/*****Function Call end*****/