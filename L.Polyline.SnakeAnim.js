



///// FIXME: Use path._rings instead of path._latlngs???
///// FIXME: Panic if this._map doesn't exist when called.
///// FIXME: Implement snakeOut()
///// FIXME: Implement layerGroup.snakeIn() / Out()


L.Polyline.include({

	// Hi-res timestamp indicating when the last calculations for vertices and
	// distance took place.
	_snakingTimestamp: 0,

	// How many rings and vertices we've already visited
	// Yeah, yeah, "rings" semantically only apply to polygons, but L.Polyline
	// internally uses that nomenclature.
	_snakingRings: 0,
	_snakingVertices: 0,

	// Distance to draw (in screen pixels) since the last vertex
	_snakingDistance: 0,

	// Flag
	_snaking: false,


	/// TODO: accept a 'map' parameter, fall back to addTo() in case
	/// performance.now is not available.
	snakeIn: function(){

		if (this._snaking) { return; }

		if ( !('performance' in window) ||
		     !('now' in window.performance) ||
		     !this._map) {
			return;
		}

		this._snaking = true;
		this._snakingTime = performance.now();
		this._snakingVertices = this._snakingRings = this._snakingDistance = 0;

		if (!this._snakeLatLngs) {
			this._snakeLatLngs = L.Polyline._flat(this._latlngs) ?
				[ this._latlngs ] :
				this._latlngs ;
		}

		// Init with just the first (0th) vertex in a new ring
		// Twice because the first thing that this._snake is is chop the head.
		this._latlngs = [[ this._snakeLatLngs[0][0], this._snakeLatLngs[0][0] ]];

		this._update();
		this._snake();
		this.fire('snakestart');
		return this;
	},


	_snake: function(){

		var now = performance.now();
		var diff = now - this._snakingTime;	// In milliseconds
		var forward = diff * this.options.snakingSpeed / 1000;	// In pixels
		this._snakingTime = now;

		// Chop the head from the previous frame
		this._latlngs[ this._snakingRings ].pop();

		return this._snakeForward(forward);
	},

	_snakeForward: function(forward) {

		// Calculate distance from current vertex to next vertex
		var currPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ]);
		var nextPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices + 1 ]);

		var distance = currPoint.distanceTo(nextPoint);

// 		console.log('Distance to next point:', distance, '; Now at: ', this._snakingDistance, '; Must travel forward:', forward);
// 		console.log('Vertices: ', this._latlngs);

		if (this._snakingDistance + forward > distance) {
			// Jump to next vertex
			this._snakingVertices++;
			this._latlngs[ this._snakingRings ].push( this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ] );

			if (this._snakingVertices >= this._snakeLatLngs[ this._snakingRings ].length - 1 ) {
				if (this._snakingRings >= this._snakeLatLngs.length - 1 ) {
					return this._snakeEnd();
				} else {
					this._snakingVertices = 0;
					this._snakingRings++;
					this._latlngs[ this._snakingRings ] = [
						this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ]
					];
				}
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
		this._latlngs[ this._snakingRings ].push(headLatLng);

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





L.LayerGroup.include({

	_snakingLayers: [],
	_snakingLayersDone: 0,

	snakeIn: function() {

		if ( !('performance' in window) ||
		     !('now' in window.performance) ||
		     !this._map ||
		     this._snaking) {
			return;
		}


		this._snaking = true;
		this._snakingLayers = [];
		this._snakingLayersDone = 0;
		var keys = Object.keys(this._layers);
		for (var i in keys) {
			var key = keys[i];
			this._snakingLayers.push(this._layers[key]);
		}
		this.clearLayers();

		this.fire('snakestart');
		return this._snakeNext();
	},


	_snakeNext: function() {


		if (this._snakingLayersDone >= this._snakingLayers.length) {
			this.fire('snakeend');
			this._snaking = false;
			return;
		}

		var currentLayer = this._snakingLayers[this._snakingLayersDone];

		this._snakingLayersDone++;

		this.addLayer(currentLayer);
		if ('snakeIn' in currentLayer) {
			currentLayer.once('snakeend', function(){
				setTimeout(this._snakeNext.bind(this), this.options.snakingPause);
			}, this);
			currentLayer.snakeIn();
		} else {
			setTimeout(this._snakeNext.bind(this), this.options.snakingPause);
		}


		this.fire('snake');
		return this;
	}

});


L.LayerGroup.mergeOptions({
	snakingPause: 200
});







