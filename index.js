const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const moment = require('moment')
let bodyParser = require('body-parser');
const { response } = require('express');
const { isModuleNamespaceObject } = require('util/types');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI);

let userSchema = new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
})

/*let exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
})*/
let User = mongoose.model('User', userSchema)
//let Exercise = mongoose.model('Exercise', userSchema)

app.use(bodyParser.urlencoded({extended: false}));
app.use(cors())
app.use(express.static('public'))


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  queryUsers({}, ['username', '_id'], (err, docs) => {
    if (err) {res.json({error: err})}
    else {
      res.send(docs);
    }
  })
});


app.post('/api/users', (req, res) => {
  newUserName = req.body.username;

  createAndSaveUser({username: newUserName}, (err, data) => {
    if (err) {res.json({error: err})} 
    else { res.json({
      username: data.username,
      _id: data._id
    })}
  })
  
});

app.post('/api/users/:_id/exercises', (req, res) => {
  //add exercise
  if (!req.params._id) return res.json({error: 'No user ID was specified'})
  
  User.findById(req.params._id, (err, user) => {
    if (err) {res.json({error: err}) }
    else {
      let exerciseDate
      if (req.body.date!=='') {exerciseDate = moment(req.body.date).format('ddd MMM DD YYYY')} else {exerciseDate = moment().format('ddd MMM DD YYYY')}
      
      user.log.push({
        duration: req.body.duration,
        description: req.body.description,
        date: exerciseDate
      });
      user.save()
        .then(doc => {
          addedExercise = doc.log[doc.log.length-1]
          res.json({
            _id: doc._id,
            username: doc.username,
            description: addedExercise.description,
            duration: addedExercise.duration,
            date: moment(addedExercise.date).format('ddd MMM DD YYYY'),
          })}
        )
        .catch(err => res.json({error: err})
          )
      }
    })
  })

app.get('/api/users/:_id/logs', (req, res) => {

  User.findById(req.params._id, (err, user) => {
    if (err) {res.json({error: err}) }
    else {
      tempLog = user.log.slice();
      if (req.query.to && req.query.from){
        if (moment(req.query.from).isValid() && moment(req.query.to).isValid()) 
          tempLog = tempLog.filter(elem => moment(elem.date).isBetween(req.query.to, req.query.from))
      }

      if (req.query.limit && Number.isInteger(req.query.limit)){
        tempLog = tempLog.slice(0, Number(req.query.limit))
      }

      let logCount = tempLog.length;
      res.json({
        username: user.username,
        from: moment(req.query.from).format('ddd MMM DD YYYY'),
        to: moment(req.query.to).format('ddd MMM DD YYYY'),
        count: logCount,
        _id: user._id,
        log: [...tempLog]
      }) 
    }
  })

});

const createAndSaveUser = (user, done) => {
    newUser = new User({
    username: user.username,
  }) 
  newUser.save((err, data) => {
    if (err) {
      return console.error(err);
    } else { 
      done(null, data);
  }
   } ) 
};

const queryUsers = (options, select,  done) => {
  User.find(options)
  .sort({username: 'ascending'}) // or 'asc'
  .select(select)
  .exec((err, res) => {
    if (err) { done(err, null); } else { done(null, res); }
  })
};

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
