/* Copyright G. Hemingway, 2018 - All rights reserved */
"use strict";

let _ = require("lodash"),
  async = require("async"),
  should = require("should"),
  assert = require("assert"),
  request = require("superagent"),
  mongoose = require("mongoose"),
  Models = {};

let timeout = (module.exports.timeout = 100);

/**************************************************************************/

let defaultCollections = [
  { name: "users", path: "../../src/server/models/user" },
  { name: "games", path: "../../src/server/models/game" },
  { name: "moves", path: "../../src/server/models/move" }
];

module.exports.setup = async (mongoURL, done) => {
  let collections = defaultCollections;
  // In our tests we use the test db
  mongoose.set("useFindAnyModify", false); // New deprecation warnings
  mongoose.set("useCreateIndex", true); // New deprecation warnings
  try {
    await mongoose.connect(
      mongoURL,
      { useNewUrlParser: true }
    );
    // Setup all of the models
    _.each(collections, collection => {
      Models[collection.name] = require(collection.path);
    });
    if (collections !== []) {
      cleanup(collections, () => {
        done();
      });
    }
  } catch (err) {
    console.log(`Mongo connection error: ${err}`);
    done();
  }
};

let cleanup = (module.exports.cleanup = (collections, done) => {
  async.eachSeries(
    collections,
    (collection, callback) => {
      try {
        Models[collection.name].deleteMany({}, () => {
          console.log(`    Collection ${collection.name} dropped.`);
          callback();
        });
      } catch (ex) {
        console.log("Cleanup error on: " + collection.name);
        console.log(ex);
        callback();
      }
    },
    done
  );
});

module.exports.shutdown = done => {
  // No need to drop anything here
  let collections = []; //defaultCollections;
  cleanup(collections, () => {
    mongoose.connection.close();
    done();
  });
};

module.exports.login = (url, agent, user, done) => {
  // Ok, now login with user
  agent
    .post(`${url}session`)
    .send({ username: user.username, password: user.password })
    .end((req, res) => {
      res.status.should.equal(200);
      res.body.username.should.equal(user.username);
      res.body.primary_email.should.equal(user.primary_email);
      done();
    });
};

module.exports.logout = (url, agent, done) => {
  agent.del(`${url}session`).end((req, res) => {
    res.status.should.equal(204);
    done();
  });
};

module.exports.createUser = (url, user, done) => {
  // Create a user for general context of the tests
  request
    .post(`${url}user`)
    .send(user)
    .end((req, res) => {
      res.status.should.equal(201);
      setTimeout(done, timeout);
    });
};
