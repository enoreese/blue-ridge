/*FormWizard Init*/
$(function () {
	"use strict";

	/* Basic Wizard Init*/
	if ($('#example-basic').length > 0)
		$("#example-basic").steps({
			headerTag: "h3",
			bodyTag: "section",
			transitionEffect: "fade",
			autoFocus: true,
			titleTemplate: '<span class="number">#index#</span> #title#',
		});

	if ($('#example-advanced-form').length > 0) {
		var form_2 = $("#example-advanced-form");
		form_2.steps({
			headerTag: "h3",
			bodyTag: "fieldset",
			transitionEffect: "fade",
			titleTemplate: '#title#',
			labels: {
				finish: "Start Bot",
				next: "Next",
				previous: "Previous",
			},
			onStepChanging: function (event, currentIndex, newIndex) {
				// Allways allow previous action even if the current form is not valid!
				if (currentIndex > newIndex) {
					return true;
				}
				// Forbid next action on "Warning" step if the user is to young
				if (newIndex === 3 && Number($("#age-2").val()) < 18) {
					return false;
				}
				// Needed in some cases if the user went back (clean up)
				if (currentIndex < newIndex) {
					// To remove error styles
					form_2.find(".body:eq(" + newIndex + ") label.error").remove();
					form_2.find(".body:eq(" + newIndex + ") .error").removeClass("error");
				}

				var e = document.getElementById("sub");
				var sub = e.options[e.selectedIndex].value;

				console.log(sub)
				let amount, sub_text;
				if (sub === '1') {
					amount = 100;
					sub_text = '1 Month Subscription'
				} if (sub === '3') {
					amount = 300;
					sub_text = '3 Months Subscription'
				} if (sub === '6') {
					amount = 600;
					sub_text = '6 Months Subscription'
				} if (sub === '9') {
					amount = 900;
					sub_text = '9 Months Subscription'
				} if (sub === '12') {
					amount = 1200;
					sub_text = '12 Months Subscription'
				}

				console.log(amount);
				console.log(sub_text)
				document.getElementById("sub_details").textContent = sub_text;
				document.getElementById("amt_details_1").textContent = '$' + String(amount);
				document.getElementById("amt_details").textContent = '$' + String(amount);

				form_2.validate().settings.ignore = ":disabled,:hidden";
				return form_2.valid();
			},
			onFinishing: function (event, currentIndex) {
				form_2.validate().settings.ignore = ":disabled";
				return form_2.valid();
			},
			onFinished: function (event, currentIndex) {
				// var modal = document.getElementById("sub");
				$('#enterPinModal').modal('show');
				// alert("Submitted!");
			}
		}).validate({
			errorPlacement: function errorPlacement(error, element) { element.before(error); },
			rules: {
				confirm: {
					equalTo: "#password-2"
				}
			}
		});
	}

	$('#datable_1').DataTable({
		"bFilter": false,
		"bLengthChange": false,
		"bPaginate": false,
		"bInfo": false,
		"footerCallback": function (row, data, start, end, display) {
			var api = this.api(), data;

			// Remove the formatting to get integer data for summation
			var intVal = function (i) {
				return typeof i === 'string' ?
					i.replace(/[\$,]/g, '') * 1 :
					typeof i === 'number' ?
						i : 0;
			};

			// Total over all pages
			var total = api
				.column(3)
				.data()
				.reduce(function (a, b) {
					return intVal(a) + intVal(b);
				}, 0);

			// Total over this page
			var pageTotal = api
				.column(3, { page: 'current' })
				.data()
				.reduce(function (a, b) {
					return intVal(a) + intVal(b);
				}, 0);

			// Update footer
			$(api.column(3).footer()).html(
				'$' + pageTotal
			);
		}
	});

});
