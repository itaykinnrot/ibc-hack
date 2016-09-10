/* Copyright 2011-2013 by Avid Technology, Inc. */
var MorpheusClient = function () {

	var _minFlashVersion = "11.0.1";
	var _minJavaVersion = "1.6.0+";
	var _domPostfix = "_player";

	// private
	function morpheusLoadSWF(baseURL, configURL, DOMID, langRegion, objectParams, onLoadFunction, onFailFunction) {

		if (typeof(swfobject) === "undefined") {
			log("error", "morpheusclient.js requires swfobject");
			return;
		}

		// make sure we remove the deprecated swf file from the baseURL
		var arrBasePath = baseURL.split("/");
		if (arrBasePath[arrBasePath.length - 1].indexOf("swf") > -1) {
			log("warn", "SWF file in MorpheusClient.loadComponent archiveURL is no longer required.  Directory path is sufficient.");
			arrBasePath.pop();
			arrBasePath.push("");
		}
		baseURL = arrBasePath.join("/");


		var playerVersion = swfobject.getFlashPlayerVersion();

		if (playerVersion.major === 0) {
			document.getElementById(DOMID).innerHTML = "<h1>Flash Player Required</h1>You can <a href='http://www.adobe.com/go/getflashplayer'>download the latest version</a> of Adobe's Flash Player or <a href='/installer/index.html'>view a list of available installers</a> if you're not able to connect to the internet from this machine.";
			onFailFunction();
			return;
		} else if (!swfobject.hasFlashPlayerVersion(_minFlashVersion)) {
			document.getElementById(DOMID).innerHTML = "<h1>Flash Player Update Required</h1>You currently have version "+ playerVersion.major + '.' + playerVersion.minor + '.' + playerVersion.release +" installed.  MaxPlayer requires at least version "+ _minFlashVersion +".<br/>You can <a href='http://www.adobe.com/go/getflashplayer'>download the latest version</a> of Adobe's Flash Player or <a href='/installer/index.html'>view a list of available installers</a> if you're not able to connect to the internet from this machine.";
			onFailFunction();
			return;
		}

		// set default object/embed params
		var objectParamsDefault =  {
									  quality:"best",
									  scale:"noscale",
									  seamlesstabbing:"false",
									  wmode:"direct",
									  allowfullscreen:"true",
									  allowscriptaccess:"always",
									  allownetworking:"all"
									}

		// add custom params to default
		for (prop in objectParams) {
			objectParamsDefault[prop] = objectParams[prop];
		}

		var newDOMID = DOMID + _domPostfix;

		swfobject.embedSWF(baseURL + "MaxPlayer.swf", DOMID, "100%", "100%", _minFlashVersion, false, {
				DOMID:newDOMID,
				config:configURL,
				langRegion:langRegion,
				onLoadFunction:onLoadFunction
			}, objectParamsDefault, {id:newDOMID});

		return newDOMID;
	};


	// private
	var javaAppletTagHostID;
	function morpheusLoadJava(archiveURL, configURL, DOMID, langRegion, objectParams, onLoadFunction, onFailFunction) {

		if (typeof(deployJava) === "undefined") {
			log("error", "morpheusclient.js requires deployJava.js");
			return;
		}

		if (!deployJava.versionCheck(_minJavaVersion)) {
			onFailFunction();
			// Pass through--we display the problem but will let
			// deployJava attempt to install
		}

		var newDOMID = DOMID + _domPostfix;

		var attributes = {
				code:"com.avid.morpheus.commonplayer.CommonPlayerApplet",
				archive:archiveURL,
				id:newDOMID,
				name:"CommonPlayerApplet"
            };

		objectParams["loadFunction"] = onLoadFunction;
		objectParams["configURL"] = configURL;
		javaAppletTagHostID = DOMID;

		// Override the definition of the deployJava.writeAppletTag function
		deployJava.writeAppletTag = function(attributes, parameters) {
			var s = '<' + 'applet ';
			var codeAttribute = false;
			for (var attribute in attributes) {
				s += (' ' + attribute + '="' + attributes[attribute] + '"');
				if (attribute === 'code') {
					codeAttribute = true;
				}
			}
			if (!codeAttribute) {
				s += (' code="dummy"');
			}
			s += (' style="width:100%;height:100%"');

			s += '>';

			if (parameters !== 'undefined' && parameters != null) {
				var codebaseParam = false;
				for (var parameter in parameters) {
					if (parameter === 'codebase_lookup') {
					codebaseParam = true;
					}
					s += '<param name="' + parameter + '" value="' +
						parameters[parameter] + '">';
				}
				if (!codebaseParam) {
					s += '<param name="codebase_lookup" value="false">';
				}
			}
			s += '<' + '/' + 'applet' + '>';
			document.getElementById(javaAppletTagHostID).innerHTML = s;
		};

		deployJava.runApplet(attributes, objectParams, '1.6');

		return newDOMID;
	};


	function loadHTML5(baseURL, configURL, DOMID, langRegion, objectParams, onLoadFunction, onFailFunction) {
		var newDOMID = DOMID + _domPostfix;

		function loadScript(src, onLoad) {
			var script_tag = document.createElement("script");
			script_tag.setAttribute("type","text/javascript");
			script_tag.setAttribute("src", src);

			(document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);

			if (script_tag.readyState) {
				script_tag.onreadystatechange = function () { // For old versions of IE
					if (this.readyState === 'complete' || this.readyState === 'loaded') {
						onLoad();
					}
				};
			} else { // Other browsers
				script_tag.onload = onLoad;
			}
		}

		loadScript(baseURL + "playerHTML5.js", function() {
			playerHTML5(DOMID, newDOMID, onLoadFunction, configURL, langRegion, baseURL);
		});

		return newDOMID;
	}


	function loadHTML5Debug(baseURL, configURL, DOMID, langRegion, objectParams, onLoadFunction, onFailFunction) {
		var newDOMID = DOMID + _domPostfix;

		function loadScript(src, onLoad) {
			var script_tag = document.createElement("script");
			script_tag.setAttribute("type","text/javascript");
			script_tag.setAttribute("data-main", src);
			script_tag.setAttribute("src", baseURL + "lib/require.js");

			(document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);

			if (script_tag.readyState) {
				script_tag.onreadystatechange = function () { // For old versions of IE
					if (this.readyState === 'complete' || this.readyState === 'loaded') {
						onLoad();
					}
				};
			} else { // Other browsers
				script_tag.onload = onLoad;
			}
		}

		loadScript(baseURL + "core/main.js", function() {
            // add the common path for reading conf etc...
			require.config({
                paths: {
                    common: '..'
                },
                config: {
					text: {
						useXhr: function (url, protocol, hostname, port) {
							//Override function for determining if XHR should be used.
							//url: the URL being requested
							//protocol: protocol of page text.js is running on
							//hostname: hostname of page text.js is running on
							//port: port of page text.js is running on
							//Use protocol, hostname, and port to compare against the url
							//being requested.
							//Return true or false. true means "use xhr", false means
							//"fetch the .js version of this resource".
							return true;
						}
					}
                }
			});

			require(["main"], function (playerHTML5) {
				playerHTML5(DOMID, newDOMID, onLoadFunction, configURL, langRegion, baseURL);
			});
		});

		return newDOMID;
	}


	// private
	function MorpheusComponentPlayer(DOMID) {
		if (!DOMID) {
			// failed load
			return;
		}

		var DOM = null;

		function getDOM() {
			if (DOM === null) {
				DOM = document.getElementById(DOMID);
			}
			return DOM;
		}

		// API
		return {
			call:
				function (action, key, value) {
					return getDOM().call(action, key, value);
				},
			addEventListener:
				function (event, func) {
                    getDOM().addEventListener(event, func);
				},
			removeEventListener:
				function (event, func) {
                    getDOM().removeEventListener(event, func);
				},
			getVersion:
				function () {
					return getDOM().call("get", "app.version", null);
				},
			login:
				function (scheme, host, name, password, session) {
					getDOM().call("set", "user.login", {scheme_name:scheme, host_name:host, user_name:name, user_password:password, user_session:session});
				},
			getCredentials:
				function () {
					return getDOM().call("get", "user.login", null);
				},
			play:
				function (frameIn, frameOut) {
					getDOM().call("set", "deck.play", {play:true, frameIn:frameIn, frameOut:frameOut});
				},
			pause:
				function () {
					getDOM().call("set", "deck.play", {play:false});
				},
			buffer:
				function () {
					getDOM().call("set", "deck.buffer", null);
				},
			isPlaying:
				function () {
					return getDOM().call("get", "deck.play", null).play;
				},
			seek:
				function (frame, audible, highQuality, preparePlayback) {
					// for backwards compatibility, we'll need to default preparePlayback to true
					getDOM().call("set", "deck.head", {frame:frame, audible:audible, highQuality:highQuality, preparePlayback:(preparePlayback === undefined ? true : preparePlayback)});
				},
			load:
				function (name, key, type, frame, policy, background, forceRelink) {
					getDOM().call("set", "deck.load", {name:name, url:key, type:type, frame:frame, relink_policy:policy, background:background, force_relink:forceRelink});
				},
			loadSrc:
				function (key, type, frame, policy, background, forceRelink) {
					this.load("SRC", key, type, frame, policy, background, forceRelink);
				},
			loadDst:
				function (key, type, frame, policy, background, forceRelink) {
					this.load("DST", key, type, frame, policy, background, forceRelink);
				},
			loadBackground:
				function (key, type, frame, policy, forceRelink) {
					this.load("BGD", key, type, frame, policy, true, forceRelink);
				},
			isMediaLoaded:
				function () {
					return getDOM().call("get", "deck.load", null).loaded;
				},
			show:
				function (name, frame) {
					getDOM().call("set", "deck.switch", {name:name, frame:frame});
				},
			getShowing:
				function () {
					return getDOM().call("get", "deck.switch", null).name;
				},
			getFrame:
				function () {
					return getDOM().call("get", "deck.head", null).frame;
				},
			setStyle:
				function (style) {
					return getDOM().call("set", "deck.config", {key:"deck.ui.style.type", value:style}).success;
				},
			getStyle:
				function () {
					return getDOM().call("get", "deck.config", {key:"deck.ui.style.type"}).value;
				},
			getMarkIn:
				function () {
					return getDOM().call("get", "deck.mark_in", null).frame;
				},
			setMarkIn:
				function (markIn) {
					getDOM().call("set", "deck.mark_in", {frame:markIn});
				},
			getMarkOut:
				function () {
					return getDOM().call("get", "deck.mark_out", null).frame;
				},
			setMarkOut:
				function (markOut) {
					getDOM().call("set", "deck.mark_out", {frame:markOut});
				},
			getVolume:
				function (track) {
					return getDOM().call("get", "deck.audio.volume", {track:track}).volume;
				},
			setVolume:
				function (track, volume) {
					getDOM().call("set", "deck.audio.volume", {track:track, volume:volume});
				},
			getPan:
				function (track) {
					return getDOM().call("get", "deck.audio.pan", {track:track}).pan;
				},
			setPan:
				function (track, pan) {
					getDOM().call("set", "deck.audio.pan", {track:track, pan:pan});
				},
			getMute:
				function (track) {
					return getDOM().call("get", "deck.audio.mute", {track:track}).mute;
				},
			setMute:
				function (track, mute) {
					return getDOM().call("set", "deck.audio.mute", {track:track, mute:mute});
				},
			getSolo:
				function (track) {
					return getDOM().call("get", "deck.audio.solo", {track:track}).solo;
				},
			setSolo:
				function (track, solo) {
					return getDOM().call("set", "deck.audio.solo", {track:track, solo:solo});
				},
			getDuration:
				function () {
					return getDOM().call("get", "deck.duration", null).duration;
				},
			getFps:
				function () {
					return getDOM().call("get", "deck.fps", null).fps;
				},
			getStatistics:
				function () {
					return getDOM().call("get", "deck.statistics", null);
				},
			getAudioTrackTotal:
				function () {
					return getDOM().call("get", "deck.audio.total_tracks", null).tracks;
				},
			setTimecodeTrack:
				function (fps, drop, leap) {
					getDOM().call("set", "deck.timeline_track", {fps:fps, drop:drop, leap:leap});
				},
			setPlaybackSpeed:
				function (speed) {
					getDOM().call("set", "deck.speed", {speed:speed});
				},
			getPlaybackSpeed:
				function () {
					return getDOM().call("get", "deck.speed", null).speed;
				},
			enableMic:
				function (enabled) {
					return getDOM().call("set", "recorder.enable", {enable:enabled}).success;
				},
			isMicEnabled:
				function () {
					return getDOM().call("get", "recorder.enable", null).enabled;
				},
			startRecording:
                function (workspace, user, sequence,interplayServer, audioBitDepth) {
                    getDOM().call("set", "recorder.start", {workspace:workspace, user_name:user,
                    	sequence_name:sequence, interplay_server:interplayServer, audio_bit_depth:audioBitDepth});
				},
			stopRecording:
				function (cancel, interplayServer) {
					getDOM().call("set", "recorder.stop", {cancel:cancel, interplay_server:interplayServer});
                },
            confirmRecording:
                function (cancel, interplayServer) {
                    getDOM().call("set", "recorder.confirm", {cancel:cancel, interplay_server:interplayServer});
				},
			showAudioInSourceSelectionBox:
				function (show) {
					getDOM().call("set", "deck.ui.audio_source_selection", {show:show});
				},
			getRecordingSource:
				function () {
					return getDOM().call("get", "recorder.source", null).name;
				},
			setRecordingSource:
				function (source) {
					return getDOM().call("set", "recorder.source", {name:source});
				},
			getRecordingSources:
				function () {
					return getDOM().call("get", "recorder.sources", null).names;
				},
			setMicGain:
				function (gain) {
					getDOM().call("set", "recorder.gain", {gain:gain});
				},
			getMicGain:
				function () {
					return getDOM().call("get", "recorder.gain", null).gain;
				},
			setFullscreen:
				function (bool) {
					getDOM().call("set", "deck.fullscreen", {fullscreen:bool});
				},
			getFullscreen:
				function () {
					return getDOM().call("get", "deck.fullscreen", null).fullscreen;
				},
			getCurrentFrameImage:
				function () {
					return getDOM().call("get", "deck.image.current", null).image;
				},
			getAssetMetadata:
				function (url, type, relink_policy) {
					return getDOM().call("get", "asset.metadata", {url:url, type:type, relink_policy:relink_policy});
				},
			getAssetProxy:
				function (url, type, frame, width, height, quality) {
					return getDOM().call("get", "asset.proxy", {url:url, type:type, frame:frame, width:width, height:height, quality:quality});
				},
			modifyTimeline:
				function (name, action, xpath, value) {
					return this.multipleModifyTimeline(name, [{action:action, xpath:xpath, value:value}]);
				},
			multipleModifyTimeline:
				function (name, actions) {
					return getDOM().call("set", "deck.modify", {name:name, actions:actions});
				},
			getState:
				function () {
					return getDOM().call("get", "deck.state", null);
				},
			nextSegment:
				function () {
					return getDOM().call("set", "deck.segment.next", null);
				},
			previousSegment:
				function () {
					return getDOM().call("set", "deck.segment.previous", null);
				},
			clearCache:
				function () {
					return getDOM().call("set", "deck.clear_cache", null);
				},
			setConfig:
				function (key, value) {
					return getDOM().call("set", "deck.config", {key:key, value:value}).success;
				},
			getConfig:
				function (key) {
					return getDOM().call("get", "deck.config", {key:key}).value;
				},
			rssSubscribe:
				function(name, url, urlType) {
					return getDOM().call("set", "rss.subscribe", {name:name, rss_type:"RSS_ASSET_UPDATED", rss_params:{url:url, url_type:urlType}});
				},


			showStatistics:
				function(show) {
					return getDOM().call("set", "deck.ui.statistics", {show:show});
				},
			isStatisticsShowing:
				function() {
					return getDOM().call("get", "deck.ui.statistics", null).show;
				},


			showDebug:
				function(show) {
					return getDOM().call("set", "app.settingsdialog", {show:show});
				},
			isDebugShowing:
				function () {
					return getDOM().call("get", "app.settingsdialog", null).show;
				},


			loadCaptions:
				function(name, captions) {
					return getDOM().call("set", "deck.captions", {name:name, captions:captions}).success;
				},
			loadCaptionsByURL:
				function(name, url) {
					return getDOM().call("set", "deck.captions.url", {name:name, url:url}).success;
				},
			showCaptions:
				function(show) {
					getDOM().call("set", "deck.ui.captions", {show:show});
				},
			areCaptionsShowing:
				function() {
					return getDOM().call("get", "deck.ui.captions", null).show;
				},
			getTimeline:
				function() {
					return getDOM().call("get", "deck.timeline", null).timeline;
				},


			// multicam
			getMulticams:
				function () {
					var obj = getDOM().call("get", "deck.multicam", null);
					return obj ? obj.angles : null;
				},
			getMulticamAngle:
				function () {
					var obj = getDOM().call("get", "deck.multicam.angle", null);
					return obj ? obj.mobID : null;
				},
			setMulticamAngle:
				function (mobID) {
					getDOM().call("set", "deck.multicam.angle", {mobID:mobID});
				},
			getMulticamLayout:
				function () {
					var obj = getDOM().call("get", "deck.multicam.layout", null);
					return obj ? obj.layout : null;
				},
			setMulticamLayout:
				function (layout) {
					getDOM().call("set", "deck.multicam.layout", {layout:layout});
				},
			getMulticamBank:
				function () {
					var obj = getDOM().call("get", "deck.multicam.bank", null);
					return obj ? obj.bank : null;
				},
			setMulticamBank:
				function (bank) {
					getDOM().call("set", "deck.multicam.bank", {bank:bank});
				},
			getMulticamAudio:
				function () {
					return getDOM().call("get", "deck.multicam.audio", null);
				},
			setMulticamAudio:
				function (audio) {
					getDOM().call("set", "deck.multicam.audio", audio);
				},
			setMulticamRenderLayout:
				function (layout) {
					getDOM().call("set", "deck.multicam.layout.render", layout);
				},
			setMulticamClick:
				function (name, enabled) {
					// if name is null, we'll use plabyack object in foreground
					getDOM().call("set", "deck.multicam.click_enabled", {name:name, enabled:enabled})
				},
			getMulticamClick:
				function (name) {
					// if name is null, we'll use plabyack object in foreground
					return getDOM().call("get", "deck.multicam.click_enabled", {name:name}).enabled;
				},
			renderToCache:
				function (_in, out, threshold) {
					getDOM().call("set", "deck.render", {"in":_in, out:out, threshold:threshold});
				},
			getImage:
				function (name, frame, width, height, compression) {
					getDOM().call("get", "deck.image", {
						name:name,
						frame:frame,
						width:width,
						height:height,
						compression:compression
					});
				},
			getAudio:
				function (name, in_frame, length, bit_per_sample, frame_per_second) {
					getDOM().call("get", "deck.audio", {
						name:name,
						in_frame:in_frame,
						length:length,
						bit_per_sample:bit_per_sample,
						frame_per_second:frame_per_second
					});
				},
			execXcoreCommand:
				function (command) {
					getDOM().call("set", "xcore.exec", {command:command});
				}
		}
	}


	function log(type, message) {
		// in IE, console is only available when the debug panel is open
		if (!console)
			return;

		switch (type) {
			case "error":
				console.error(message);
				break;
			case "warn":
				console.warn(message);
				break;
			case "log":
				console.log(message);
				break;
		}
	}




	// public API
	return {
		loadComponent: function (type, archiveURL, configURL, DOMID, langRegion, objectParams, onLoadFunction, onFailFunction) {
				// for backwards compatibility, if they send us a string for a function, we'll need to save it
				if (typeof onLoadFunction == "string") {
					MorpheusClientLoadComponentFunction = window[onLoadFunction];
				} else {
					MorpheusClientLoadComponentFunction = onLoadFunction;
				}

				switch (type) {
					case "player":
					case "Flash":
						return new MorpheusComponentPlayer(morpheusLoadSWF(archiveURL, configURL, DOMID, langRegion, objectParams, "MorpheusClientLoadComponent", onFailFunction));
					case "jplayer":
						return new MorpheusComponentPlayer(morpheusLoadJava(archiveURL, configURL, DOMID, langRegion, objectParams, "MorpheusClientLoadComponent", onFailFunction));
					case "HTML5":
						return new MorpheusComponentPlayer(loadHTML5(archiveURL, configURL, DOMID, langRegion, objectParams, "MorpheusClientLoadComponent", onFailFunction));
					case "HTML5Debug":
						return new MorpheusComponentPlayer(loadHTML5Debug(archiveURL, configURL, DOMID, langRegion, objectParams, "MorpheusClientLoadComponent", onFailFunction));
					default:
						log("error", "MorpheusClient unknown type: "+ type);
				}
			},
		registerComponent: function (type, DOMID) {
				switch (type) {
					case "player":
					case "Flash":
					case "HTML5":
						// append the way the morpheusLoadSWF function does
						return new MorpheusComponentPlayer(DOMID + _domPostfix);
					default:
						log("error", "MorpheusClient unknown type: "+ type);
				}
			},
		getMinimumVersion: function () {
			return _minFlashVersion;
		}
	}
}();


// gets
var MorpheusClientLoadComponentFunction;

// global function the client can call which then calls the host's onload
function MorpheusClientLoadComponent(event) {
    document.getElementById(event.params.DOMID).style.margin = "auto";
	MorpheusClientLoadComponentFunction(event);
};
