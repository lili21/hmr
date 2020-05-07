const mdeps = require('module-deps')
const browserPack = require('browser-pack')
const JSONStream = require('JSONStream')
const fs = require('fs')
const path = require('path')
// express - for serving our app
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

// parse arugments to get entry point file name and path
const args = process.argv.slice(2)
if (args.length <= 0) {
  // check if entry point file is specified when running the command
  console.log('Specify an entry point file')
  process.exit(1)
}

let moduleDepsJSONStr
let moduleDepsJSON
let bundleStr

const processModuleDepsStr = function (str) {
  // since JSON is from stream, we need to store
  // it in a variable until the end of the stream is reached
  moduleDepsJSONStr += str
}

const processModuleDepsEnd = function (str) {
  // Once we have the complete JSON, parse and store it
  // for future use
  moduleDepsJSON = JSON.parse(moduleDepsJSONStr)
}

const processBundleStr = function (data) {
  // store the bundle output until the stream
  // is completely processed
  bundleStr += data
}

const preludeFile = path.join(__dirname, './prelude.js')

// Let's keep the bundle creation in a separate function
// which will come in handy when we invoke this whenever
// a file changes
const processFiles = function (callback) {
  // invoke module-deps by passing in the entry point file
  const md = mdeps()
  moduleDepsJSONStr = ''
  bundleStr = ''
  md.pipe(JSONStream.stringify())
    .on('data', processModuleDepsStr)
    .on('end', processModuleDepsEnd)
    .pipe(browserPack({
      prelude: fs.readFileSync(preludeFile, 'utf-8'),
      preludePath: preludeFile
    }))
    .on('data', processBundleStr)
    .on('end', function () {
      fs.writeFile('dist/bundle.js', bundleStr, 'utf8', function () {
        console.log('Bundle file written...')
        if (typeof callback === 'function') {
          callback()
        }
      })
    })

  md.end({ file: path.join(__dirname, args[0]) })
}

// watch src folder for changes
fs.watch('src', function (event, fileName) {
  // create bundle with new changes
  processFiles(function () {
    // notify the browser of the change
    io.emit('file-change', { id: path.join(__dirname, 'src', fileName) })
  })
})

// Call the function to create the bundle
processFiles()

// configure express to serve contents of 'dist' folder
app.use('/', express.static('dist'))
app.get('/hot-update', function (req, res) {
  const moduleId = req.query.moduleId
  console.log(moduleId)
  // wrap the module code around JSONP callback function
  let hotUpdateScriptTxt = 'hotUpdate({ "' + moduleId + '":[function(require,module,exports){'
  // find the updated module in moduleDepsJSON (output from module-deps)
  const updatedModule = moduleDepsJSON.filter(function (dep) {
    return dep.id === moduleId
  })[0]
  // append source of the updated module to the hot update script
  hotUpdateScriptTxt += updatedModule.source
  // finish up hotUpdateScriptTxt
  hotUpdateScriptTxt += '},'
  // append dependencies
  hotUpdateScriptTxt += JSON.stringify(updatedModule.deps)
  hotUpdateScriptTxt += ']});'
  // send the update script
  res.send(hotUpdateScriptTxt)
})
// serve the app
http.listen(3001, function () {
  console.log('Serving dist on *:3001')
})
