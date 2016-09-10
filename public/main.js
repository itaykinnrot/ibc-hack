/**
 * Created by itayk on 10/09/16.
 * Google-api:AIzaSyDQH3J7Ptpa8hnK9E_6lMD2UrGeSJJt72w
 */
(function() { 'use strict';
	var mainVideo = $('#main-video' ).get(0);
	var video = $( '#user-video' ).get( 0 );
	var emotionData = {};
	var lastData = null;
	var canvas = window.canvas = $( '#user-canvas' ).get( 0 );
	canvas.width = 480;
	canvas.height = 360;
	var seeking = false;
	var seekingTime = 0;
	var frame_rate = 1;
	var constraints = {
		audio: false ,
		video: true
	};
	var videoName = "video4";
	var intervalId = null;
	// Initialize Firebase
	var config = {
		apiKey: "AIzaSyD4Qdw4uPtIItxpLHVIXu6EcYIMjplblzY",
		authDomain: "ibc-hack.firebaseapp.com",
		databaseURL: "https://ibc-hack.firebaseio.com",
		storageBucket: "ibc-hack.appspot.com"
	};
	firebase.initializeApp(config);

	function handleSuccess( stream ) {
		window.stream = stream; // make stream available to browser console
		video.srcObject = stream;
	}

	function handleError( error ) {
		console.log( 'navigator.getUserMedia error: ' , error );
	}

	navigator.mediaDevices.getUserMedia( constraints ).
		then( handleSuccess ).catch( handleError );
	window.startCapture = function(){
		intervalId = setInterval(function(){
			takePicture();
			seekingTime = mainVideo.currentTime;
		},2000);
	} ;
	window.stopCapture = function(){
		clearInterval(intervalId);
		console.log(emotionData);
	}
	window.takePicture = function(data,currentTime) {
		var isLecture = false;
		if (data){
			isLecture = true;
		}
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d').
			drawImage(video, 0, 0, canvas.width, canvas.height);
		data = data ||  canvas.toDataURL( "image/jpeg" ).replace("data:image/jpeg;base64,","");
		$.ajax({
			method:"POST",
			url:"https://vision.googleapis.com/v1/images:annotate?key=AIzaSyDQH3J7Ptpa8hnK9E_6lMD2UrGeSJJt72w",
			contentType:"application/json",
			data: '{"requests": [{"image": {"content":"'+ data+'"} ,"features": [{"type": "FACE_DETECTION" ,"maxResults": 10}]}] }'

		} ).then(function(response){
			console.log(response);
			if (response && response.responses && response.responses[0] && response.responses[0].faceAnnotations){
				$.each(response.responses[0].faceAnnotations,function(index,value){
					var currentResult ={
						happy:isPositive(value,"joyLikelihood"),
						surprise:isPositive(value,"surpriseLikelihood"),
						anger:isPositive(value,"angerLikelihood") || isPositive(value,"sorrowLikelihood")
					}
					 if (!lastData){
						 lastData = currentResult;
					 }else {
						 if (didChange(lastData,currentResult)) {
							 emotionData[mainVideo.currentTime] = currentResult;
							 lastData = currentResult;
							 $.each( currentResult , function ( item , value ) {
								 if ( value ) {
									 firebase.database().ref( videoName + "/" + Math.round( currentTime || mainVideo.currentTime ) + "/" + item ).push( isLecture);

								 }
							 } )
						 }
					 }

				})
			}
		})
	};

  function isPositive(object,item){
	  return object[item] =="POSSIBLE"  ||
		  object[item] =="LIKELY"  ||
		  object[item] =="VERY_LIKELY"
  }
		function didChange(obja,objb){
			var didChange = false;
			$.each(obja,function(index,value){
				if (obja[index] != objb[index]){
					didChange =  true;
				}
			});
			return didChange;
		}
	mainVideo.onplaying = function(){
		startCapture();
	}
	mainVideo.onpause = function(){
		stopCapture();
	}
	mainVideo.onseeking = function(){
		seeking = true;

	}
	mainVideo.onseeked = function(){
		seeking = false;
		if (mainVideo.currentTime < seekingTime){
			console.log("Seeked back" , seekingTime);
			firebase.database().ref( videoName + "/" + Math.round( mainVideo.currentTime ) + "/seekBack"  ).push( "boe" );

		}
	};


	////////////////
	/// Player
	////////////////
	function Player(host, username, password, key) {
		var playerMorpheus = MorpheusClient.loadComponent("HTML5", "", "minimal.conf", "mainVideo", "en", {wmode:"opaque"},
			function onLoad(e) {
				// add listeners
				playerMorpheus.addEventListener("user.login", function onLogin(e) {
					if (!e.status.isSuccessful())
						return console.error(e.status.message);
					playerMorpheus.load("asset", key, "AUTO", -1, {}, false, false);
				});
				playerMorpheus.addEventListener("deck.load", function onMediaLoaded(e) {
					if (!e.status.isSuccessful())
						return console.error(e.status.message);
					frame_rate = e.params.metadata.video_fps;
				//	console.log("Player loaded");
				});
				playerMorpheus.addEventListener("deck.image", function onImage(e) {
				//	console.log(e.params);
				});
				playerMorpheus.addEventListener("deck.audio", function onImage(e) {
				//	console.log(e.params);
				});
				playerMorpheus.addEventListener("deck.head", function onHead(e) {
				//	console.log(e.params);
					if ( e.params.frame % 20 == 0) {
						takePicture(e.params.image.toBase64(), e.params.frame/frame_rate)
					}
				});

				// login
				playerMorpheus.login("UMS", host, username, password, null);
			},
			function onLoadFailed() {
				console.error("Couldn't load the player");
			});

		this.playerMorpheus = playerMorpheus;
	};

	Player.prototype.getFrame = function (frame, width, height, compression) {
		this.playerMorpheus.call("get", "deck.image", {
			name:"asset",
			frame:frame,
			width:width,
			height:height,
			compression:compression
			//type:"ByteArray"
		});
	}

	Player.prototype.getAudio = function (frame, length, bits_per_sample, frames_per_second) {
		this.playerMorpheus.getAudio("asset", frame, length, bits_per_sample, frames_per_second);
	}


	window.player;

	window.addEventListener("load", function () {
		// /clips/Derbi_FH_1080i_50_DVCPRO.mp4
		// /clips/Turkish_Soccer_1st_Half.mp4
		// /clips/Turkish_Soccer_2nd_Half.mp4

		window.player = new Player("52.53.228.115", "Bob", "HackFest42", "/clips/strings.mp4");
	});


	///////////////
	// Update Data
	///////////////
	var heat;
	firebase.database().ref(videoName ).on('value',function(items){
		var data = items.val();
		var total = mainVideo.duration;
		var presentedData = [];
		var width = $("#heatmap" ).width();
		$.each(data,function(index,item){
			var weight = 0;
			$.each(item,function(name,values){
				if (name == "happy") {
					//var countHappy = count(values);
					weight = 5

				}
				if (name =="seekBack"){
					weight = 18
				}
				if (name =="anger"){
					weight = 10
				}
				if (name == "surprise"){
					weight = 12;
				}
			})

			presentedData.push([(index/total)*width ,10,weight]);
		});
		if (heat){
			heat.clear();
		}
		heat = simpleheat('heatmap').data(presentedData).max(18);
		heat.radius(4,4);
		heat.resize();
		heat.draw();
	})
	function countObjects(obj){
		var count = 0;
		$.each(obj,function(index){
			count++;
		})
		return count;
	}
})();