/*"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> originaly wrote this file.
Later, <pitou.games@gmail.com> enhanced this file, in order to add more feature.
As long as you retain this notice you can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.*/

///// FIXME: Use path._rings instead of path._latlngs???
///// FIXME: Panic if this._map doesn't exist when called.

L.Polyline.include({

	// Hi-res timestamp indicating when the last calculations for vertices and
	// distance took place.
	_snakingTimestamp: 0,

	// How many rings and vertices we've already visited
	// Yeah, yeah, "rings" semantically only apply to polygons, but L.Polyline
	// internally uses that nomenclature.
	_snakingRings: 0,
	_snakingTailRings: 0,
	_snakingVertices: 0,
	_snakingTailVertices: 0,

	// Distance to draw (in screen pixels) since the last vertex
	_snakingDistance: 0,
	_snakingTailDistance: 0,

	// Flags
	_snakingIn: false,
	_snakingOut: false,


	/// TODO: accept a 'map' parameter, fall back to addTo() in case
	/// performance.now is not available.
	snakeIn: function(){

		if (this._snakingIn || this._snakingOut) { return; }

		if ( !('performance' in window) ||
		     !('now' in window.performance) ||
		     !this._map) {
			return;
		}

		this._snakingIn = true;
		this._snakingTime = performance.now();
		this._snakingVertices = this._snakingRings = this._snakingDistance = 0;

		if (!this._snakeLatLngs) {
			this._snakeLatLngs = L.LineUtil.isFlat(this._latlngs) ?
				[ this._latlngs ] :
				this._latlngs ;
		}

		// Init with just the first (0th) vertex in a new ring
		// Twice because the first thing that this._snake is is chop the head.
		this._latlngs = [[ this._snakeLatLngs[0][0], this._snakeLatLngs[0][0] ]];

		this._update();
		this._snake();
		this.fire('snakestart'); // to depreciate
		this.fire('snakeInStart');
		return this;
	},

	snakeOut: function(){

		if (this._snakingOut) { return; }

		if ( !('performance' in window) ||
			!('now' in window.performance) ||
			!this._map) {
			return;
		}

		this._snakingOut = true;
		this._snakingTime = performance.now();
		this._snakingTailVertices = this._snakingTailRings = this._snakingTailDistance = 0;

		if (!this._snakeLatLngs) {
			this._snakeLatLngs = L.LineUtil.isFlat(this._latlngs) ?
				[ this._latlngs ] :
				this._latlngs ;
		}

		if(!this._snakingIn){
			//need to do a deep copy
			let tempArray = [];
			let keys = Object.keys(this._snakeLatLngs);
			for (let i in keys) {
				tempArray.push([]);
				this._snakeLatLngs[tempArray.length - 1].forEach(function(entry) {
					tempArray[tempArray.length - 1].push( [entry.lat, entry.lng] );
				});
			}
			this._latlngs = tempArray;
		}

		this._update();
		// Avoid concourant calls to _snake
		if(!this._snakingIn){
			this._snake();
		}
		this.fire('snakeOutStart');
		return this;
	},

	_snake: function(){
		// If polyline has been removed from the map stop _snakeForward
		if (!this._map) return;

		let now = performance.now();
		let diff = now - this._snakingTime;	// In milliseconds
		diff = (diff === 0 ? 0.001 : diff); // avoids low time resolution issues in some browsers
		let forward = diff * this.options.snakingSpeed / 1000;	// In pixels
		this._snakingTime = now;

		// Chop the head from the previous frame
		if(this._snakingIn){
			this._latlngs[ this._snakingRings ].pop();
		}
		// Chop the tail from the previous frame
		if(this._snakingOut){
			this._latlngs[ this._snakingTailRings ].shift();
		}

		if(this._snakingIn){
			this._snakeHeadForward(forward);
		}
		if(this._snakingOut){
			this._snakeTailForward(forward);
		}

		this.setLatLngs(this._latlngs);
		// Animate only if snake in moving
		if (this._snakingIn || this._snakingOut){
			this.fire('snake');
			L.Util.requestAnimFrame(this._snake, this);
		}

		return this;
	},

	_snakeHeadForward: function(forward) {

		// Calculate distance from current vertex to next vertex
		let currPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ]);
		let nextPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices + 1 ]);

		let distance = currPoint.distanceTo(nextPoint);

		//console.log('Distance head to next point:', distance, '; Now at: ', this._snakingDistance, '; Must travel forward:', forward, '_snakingTime', this._snakingTime, '_snakingVertices', this._snakingVertices);
		//console.log('Snake vertices: ', this._latlngs,';this._snakeLatLngs',this._snakeLatLngs);

		while (this._snakingDistance + forward > distance) {
			// Jump to next vertex
			this._snakingVertices++;
			this._latlngs[ this._snakingRings ].push( this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ] );

			if (this._snakingVertices >= this._snakeLatLngs[ this._snakingRings ].length - 1 ) {
				if (this._snakingRings >= this._snakeLatLngs.length - 1 ) {
					return this._snakeInEnd();
				} else {
					this._snakingVertices = 0;
					this._snakingRings++;
					this._latlngs[ this._snakingRings ] = [
						this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ]
					];
				}
			}

			this._snakingDistance -= distance;
			currPoint = this._map.latLngToContainerPoint(
				this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices ]);
			nextPoint = this._map.latLngToContainerPoint(
				this._snakeLatLngs[ this._snakingRings ][ this._snakingVertices + 1]);
			distance = currPoint.distanceTo(nextPoint);
		}

		this._snakingDistance += forward;

		let percent = this._snakingDistance / distance;

		let headPoint = nextPoint.multiplyBy(percent).add(
			currPoint.multiplyBy( 1 - percent )
		);

		// Put a new head in place.
		let headLatLng = this._map.containerPointToLatLng(headPoint);
		this._latlngs[ this._snakingRings ].push(headLatLng);
		if(this.options.followHead){
			this._map.setView(headLatLng);
		}

		return this;
	},

	_snakeTailForward: function(forward) {
		// Calculate distance from current vertex to next vertex
		let currPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingTailRings ][ this._snakingTailVertices ]);
		let nextPoint = this._map.latLngToContainerPoint(
			this._snakeLatLngs[ this._snakingTailRings ][ this._snakingTailVertices + 1 ]);

		let distance = currPoint.distanceTo(nextPoint);

		//console.log('Distance tail to next point:', distance, '; Now at: ', this._snakingTailDistance, '; Must travel forward:', forward, '; _snakingTime', this._snakingTime, '; _snakingTailVertices', this._snakingTailVertices);
		//console.log('Snake vertices: ', this._latlngs,';this._snakeLatLngs',this._snakeLatLngs);

		while (this._snakingTailDistance + forward > distance) {
			// Jump to next vertex
			this._snakingTailVertices++;
			this._latlngs[this._snakingTailRings].shift();

			if (this._snakingTailVertices >= this._snakeLatLngs[ this._snakingTailRings ].length - 1 ) {
				if (this._snakingTailRings >= this._snakeLatLngs.length - 1 ) {
					return this._snakeOutEnd();
				} else {
					this._snakingTailVertices = 0;
					this._latlngs[ this._snakingTailRings ] = [];
					this._snakingTailRings++;
					this._latlngs[ this._snakingTailRings ].shift(); // Remove first point of new line
				}
			}

			this._snakingTailDistance -= distance;
			currPoint = this._map.latLngToContainerPoint(
				this._snakeLatLngs[ this._snakingTailRings ][ this._snakingTailVertices ]);
			nextPoint = this._map.latLngToContainerPoint(
				this._snakeLatLngs[this._snakingTailRings ][ this._snakingTailVertices + 1 ]);
			distance = currPoint.distanceTo(nextPoint);
		}

		this._snakingTailDistance += forward;

		let percent = this._snakingTailDistance / distance;

		let tailPoint = nextPoint.multiplyBy(percent).add(
			currPoint.multiplyBy( 1 - percent )
		);

		// Put a new tail in place.
		let tailLatLng = this._map.containerPointToLatLng(tailPoint);
		this._latlngs[ this._snakingTailRings ].unshift(tailLatLng);

		return this;
	},


	_snakeInEnd: function() {

		this._snakingIn = false;
		if(!this._snakingOut){
			this.setLatLngs(this._snakeLatLngs);
		}
		this.fire('snakeend'); // to depreciate
		this.fire('snakeInEnd');

		return this;
	},

	_snakeOutEnd: function() {

		this._snakingOut = false;
		this.fire('snakeOutEnd');

		return this;
	},

	snakeReset: function () {

		this._snakingIn = this._snakingOut = false;
		if(this._snakeLatLngs){
			this.setLatLngs(this._snakeLatLngs);
		}

		return this;
	}

});



