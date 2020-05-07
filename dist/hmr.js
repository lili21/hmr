/* This file is included in the page running the app */
(function() {
  // create an instance of Socket.IO for listening
  // to websocket messages
  var socket = io();

  // listen for 'file-change' message
  socket.on('file-change', function(msg) {
    console.log('File changed: ' + msg.id);
    // reload the browser to get the latest changes
    // we will replace this later to "hot update"
    // only the changed modules
    // window.location.reload();
    var script = document.createElement('script')
    script.src = `/hot-update?moduleId=${msg.id}`
    document.head.appendChild(script)
  });
})();