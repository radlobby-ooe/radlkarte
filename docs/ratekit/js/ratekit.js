/*!
 * RateKit
 * @version 1.0.0
 * https://ratekit.com
 */

$ = jQuery;

rateKitFunc=function() {

	var $input = $('.rating');
	if ($input.length) {
		$input.each(function (index, el) {
			if ($(el).attr('data-readonly') == 'true') {
				initReadOnlyRating(el);
				return;
			}
			fetchRating(el);
		});
	}

	var $inputbuttons = $('.rating-button');
	if ($inputbuttons.length) {
		$inputbuttons.each(function (index, el) {
			$(el).click(function() {
				let id = $(this).data('rating-id');
				let value = $(this).data('rating-value');
				$(this).prop("disabled",true);
				//console.log("clicked button "+id+" with value "+value);
				$('#' + id).trigger("change").trigger("rating.change", [value]);
				$('[data-rating-id="'+id+'"]').each(function() {
					$(this).prop("disabled",true);
				});
			});
		});
	}

	function initReadOnlyRating(el) {
		var $input = $(el);
		var value = $input.val();
		$input
			.removeClass('rating-loading')
			.addClass('rating-loading')
			.rating({
				showCaption: false,
				showClear  : false,
				animate    : false,
				readonly   : true
			});
	}

	function fetchRating(el) {
		var $input = $(el),
			id = $input.attr('id');
		$.getJSON('ratekit/api/rating.php',
			{
				item: id
			}
		).done(function (data) {
			$input
				.attr('value', data.overall_rating)
				.removeClass('rating-loading')
				.addClass('rating-loading')
				.rating({
					showCaption: false,
					showClear  : false,
					animate    : false
				});

			console.log("Rating count to set "+data.count);
			$input.closest(".rating-gui").find('.rating-count').html(data.count);


			// Add event handler
			var eventHandler = makeEventHandler($input);
			$input.on('rating.change', eventHandler);
		}).fail(function (data) {
			console.log(data);
		});
	}

	function makeEventHandler($input) {
		return function setRating(event, value) {
			//console.log("setRating called with event "+event+", value "+value);
			var id = $input.attr('id');

			//disable direct rating buttons
			$('[data-rating-id="'+id+'"]').each(function() {
				$(this).prop("disabled",true);
			});

			$.getJSON('ratekit/api/rating.php',
				{
					item  : id,
					rating: value
				}
			).done(function (data) {
				if (data.status === 'error') {
					resetAndLockRating($input, data.rating);
				} else {
					acceptRating($input, data);

					console.log("Rating count to set "+data.count);
					$input.closest(".rating-gui").find('.rating-count').html(data.count);				}

			}).fail(function (data) {
				console.log(data);
			});
		}
	}

	function resetAndLockRating($input, rating) {
		$input.rating('clear');
		renderCaption($input, 'Bereits bewertet ' + rating, 'label-danger').delay(1500).fadeOut(500);
		setTimeout(function () {
			$input.rating('reset');
			$input.rating('refresh', {readonly: true, showCaption: false});
			renderCaption($input, 'durchschn. Bewertung ' + parseFloat($input.val())).delay(2250).fadeOut(500);
		}, 2250);
	}

	function acceptRating($input, data) {
		renderCaption($input, 'Ihre Bewertung ' + data.rating, 'label-success').delay(1500).fadeOut(500);
		setTimeout(function () {
			$input.rating('clear');
			$input.rating('update', data.overall_rating);
			$input.rating('refresh', {readonly: true, showCaption: false});
			$input.attr('value', data.overall_rating);
			renderCaption($input, 'durchschn. Bewertung ' + parseFloat(data.overall_rating)).delay(2250).fadeOut(500);
		}, 2000);
	}

	function renderCaption($input, message, cssClass) {
		if (cssClass) {
			cssClass = 'label ' + cssClass;
		} else {
			cssClass = 'label label-black';
		}
		var ratingContainer = $input.closest('.star-rating');
		ratingContainer.find('.caption').remove();
		var caption = $('<div/>', {'class': 'caption'});
		var span = $('<span/>', {
			'class': cssClass,
			text   : message
		});
		caption.append(span);
		ratingContainer.append(caption);
		return caption;
	}

}

$(rateKitFunc())
