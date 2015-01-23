'use strict';

var Q = require('q');
var util = require('../util');

/**
 * Construct a new {@link Stream} from a MediaStream.
 * @class
 * @classdesc {@link Stream} wraps a MediaStream object (either from
 *   <code>navigator.getUserMedia</code> or elsewhere), and provides it with a
 *   high-level API for mute/unmute, pause/unpause, and attaching to
 *   HTML &lt;video&gt; elements.
 *   <br><br>
 *   You should not call {@link Stream}'s construct directly; most methods,
 *   such as {@link Endpoint#createSession}, will construct a {@link Stream}
 *   when necessary.
 * @param {MediaStream} mediaStream - the MediaStream to wrap
 * @property {MediaStream} mediaStream - the wrapped MediaStream
 * @property {boolean} muted - whether or not the {@link Stream}'s audio is
 *   muted. Set this property to true or false to mute or unmute audio,
 *   respectively
 * @property {boolean} paused - whether or not the {@link Stream}'s video is
 *   paused. Set this property to true or false to pause or unpause video,
 *   respectively
 */
function Stream(mediaStream, options) {
  if (!(this instanceof Stream)) {
    return new Stream(mediaStream, options);
  }
  options = util.withDefaults(options, {
    'local': null,
    'muted': false,
    'paused': false
  });
  var local = options['local'];
  var muted = options['muted'];
  var paused = options['paused'];
  Object.defineProperties(this, {
    _local: {
      value: local
    },
    'mediaStream': {
      value: mediaStream
    },
    'muted': {
      get: function() {
        return muted;
      },
      set: function(_muted) {
        toggleAudioTracks(mediaStream, !_muted);
        muted = !!_muted;
      }
    },
    'paused': {
      get: function() {
        return paused;
      },
      set: function(_paused) {
        toggleVideoTracks(mediaStream, !_paused);
        paused = !!_paused;
      }
    }
  });
  toggleAudioTracks(mediaStream, muted);
  toggleVideoTracks(mediaStream, paused);
  return Object.freeze(this);
}

function _getUserMedia(constraints, onSuccess, onFailure) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    if (typeof navigator.webkitGetUserMedia === 'function') {
      navigator.webkitGetUserMedia(constraints, onSuccess, onFailure);
    } else if (typeof navigator.mozGetUserMedia === 'function') {
      navigator.mozGetUserMedia(constraints, onSuccess, onFailure);
    }
    return;
  }
  onFailure(new Error('getUserMedia is not supported'));
}

/**
 * This function is very similar to <code>navigator.getUserMedia</code> except
 * that it does not use callbacks and returns a Promise for a {@link Stream}.
 * @param {MediaStreamConstraints} [constraints={audio:true,video:true}] - the
 *   MediaStreamConstraints object specifying what kind of LocalMediaStream to
 *   request from the browser (by default both audio and video)
 * @returns Promise<Stream>
 */
Stream.getUserMedia = function getUserMedia(constraints, options) {
  var deferred = Q.defer();
  constraints = constraints || { 'audio': true, 'video': true };
  options = util.withDefaults(options, {
    'local': true
  });
  _getUserMedia(constraints, onSuccess, onFailure);
  function onSuccess(mediaStream) {
    deferred.resolve(new Stream(mediaStream, options));
  }
  function onFailure(error) {
    deferred.reject(error);
  }
  return deferred.promise;
};

/**
 * Attaches the {@link Stream} to an HTML &lt;video&gt; element.
 * If the &lt;video&gt; element is omitted, one will be created.
 * @instance
 * @param {HTMLVideoElement} [video=a new <video> element] - an existing
 *  &lt;video&gt; element
 * @returns {HTMLVideoElement}
 */
Stream.prototype.attach = function attach(video) {
  if (!video && typeof document === 'undefined') {
    throw new Error('Cannot create <video> element');
  }
  video = video || document.createElement('video');
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    if (typeof navigator.webkitGetUserMedia === 'function') {
      var vendorURL = window.URL || window.webkitURL;
      video.src = vendorURL.createObjectURL(this.mediaStream);
    } else if (typeof navigator.mozGetUserMedia === 'function') {
      video.mozSrcObject = this.mediaStream;
    }
    if (this._local) {
      video.muted = true;
    }
    video.play();
    return video;
  }
  throw new Error('Cannot attach to <video> element');
};

/**
 * Pause or unpause the {@link Stream}'s video. If this {@link Stream}
 * represents a LocalMediaStream, then pausing causes any remote
 * {@link Participant}s to no longer see video.
 * @instance
 * @param {boolean} [pause=true] - whether to pause or unpause the video (defaults to pause)
 * @returns Stream
 */
/* Stream.prototype.pauseVideo = function pauseVideo(pause) {
  pause = (pause !== true && pause !== false) ? true : pause;
  if (pause && !this.paused) {
    toggleVideoTracks(this.mediaStream, !pause);
    this._paused = true;
  } else if (!pause && this.paused) {
    toggleVideoTracks(this.mediaStream, !pause);
    this._paused = false;
  }
  return this;
}; */

/**
 * Mute or unmute the {@link Stream}'s audio. If this {@link Stream}
 * represents a LocalMediaStream, then muting causes any remote
 * {@link Participant}s to no longer hear audio.
 * @instance
 * @param {boolean} [mute=true] - whether to mute or unmute the audio (defaults to mute)
 * @returns Stream
 */
/* Stream.prototype.muteAudio = function muteAudio(mute) {
  mute = (mute !== true && mute !== false) ? true : mute;
  if (mute && !this.muted) {
    toggleAudioTracks(this.mediaStream, !mute);
    this._muted = true;
  } else if (!mute && this.muted) {
    toggleAudioTracks(this.mediaStream, !mute);
    this._muted = false;
  }
  return this;
}; */

function toggleVideoTracks(mediaStream, enabled) {
  mediaStream.getVideoTracks().forEach(function(videoTrack) {
    videoTrack.enabled = enabled;
  });
}

function toggleAudioTracks(mediaStream, enabled) {
  mediaStream.getAudioTracks().forEach(function(audioTrack) {
    audioTrack.enabled = enabled;
  });
}

module.exports = Stream;