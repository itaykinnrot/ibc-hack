/**
 * Created by itayk on 10/09/16.
 * Google-api:AIzaSyDQH3J7Ptpa8hnK9E_6lMD2UrGeSJJt72w
 */

$( function() {
	$( document ).tooltip({
		position: {
			my: "center bottom-20",
			at: "center top",
			using: function( position, feedback ) {
				$( this ).css( position );
				$( "<div>" )
					.addClass( "arrow" )
					.addClass( feedback.vertical )
					.addClass( feedback.horizontal )
					.appendTo( this );
			}
		}
	});
} );
(function() { 'use strict';
	var lectureMode = false;
	var showStudent = false;
	var showHeatMap = false;
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

	var queries = {};
	$.each(document.location.search.substr(1).split('&'),function(c,q){
		var i = q.split('=');
		queries[i[0].toString()] = i[1].toString();
	});
	if (queries["name"]){
		videoName = queries["name"];
	}
	if (queries["mode"]){
		lectureMode = queries["mode"] == "2";
	}

	if (showHeatMap){
		$("#heatmap" ).show();
	}
	if (!showStudent){
		$("#user-video" ).hide();
		$("#user-canvas" ).hide();
	}
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
									 firebase.database().ref( videoName + "/" + Math.round( currentTime || mainVideo.currentTime ) + "/" + item ).push( lectureMode);

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
	if (lectureMode) {
		$("#mainVideo" ).show();
		$("#main-video" ).hide();
		var  Player = function( host , username , password , key ) {
			var playerMorpheus = MorpheusClient.loadComponent( "HTML5" , "" , "minimal.conf" , "mainVideo" , "en" , {wmode: "opaque"} ,
				function onLoad( e ) {
					// add listeners
					playerMorpheus.addEventListener( "user.login" , function onLogin( e ) {
						if ( !e.status.isSuccessful() )
							return console.error( e.status.message );
						playerMorpheus.load( "asset" , key , "AUTO" , -1 , {} , false , false );
					} );
					playerMorpheus.addEventListener( "deck.load" , function onMediaLoaded( e ) {
						if ( !e.status.isSuccessful() )
							return console.error( e.status.message );
						frame_rate = e.params.metadata.video_fps;
						window.player.playerMorpheus.play();
						//	console.log("Player loaded");
					} );
					playerMorpheus.addEventListener( "deck.image" , function onImage( e ) {
						//	console.log(e.params);
					} );
					playerMorpheus.addEventListener( "deck.audio" , function onImage( e ) {
						//	console.log(e.params);
					} );
					playerMorpheus.addEventListener( "deck.head" , function onHead( e ) {
						//	console.log(e.params);
						if ( e.params.frame % 40 == 0 ) {
							takePicture( e.params.image.toBase64() , e.params.frame / frame_rate )
						}
					} );

					// login
					playerMorpheus.login( "UMS" , host , username , password , null );
				} ,
				function onLoadFailed() {
					console.error( "Couldn't load the player" );
				} );

			this.playerMorpheus = playerMorpheus;
		};

		Player.prototype.getFrame = function ( frame , width , height , compression ) {
			this.playerMorpheus.call( "get" , "deck.image" , {
				name: "asset" ,
				frame: frame ,
				width: width ,
				height: height ,
				compression: compression
				//type:"ByteArray"
			} );
		}

		Player.prototype.getAudio = function ( frame , length , bits_per_sample , frames_per_second ) {
			this.playerMorpheus.getAudio( "asset" , frame , length , bits_per_sample , frames_per_second );
		}


		window.player;

		window.addEventListener( "load" , function () {
			// /clips/Derbi_FH_1080i_50_DVCPRO.mp4
			// /clips/Turkish_Soccer_1st_Half.mp4
			// /clips/Turkish_Soccer_2nd_Half.mp4

			window.player = new Player( "52.53.228.115" , "Bob" , "HackFest42" , "/clips/happiness.mp4" );

		} );
	}  else {
		$("#mainVideo" ).hide();
	}


	///////////////
	// Update Data
	///////////////
	var heat;
	firebase.database().ref(videoName ).on('value',function(items){
		var data = items.val();
		var total = mainVideo.duration;
		var presentedData = [];
		var width = $("#heatmap" ).width();
		var heat_map = $("#heatmap" ).get(0);
		heat_map.width = width;
		$.each(data,function(index,item){
			var weight = 0;
			$.each(item,function(name,values){
				var countItems = countObjects(values,lectureMode);
				var niceName = '';
				if (name == "happy") {

					weight = countItems;
					niceName = "enjoyable";


				}
				if (name =="seekBack"){
					weight = countItems;
					niceName = "very important!!";
				}
				if (name =="anger"){
					weight = countItems;
					niceName = "difficult"
				}
				if (name == "surprise"){
					weight = countItems;
					niceName = "surprising"
				}
				presentedData.push([(index/total)*width ,10,weight]);
				var precentage = Math.round(index/total*100);
				if (countItems > 3){
					countItems = 3
				}
				var people = "people";
				if (countItems ==1){
					people = "person";
				}
				$("#p" + precentage ).addClass(name + countItems ).attr("title",countItems +" "+people+" found it " + niceName);

			})


		});
		if (heat){
			heat.clear();
		}
		heat = simpleheat('heatmap').data(presentedData).max(30);
		heat.radius(4,8);
		heat.resize();
		heat.draw();
	})
	function countObjects(obj,lectureMode){
		var count = 0;
		//if value is true then its the lecture and not the students ...
		$.each(obj,function(index,value){
			if (value == "true"){
				if (lectureMode)
				count++
			} else {
				count++;
			}
		})
		return count;
	}
})();