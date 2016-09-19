// Set it false to record only audio
var recordVideoSeparately = !!navigator.webkitGetUserMedia;
var cameraPreview = document.getElementById('camera-preview');

if (!!navigator.webkitGetUserMedia && !recordVideoSeparately) {
  cameraPreview.parentNode.innerHTML = '<audio id="camera-preview" controls style="border: 1px solid rgb(15, 158, 238); width: 94%;"></audio> ';
}

var socket = io.connect();

var mediaStream = null;

socket.on('connect', function() {
  startRecording.disabled = false;
});

var startRecording = document.getElementById('start-recording');
var stopRecording = document.getElementById('stop-recording');
var progressBar = document.querySelector('#progress-bar');
var percentage = document.querySelector('#percentage');
var recordAudio, recordVideo;

startRecording.onclick = function() {
  startRecording.disabled = true;
  navigator.getUserMedia({
    audio: true,
    video: true
  }, function(stream) {
    mediaStream = stream;
    recordAudio = RecordRTC(stream, {
      onAudioProcessStarted: function() {
        recordVideoSeparately && recordVideo.startRecording();
        cameraPreview.src = window.URL.createObjectURL(stream);
        cameraPreview.play();
        cameraPreview.muted = true;
        cameraPreview.controls = false;
      }
    });
    recordVideo = RecordRTC(stream, {
      type: 'video'
    });
    recordAudio.startRecording();
    stopRecording.disabled = false;
  }, function(error) {
    alert(JSON.stringify(error));
  });
};

stopRecording.onclick = function() {
  startRecording.disabled = false;
  stopRecording.disabled = true;
  // stop audio recorder
  recordVideoSeparately && recordAudio.stopRecording(function() {
    // stop video recorder
    recordVideo.stopRecording(function() {
      // get audio data-URL
      recordAudio.getDataURL(function(audioDataURL) {
        // get video data-URL
        recordVideo.getDataURL(function(videoDataURL) {
          var files = {
            audio: {
              type: recordAudio.getBlob().type || 'audio/wav',
              dataURL: audioDataURL
            },
            video: {
              type: recordVideo.getBlob().type || 'video/webm',
              dataURL: videoDataURL
            }
          };
          socket.emit('message', files);
          if (mediaStream) mediaStream.stop();
        });
      });
      cameraPreview.src = '';
      cameraPreview.poster = '/images/ajax-loader.gif';
    });
  });
  // if firefox or if you want to record only audio
  // stop audio recorder
  !recordVideoSeparately && recordAudio.stopRecording(function() {
    // get audio data-URL
    recordAudio.getDataURL(function(audioDataURL) {
      var files = {
        audio: {
          type: recordAudio.getBlob().type || 'audio/wav',
          dataURL: audioDataURL
        }
      };
      socket.emit('message', files);
      if (mediaStream) mediaStream.stop();
    });
    cameraPreview.src = '';
    cameraPreview.poster = '/images/ajax-loader.gif';
  });
};

socket.on('merged', function(fileName) {
  var href = (location.href.split('/').pop().length ? location.href.replace(location.href.split('/').pop(), '') : location.href);
  href = href + 'uploads/' + fileName;
  console.log('got file ' + href);
  cameraPreview.src = href;
  cameraPreview.play();
  cameraPreview.muted = false;
  cameraPreview.controls = true;
});

socket.on('ffmpeg-output', function(result) {
  if (parseInt(result) >= 100) {
    progressBar.parentNode.style.display = 'none';
    return;
  }
  progressBar.parentNode.style.display = 'block';
  progressBar.value = result;
  percentage.innerHTML = 'Ffmpeg Progress ' + result + "%";
});

socket.on('ffmpeg-error', function(error) {
  alert(error);
});
