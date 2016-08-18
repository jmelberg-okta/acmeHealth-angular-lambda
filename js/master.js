;(function($) {
	
	$('#LoginForm').each(function() {
		
		$(this).submit(function(e) {
			
			e.preventDefault();
			
			$('.FormField--submit .Button--white', this).addClass('Button--loading');
			
			setTimeout(function() {
				
				window.location = $(this).attr('action');
				
			}.bind(this), 1000);
			
		});
		
	});
	
})(jQuery);