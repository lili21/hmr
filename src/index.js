const message = require('./message.js')

document.getElementById('message').textContent = message

const timer = document.getElementById('timer')

let i = 0
setInterval(() => {
  timer.textContent = i
  i += 1
}, 1000)