L.Polyline.mergeOptions({
	snakingSpeed: 200,	// In pixels/sec
	followHead: false	// center the map on the head
});



L.LayerGroup.include({

	_snakingLayers: [],
	_snakingLayersDone: 0,
	_snakingTailLayersDone: 0,
	_snakingIn: false,
	_snakingOut: false,

	// used to cancel timeouts for snakeReset()
	_snakeTimeoutsId: [],

	snakeIn: function() {

		if ( !('performance' in window) ||
		     !('now' in window.performance) ||
		     !this._map ||
		     this._snakingIn || this._snakingOut) {
			return;
		}

		this._snakingIn = true;
		this._snakingLayersDone = 0;
		if(this._snakingLayers.length === 0){
			this._initSnakingLayers();
		}
		if(this.options.snakeRemoveLayers){
			this.clearLayers();
		}else {
			for(let currentLayer in this._snakingLayers){
				if(this._snakingLayers[currentLayer] instanceof L.Polyline){ // remove only paths
					this.removeLayer(this._snakingLayers[currentLayer]);
				}
			}
		}

		this.fire('snakestart');
		this.fire('snakeInStart');
		return this._snakeHeadNext();
	},

	snakeOut: function() {

		if ( !('performance' in window) ||
			!('now' in window.performance) ||
			!this._map ||
			this._snakingOut) {
			return;
		}

		if(!this._snakingIn){
			snakeReset();
		}

		this._snakingOut = true;
		this._snakingTailLayersDone = 0;

		this.fire('snakeOutStart');
		return this._snakeTailNext();
	},

	_initSnakingLayers: function() {
		// Copy layers ref in _snakingLayers
		let keys = Object.keys(this._layers);
		for (let i in keys) {
			let key = keys[i];
			this._snakingLayers.push(this._layers[key]);
		}
		return this;
	},

	_snakeHeadNext: function() {

		if(!this._snakingIn){ return  this; }

		if (this._snakingLayersDone >= this._snakingLayers.length) {
			this.fire('snakeend');
			this.fire('snakeInEnd');
			this._snakingIn = false;
			return;
		}

		let currentLayer = this._snakingLayers[this._snakingLayersDone];

		this._snakingLayersDone++;

		if(!this.getLayer(currentLayer)){ // avoid layer duplications
			this.addLayer(currentLayer);
		}

		if ('snakeIn' in currentLayer) {
			currentLayer.once('snakeInEnd', function(){
				this._snakeTimeoutsId.push(setTimeout(this._snakeHeadNext.bind(this), this.options.snakingPause));
			}, this);
			currentLayer.snakeIn();
		} else {
			this._snakeTimeoutsId.push(setTimeout(this._snakeHeadNext.bind(this), this.options.snakingPause));
		}


		this.fire('snake');
		return this;
	},

	_snakeTailNext: function() {

		if(!this._snakingOut){ return  this; }

		if(this.options.snakeRemoveLayers) {
			this.removeLayer(this._snakingLayers[this._snakingTailLayersDone-1]);
		}

		if (this._snakingTailLayersDone >= this._snakingLayers.length) {
			this.fire('snakeOutEnd');
			this._snakingOut = false;
			return;
		}
		let currentLayer = this._snakingLayers[this._snakingTailLayersDone];

		this._snakingTailLayersDone++;


		if ('snakeOut' in currentLayer) {
			currentLayer.once('snakeOutEnd', function(){
				this._snakeTimeoutsId.push(setTimeout(this._snakeTailNext.bind(this), this.options.snakingPause));
			}, this);
			currentLayer.snakeOut();
		} else {
			this._snakeTimeoutsId.push(setTimeout(this._snakeTailNext.bind(this), this.options.snakingPause));
		}

		this.fire('snake');
		return this;
	},

	snakeReset: function() {

		this._snakingIn = false;
		this._snakingOut = false;
		if(this._snakingLayers.length === 0){
			this._initSnakingLayers();
		}

		for (let id in this._snakeTimeoutsId) {
			clearTimeout(id);
		}
		this._snakeTimeoutsId = [];

		for(let currentLayer in this._snakingLayers){
			if(this._snakingLayers[currentLayer] instanceof L.Polyline){
				this._snakingLayers[currentLayer].snakeReset();
			}
			// Maybe we need to keep layer order
			if(!this.getLayer(this._snakingLayers[currentLayer])){
				this.addLayer(this._snakingLayers[currentLayer]);
			}
		}
		return this;
	}

});



L.LayerGroup.mergeOptions({
	snakingPause: 200,
	snakeRemoveLayers: true // should layers (other than polylines) desapear
});
