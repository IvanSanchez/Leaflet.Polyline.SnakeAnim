# Leaflet.Polyline.SnakeAnim

A plugin for [LeafletJS](http://www.leafletjs.com) to make polylines animate into existence.


![Screencapture GIF](demo.gif)

Animation is time- and distance- based: the more time elapsed into the animation,
the longer the visible length of the polyline.

Also works on layer groups:

![Screencapture GIF](demo-group.gif)

Current version works only with Leaflet 1.1 or higher.

### API

#### Methods

New method in both `L.Polyline` and `L.LayerGroup`: `snakeIn()`. Call it to
trigger the animation.

New method in both `L.Polyline` and `L.LayerGroup`: `snakeOut()`. Call it to
trigger the animation. You can call it during the `snakeIn()` animation.

New method in both `L.Polyline` and `L.LayerGroup`: `snakeReset()`. Call it to
stop any animation and bring back polyline.

#### Options

New option in `L.Polyline`: `snakingSpeed`. This is the speed of the animation,
in pixels per second. Pixels refer to the length of the polyline at the current
zoom level.
The default value is `200`.

New option in `L.LayerGroup`: `snakingPause`. This is the number of milliseconds
to wait between layers in the group when doing a snaking animation.
The default value is `200`.

New option in `L.LayerGroup`: `snakeRemoveLayers`. This is used to remove layers
when snake tail passes them.
The default value is `true`.

#### Events

When a polyline is performing the snaking animation, it will
fire the following events:
- `snakeInStart`: the head starts to move
- `snakeOutStart`: the tail starts to move
- `snakeIn`: the head progresses
- `snakeOut`: the tail progresses
- `snakeInEnd`: the head reaches the final point
- `snakeOutEnd`: the tail reaches the final point.

Each one of theses event has the head or tail position as parameter.
You can use it to do whatever you want. For example, you can make
the map follow the head, as shown in demo files.

When a layer group is performing the snaking animation, it will
fire the following events:
- `snakeGroupInStart`: the head start the animation in the group
- `snakeGroupInNext`: the head passes to the next layer
- `snakeGroupInEnd`: the head passes to the next layer
- `snakeGroupOutStart`: the tail start the animation in the group
- `snakeGroupOutNext`: the tail passes to the next layer
- `snakeGroupOutEnd`: the tail passes to the next layer

#### Simple examples

```js
let line = L.polyline(latlngs, {snakingSpeed: 200, followHead: false});
line.addTo(map).snakeIn();
// Later, you can use
line.snakeOut();
```

```js
let route = L.layerGroup([
	L.marker(airport1),
	L.polyline([airport1, airport2]),
	L.marker(airport2)
], { snakingPause: 200, snakeRemoveLayers: true });
route.addTo(map).snakeIn();
// Later, you can use
route.snakeOut();
```

Look in demo files for more advanced usages.

### Legalese

"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> originaly wrote this file.
Later, <pitou.games@gmail.com> enhanced this file, in order to add more feature.
As long as you retain this notice you can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
