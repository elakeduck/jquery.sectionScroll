/*
 *	Section Scroll Plugin
 *	Copyright (c) 2016 Michael Lehmann
 */
 (function ($) {
	var pluginName = 'sectionScroll';
	
	$[pluginName] = function(container, options) {
		this.container = $(container);
		return this.init(options);
	};
	$[pluginName].defaults = {
		items : '.' + pluginName,
		autoUpdate : true,
		distance : '25%',
		duration : 500,
		easing : 'easeOutExpo',
		scrollTimeout : 150,
		afterScrollTimeout : 500,
		navPages : true
	}
	
	$[pluginName].prototype = {
		items : [],
		opts : [],
		minScrollDistance : 0,
		busy : false,
		lastScroll : 0,
		currentItem : 0,
		navPagesWrap : null,
		containerHeight : 0,
		
		init : function(options) {
			var	s = this,
				resizeTimeout = null,
				object = s.container[0]==window ? $('body') : s.container;
				
			s.opts = $.extend({}, $[pluginName].defaults, options);
			
			var children = object.find(s.opts.items);
			
			if (children.length!=0) {
				if (s.opts.navPages) {
					s.navPagesWrap = $('<div class="' + pluginName + 'Pages">').appendTo(object).wrap('<div class="' + pluginName + 'PagesWrap">');
				}
				s.addItems(children);
				
				s.minScrollDistance = s._getMinScrollDistance();
				s.updateItems();
				
				if (s.opts.autoUpdate) {
					$(window).on('resize.' + pluginName, function() {
						if (resizeTimeout!=null) clearTimeout(resizeTimeout);
						resizeTimeout = setTimeout(function() {
							s.minScrollDistance = s._getMinScrollDistance();
							s.updateItems();
							s.scrollTo(s.currentItem);
						}, 100);
					});
				}
				
				//bind scroll/pan
				s._bind();
			}
        },
		
		_getMinScrollDistance : function() {
			var	s = this,
				regex = /^(\d{1,2}(\.\d+)?)%$/,
				m;
			s.containerHeight = s.container.height();
				
			if (typeof(s.opts.distance)==='string' && (m=regex.exec(s.opts.distance))!==null) {
				return s.containerHeight * m[1] / 100;
			} else if (typeof(s.opts.distance)==='number') {
				return (s.opts.distance<s.containerHeight) ? s.opts.distance : s.containerHeight;
			} else {
				m = regex.exec($[pluginName].defaults.distance);
				return s.containerHeight * m[1] / 100;
			}
		},
		
		_preventDefault : function(e) {
			e = e || window.event;
			if (e.preventDefault)
				e.preventDefault();
			e.returnValue = false;  
		},
		
		_preventDefaultForScrollKeys : function(e) {
			// left: 37, up: 38, right: 39, down: 40,
			// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
			var	s = this,
				keys = {32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 38: 1, 40: 1};
			if (keys[e.which]) {
				s._preventDefault(e);
				return false;
			}
		},
		
		_disableScroll : function(object) {
			var s = this;
			object = object || s.container;
			object.on('mousewheel.' + pluginName + ' wheel.' + pluginName + ' touchmove.' + pluginName + ' keydown.' + pluginName, function(event) {
				if (event.type=='keydown') {
					s._preventDefaultForScrollKeys(event);
				} else {
					s._preventDefault(event);
				}
			});
		},
		
		_enableScroll : function (object) {
			var s = this;
			object = object || s.container;
			object.off('mousewheel.' + pluginName + ' wheel.' + pluginName + ' touchmove.' + pluginName + ' keydown.' + pluginName);
		},
				
		_itemProps : function(item) {
			var style = item.attr("style"),
				offsetTop = 0;
			
			item.removeAttr("style");
			offsetTop = item.offset().top;

			return {
				item : item.attr("style", style),
				start : offsetTop,
				end : offsetTop + item.height()
			};
		},
		
		_bind : function() {
			var s = this,
				scrollTimeout = null,
				delta = 0;
			s.lastScroll = s.container.scrollTop();
			
			s._setPage();
			
			s.container.on('scroll.' + pluginName, function(ev) {
				if (!s.busy) {
					if (scrollTimeout!=null) {
						clearTimeout(scrollTimeout);
					}
					
					scrollTimeout = setTimeout(function() {
						delta = 0;
						s.scrollTo(s.currentItem);
					}, s.opts.scrollTimeout);
					
					delta = s.lastScroll - s.container.scrollTop();

					if (delta>s.minScrollDistance || (delta*-1)>s.minScrollDistance) {
						s.lastScroll = s.lastScroll + (delta*-1);
						clearTimeout(scrollTimeout);
						s.scrollTo(s._getPos((delta<0 ? 'down' : 'up' )));
						delta = 0;
					}
				}
			});
		},
		
		_unbind :  function() {
			var s = this
			s.container.off('scroll.' + pluginName);
		},
		
		_getPos : function(direction) {
			var s = this,
				testPage = s._getPage();
			if (testPage!==false) {
				return direction=='down' ? testPage+1 : testPage;
			}
			return s.currentItem;
		},
		
		_getPage : function() {
			var s = this;
			for (var i=0, l=s.items.length; i<l; i++) {
				var item = s.items[i];
				if (item.start<=(s.lastScroll+1) && (s.lastScroll+1)<item.end) {
					return i;
				}
			}
			
			return false;
		},
		
		_setPage : function(itemIndex) {
			var s = this;
			
			if (s.opts.navPages) {
				if (typeof(itemIndex)=='undefined' || !s.items[itemIndex]) {
					itemIndex = s._getPage();
					console.log(itemIndex);
				}
				
				s.navPagesWrap.find('.' + pluginName + 'Page').removeClass(pluginName + 'Active');
				s.navPagesWrap.find('.' + pluginName + 'Page').eq(itemIndex).addClass(pluginName + 'Active');
				
				s.currentItem = itemIndex;
			}
		},
		
		addItems : function(items) {
			var s = this;
			if (items.length!=0) {
				items.each(function(index) {
					var item = s._itemProps($(this));
					s.items.push(item);
					
					var k = s.items.length-1;
					
					if (s.opts.navPages) {
						var title = $(item.item).attr('data-section-title') || $(item.item).find('h1, h2').eq(0).text() || '#'+(k+1);
						$('<button class="' + pluginName + 'Page' + ( k==s.currentItem ? ' ' + pluginName + 'Active' : '' ) +'" title="' + title + '"><span class="' + pluginName + 'PageLabel">'+title+'</span></button>')
							.appendTo(s.navPagesWrap)
							.on('click', function() {
								s.scrollTo(k);
							});
					}
				});
			}
		},

		updateItems : function() {
			var s = this;
			$.each(s.items, function(k, v) {
				s.items[k] = s._itemProps(v.item);
			});
		},
		
		scrollTo : function(itemIndex, speed) {
			var s = this;
			if (typeof(itemIndex)!='undefined' && s.items[itemIndex]) {
				
				s.busy = true;
				s._disableScroll();
				speed = typeof (speed) == 'undefined' ? s.opts.duration : speed;
				
				var delta=  s.lastScroll-s.items[itemIndex].start;
				if (delta < 0) delta = delta * -1;
				
				$.scrollTo(s.items[itemIndex].item, (speed * (delta / s.containerHeight)), {
					easing: s.opts.easing,
					onAfter: function() {
						s._setPage(itemIndex);
						
						setTimeout(function() {
							s.busy = false;
							s.currentItem = itemIndex;
							s.lastScroll = s.container.scrollTop();
							s._enableScroll();
						}, (s.currentItem != itemIndex ? s.opts.afterScrollTimeout : 10 ));
					}
				});
			}
		}
	};
	
	$.fn[pluginName] = function(options) {
		options = options || {};
		
		if (!$.isFunction($.fn.scrollTo)) {
			$.error('Function scrollTo does not exist on jQuery');
			return this;
		}
		
		this.each(function () {
			var instance = $.data(this, pluginName);
			if (instance && $.isFunction(instance[options])) {
				if (typeof options === 'string' && options.charAt(0)=== "_") {
					$.error('no such method "' + options + '" for jQuery.' + pluginName + ' instance');
				} else {
					instance[options].apply(instance, Array.prototype.slice.call(arguments, 1));
				}
			} else if (typeof options === 'object') {
				$.data(this, pluginName, new $[pluginName](this, options));
			} else {
				$.error('Method ' +  options + ' does not exist on jQuery.' + pluginName);
			}
		});
		return this;
	}
}(jQuery));
