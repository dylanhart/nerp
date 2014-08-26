var canvas = document.getElementById("game");
var context = canvas.getContext("2d");

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

var config = {
	//size of canvas
	size: {
		width: 400,
		height: 600
	},
	//aliases for keycodes
	keymap: {
		left: 37,
		right: 39,
		up: 38,
		down: 40,
		r: 82,
		enter: 13,
		space: 32
	},
	drawhitboxes: false
}

//utility to check if two objects are collided on screen {x, y, w, h}
var areCollided = function(a, b) {
	var hcol = (a.x < b.x && a.x + a.w > b.x) || (b.x < a.x && b.x + b.w > a.x)
	var vcol = (a.y < b.y && a.y + a.h > b.y) || (b.y < a.y && b.y + b.h > a.y)
	return hcol && vcol
}

//utility functions for controls
var controls = {
	keystate: {},
	callbacks: {},
	press: function(key) {
		this.keystate[key] = true;

		if (this.callbacks[key] !== undefined) {
			for (var i = 0; i < this.callbacks[key].length; i++) {
				this.callbacks[key][i]();
			}
		}
	},
	release: function(key) {
		this.keystate[key] = false;
	},
	onPress: function(key, func) {
		if (this.callbacks[key] === undefined) {
			this.callbacks[key] = [];
		}
		this.callbacks[key].push(func);
	},
	getState: function(name) {
		var state = this.keystate[config.keymap[name]];
		if (state === undefined) {
			return this.keystate[config.keymap[name]] = false;
		}
		return state;
	},
	init: function() {
		document.addEventListener('keydown', function(event) {
			controls.press(event.keyCode);
		});
		document.addEventListener('keyup', function(event) {
			controls.release(event.keyCode);
		});		
	}
}
controls.init();


var game = {
	diff: 0,
	update: function(delta) {
		this.world.update(delta);
	},
	render: function(delta) {
		context.clearRect(0, 0, config.size.width, config.size.height);
		this.world.render(delta);
	},
	init: function() {
		canvas.height = config.size.height;
		canvas.width = config.size.width;

		//init all the things
		this.world.init();
		this.walls.init();
		this.player.init();

		//reset
		this.start()

		//register all the controls
		controls.onPress(config.keymap.r, game.start)
		controls.onPress(config.keymap.enter, game.start)

		controls.onPress(config.keymap.up, function() {
			game.player.jump()
		})
		controls.onPress(config.keymap.down, function() {
			game.player.jump()
		})
		controls.onPress(config.keymap.space, function() {
			game.player.jump()
		})
	},
	//resets the game
	start: function() {
		game.walls.walls = []
		for (var i = 0; i < 100; i++) {
			game.walls.createWall(config.size.width*2 + (i * 200), Math.random() * (config.size.height - 300) + 150)
		}
		game.player.reset()
	}
}

game.world = {
	gravity: -.0005,
	entities: [],
	bgsize: 1000,
	scrollpos: 0,
	scrollspeed: .05,
	//add an entity
	register: function(ent) {
		this.entities.push(ent);
	},
	render: function(delta) {
		//draw background
		if (this.bgimg !== undefined) {
			context.drawImage(this.bgimg, -this.scrollpos, 0)
			context.drawImage(this.bgimg, this.bgsize-this.scrollpos, 0)
		}

		//draw entities
		for (var i = 0; i < this.entities.length; i++) {
			this.entities[i].render(delta);
		}
	},
	update: function(delta) {
		//update background
		if (!game.player.isdead) {
			this.scrollpos += this.scrollspeed * delta
			this.scrollpos %= this.bgsize
		}
		//update entities
		for (var i = 0; i < this.entities.length; i++) {
			if (this.entities[i].shouldRemove && this.entities[i].shouldRemove()) {
				this.entities.splice(i--, 1)
			} else {
				this.entities[i].update(delta);
			}
		}
	},
	init: function() {
		this.bgimg = new Image()
		this.bgimg.src = "assets/images/bg.png"
	}
}

