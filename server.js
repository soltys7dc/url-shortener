'use strict';
const port = process.env.PORT || 3002;
const fs = require('fs');
const express = require('express');
const app = express();

const MongoClient = require('mongodb').MongoClient;
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'url-shortener';

if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

app.use('/public', express.static(process.cwd() + '/public'));

app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
  });
  
app.route('/')
    .get(function(req, res) {
      res.sendFile(process.cwd() + '/views/index.html');
    })

let connected = null;
const connection = () => {
  if (connected) {
    return connected;
  }
  return connected = MongoClient.connect(mongoURL);
}

app.route('/new/*')
    .get((req,res) => {
      const urlRegex = /(https?):\/\/(-\.)?([^\s\/?\.#-]+\.?)+(\/[^\s]*)?/
      const urlID = Math.floor(Math.random() * (9999 - 1111)) + 1111      
      const url = req.path.match(urlRegex)[0]
      const response = { "original_url": url, "short_url": `${req.headers.host}/${urlID}`}
      connection()
        .then((client) => {
          const col = client.db(dbName).collection('URLs');
          col.insertOne(Object.assign({"id": urlID}, response), {}, (err, result) => {
            res.json(response);
          })
        })
        .catch(console.error.bind(console));
    });

app.route('/:id')
  .get((req, res) => {
    const id = req.params.id;
    connection()
      .then((client) => {
        const col = client.db(dbName).collection('URLs');
        col.findOne({"id": Number(id)}, (err, result) => {
          res.redirect(result.original_url);
        })
      })
      .catch(console.error.bind(console));
  })

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});
