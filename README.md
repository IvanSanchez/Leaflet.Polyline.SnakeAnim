# Leaflet.Polyline.SnakeAnim


A plugin for LeafletJS to make polylines animate into existence.


![Screencapture GIF](demo.gif)

Animation is time- and distance- based: the more time elapsed into the animation,
the longer the visible length of the polyline.


### API

This plugin introduces one more method to `L.Polyline`: `snakeIn()`.
Call it to trigger the animation.

This plugin introduces one more option to `L.Polyline`: `snakingSpeed`.
This is the speed of the animation, in pixels per second. Pixels refer to the
length of the polyline at the current zoom level. The default value is 200.


```js
var line = L.polyline(latlngs, {snakingSpeed: 200});
line.addTo(map).snakeIn();
```


### Legalese


"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.


