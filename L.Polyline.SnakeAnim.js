



///// FIXME: Use path._rings instead of path._latlngs???
///// FIXME: Support polylines instead of just lines
///// FIXME: Check for performance.now()
///// FIXME: Panic if this._map doesn't exist when called.


L.Polyline.include({

	// Hi-res timestamp indicating when the last calculations for vertices and
	// distance took place.
	_snakingTimestamp: 0,

	// How many vertices we've already visited
	_snakingVertices: 0,

	// Distance to draw (in screen pixels) since the last vertex
	_snakingDistance: 0,

	// Flag
	_snaking: false,


	/// TODO: accept a 'map' parameter, fall back to addTo() in case
	/// performance.now is not available.
	snakeIn: function(){

		this._snaking = true;
		this._snakingTime = performance.now();
		this._snakingVertices = this._snakingDistance = 0;

		if (!this._snakeLatLngs) {
			this._snakeLatLngs = this._latlngs;
		}

		// Init with just the first (0th) vertex
		// Twice because the first thing that this._snake is is chop the head.
		this._latlngs = [ this._snakeLatLngs[0], this._snakeLatLngs[0] ];

		this._update();
		L.Util.requestAnimFrame(this._snake, this);
		this.fire('snakestart');
	},


	_snake: function(){

		var now = performance.now();
		var diff = now - this._snakingTime;	// In milliseconds
		var forward = diff * this.options.snakingSpeed / 1000;	// In pixels
		this._snakingTime = now;

		// Chop the head from the previous frame
		this._latlngs.pop();

		return this._snakeForward(forward);
	},

	_snakeForward: function(forward) {

		// Calculate distance from current vertex to next vertex
		var currPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingVertices ]);
		var nextPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingVertices + 1 ]);

		var distance = currPoint.distanceTo(nextPoint);

// 		console.log('Distance to next point:', distance, '; Now at: ', this._snakingDistance, '; Must travel forward:', forward);
// 		console.log('Vertices: ', this._latlngs);

		if (this._snakingDistance + forward > distance) {
			// Jump to next vertex
			this._snakingVertices++;
			this._latlngs.push( this._snakeLatLngs[ this._snakingVertices ] );

			if (this._snakingVertices >= this._snakeLatLngs.length - 1 ) {
				return this._snakeEnd();
			}

			this._snakingDistance -= distance;
			return this._snakeForward(forward);
		}

		this._snakingDistance += forward;

		var percent = this._snakingDistance / distance;

		var headPoint = nextPoint.multiplyBy(percent).add(
			currPoint.multiplyBy( 1 - percent )
		);

		// Put a new head in place.
		var headLatLng = this._map.containerPointToLatLng(headPoint);
		this._latlngs.push(headLatLng);

		this.setLatLngs(this._latlngs);
		this.fire('snake');
		L.Util.requestAnimFrame(this._snake, this);
	},

	_snakeEnd: function() {

		this.setLatLngs(this._snakeLatLngs);
		this._snaking = false;
		this.fire('snakeend');

	}

});


L.Polyline.mergeOptions({
	snakingSpeed: 200	// In pixels/sec
});