game.player = {
	pos: {
		x: 100,
		y: 200
	},
	vel: {
		x: 0,
		y: 0
	},
	stats: {
		jump: .25
	},
	size: 48,
	hitbox: {
		w: 24,
		h: 30,
		offsetx: 6,
		offsety: -4
	},
	isdead: false,
	score: 0,
	render: function(delta) {
		context.save()
		context.translate(this.pos.x, this.pos.y)
		context.rotate(Math.max(this.vel.y / .3 * Math.PI/4, -Math.PI/2))
		if (this.isdead) context.scale(1,-1)
		if (this.img !== undefined)
			context.drawImage(this.img, -this.size/2, -this.size, this.size, this.size);
		// context.fillText("vel: " + JSON.stringify(this.vel), 10, 10);
		context.restore()
		if (config.drawhitboxes) {
			context.save()
			context.fillStyle = "#f00"
			var box = this.getCollisionBox()
			context.fillRect(box.x, box.y, box.w, box.h)
			context.restore()
		}
	},
	update: function(delta) {


		this.pos.x += this.vel.x * delta;
		this.pos.y += this.vel.y * delta;
		

		if (this.pos.y <= 0) {
			this.pos.y = 0;
			this.vel.y *= this.vel.y < -.1 ? -.5 : 0;
			// this.vel.y = this.stats.jump
			this.die()
		} else {
			this.vel.y += game.world.gravity * delta;
		}

	},
	jump: function() {
		if (this.isdead || this.pos.y > config.size.height - 50) return;
		this.vel.y = this.stats.jump;
	},
	init: function() {
		game.world.register(this);
		this.img = new Image();
		this.img.src = "assets/images/nerp2.png"
	},
	getCollisionBox: function() {
		return {
			x: this.pos.x - this.hitbox.w/2 + this.hitbox.offsetx,
			y: this.pos.y + this.hitbox.offsety - this.hitbox.h,
			w: this.hitbox.w,
			h: this.hitbox.h
		}
	},
	die: function() {
		if (this.isdead) return;
		this.isdead = true;
	},
	reset: function() {
		this.isdead = false
		this.pos.y = config.size.height/2
		this.vel.y = 0
		this.score = 0

		document.getElementById("title").innerHTML = "Floaty Nerp! Score: " + this.score
	},
	addScore: function(points) {
		this.score += points
		document.getElementById("title").innerHTML = "Floaty Nerp! Score: " + this.score
		
		//when the game is beaten
		if (this.score >= 100) {
			game.start()
			game.world.gravity *= 1.2
			this.stats.jump *= 1.2
			document.getElementById("title").innerHTML = "Floaty Nerp! Difficulty Increased!!!!!"
			game.diff++
			document.title = "Floaty Nerp! (diff: " + game.diff + ")"

		}
	}
}

game.walls = {
	stats: {
		speed: .1,
		gap: 125,
		width: 48,
	},
	walls: [],
	createWall: function(xpos, ypos) {
		this.walls.push({
			pos: {
				x: xpos,
				y: ypos,
			},
			passed: false,
			getCheckpointHitbox: function() {
				return {
					x: this.pos.x + game.walls.stats.width/2,
					y: this.pos.y - game.walls.stats.gap/2,
					w: 1,
					h: game.walls.stats.gap
				}
			},
			getBoxes: function() {
				return [
					{
						x: this.pos.x,
						y: this.pos.y - game.walls.stats.gap/2 - Math.max(300, this.pos.y - game.walls.stats.gap/2), //goes offscreen
						w: game.walls.stats.width,
						// h: this.pos.y - game.walls.stats.gap/2 + 100
						h: Math.max(300, this.pos.y - game.walls.stats.gap/2)
					},
					{
						x: this.pos.x,
						y: this.pos.y + game.walls.stats.gap/2,
						w: game.walls.stats.width,
						// h: config.size.height //goes offscreen
						h: Math.max(300, config.size.height - (this.pos.y + game.walls.stats.gap/2))
					}
				]
			}
		})
	},
	render: function(delta) {
		for (var i = 0; i < this.walls.length; i++) {
			var boxes = this.walls[i].getBoxes()
			context.save()
			if (config.drawhitboxes) {
				context.fillStyle = "#00ff00"
				var check = this.walls[i].getCheckpointHitbox()
				context.fillRect(check.x, check.y, check.w, check.h)
				context.fillStyle = "#ff0000"
				context.fillRect(boxes[0].x, boxes[0].y, boxes[0].w, boxes[0].h)
				context.fillRect(boxes[1].x, boxes[1].y, boxes[1].w, boxes[1].h)
			}
			if (this.columnimg !== undefined) {
				context.save()
				context.scale(1, -1)
				context.drawImage(this.columnimg, boxes[0].x, -boxes[0].y, boxes[0].w, -boxes[0].h)
				context.restore()
				context.drawImage(this.columnimg, boxes[1].x, boxes[1].y, boxes[1].w, boxes[1].h)
			}
			context.restore()
		}
	},
	update: function(delta) {
		if (game.player.isdead) return;
		for (var i = 0; i < this.walls.length; i++) {
			if (this.walls[i].pos.x < -this.stats.width) {
				//remove walls that are offscreen to the left
				this.walls.splice(i--, 1)
			} else {
				//check for collision
				if (areCollided(this.walls[i].getBoxes()[0], game.player.getCollisionBox())
						|| areCollided(this.walls[i].getBoxes()[1], game.player.getCollisionBox())) {
					game.player.die()
				}
				//check for checkpoint collision
				if (!this.walls[i].passed && areCollided(this.walls[i].getCheckpointHitbox(), game.player.getCollisionBox())) {
					this.walls[i].passed = true
					game.player.addScore(1)
				}
				//move the wall
				this.walls[i].pos.x -= this.stats.speed * delta;
			}
		}
	},
	init: function() {
		game.world.register(this)
		this.columnimg = new Image()
		this.columnimg.src = "assets/images/kelp.png"
	}
}

game.init();


//start
var oldtime = Date.now();
var time;


(function loop() {
	window.requestAnimFrame(loop);

	time = Date.now();
	game.update(time - oldtime);
	game.render(time - oldtime);
	oldtime = time;
})();
