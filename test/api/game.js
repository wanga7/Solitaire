/* Copyright G. Hemingway, 2018 - All rights reserved */
"use strict";

let should = require("should"),
  assert = require("assert"),
  request = require("superagent"),
  harness = require("./harness"),
  data = require("./data"),
  config = {},
  users = data.users,
  games = data.games;
const envConfig = require("simple-env-config");
const env = process.env.NODE_ENV ? process.env.NODE_ENV : "test";

/**************************************************************************/

describe("Game:", () => {
  let primaryAgent = request.agent(),
    anonAgent = request.agent();
  before(done => {
    envConfig("./config/config.json", env).then(conf => {
      config = conf;
      config.url = `${config.url}:${config.port}${config.api_version}/`;
      harness.setup(config.mongodb, () => {
        // Create a user for game testing
        harness.createUser(config.url, users.primary, () => {
          // Log in the user with primaryAgent
          harness.login(config.url, primaryAgent, users.primary, () => {
            done();
          });
        });
      });
    });
  });

  describe("Start New Game:", () => {
    it("Failure - missing game", done => {
      primaryAgent
        .post(`${config.url}game`)
        .send({
          color: "red",
          draw: "Draw 1"
        })
        .end((err, res) => {
          res.status.should.equal(400);
          res.body.error.should.equal(`"game" is required`);
          done();
        });
    });
    it("Failure - missing color", done => {
      primaryAgent
        .post(`${config.url}game`)
        .send({
          game: "klondyke",
          draw: "Draw 1"
        })
        .end((err, res) => {
          res.status.should.equal(400);
          res.body.error.should.equal(`"color" is required`);
          done();
        });
    });
    it("Failure - unknown game", done => {
      primaryAgent
        .post(`${config.url}game`)
        .send({
          game: "blarg",
          color: "red",
          draw: "Draw 1"
        })
        .end((err, res) => {
          res.status.should.equal(400);
          res.body.error.should.equal(`failure creating game`);
          done();
        });
    });
    it("Failure - must be logged in", done => {
      anonAgent
        .post(`${config.url}game`)
        .send(games.primary)
        .end((err, res) => {
          res.status.should.equal(401);
          res.body.error.should.equal(`unauthorized`);
          done();
        });
    });
    it("Success - create new game", done => {
      primaryAgent
        .post(`${config.url}game`)
        .send(games.primary)
        .end((err, res) => {
          res.status.should.equal(201);
          res.body.should.have.property("id");
          games.primary.id = res.body.id;
          done();
        });
    });
  });

  describe("Fetch Game Info:", () => {
    it("Failure - unknown game", done => {
      primaryAgent
        .get(`${config.url}game/blargblarg`)
        .end((err, res) => {
          res.status.should.equal(404);
          res.body.error.should.equal(`unknown game: blargblarg`);
          done();
        });
    });
    it("Success - Fetch known game", done => {
      primaryAgent
        .get(`${config.url}game/${games.primary.id}`)
        .end((err, res) => {
          res.status.should.equal(200);
          res.body.id.should.equal(games.primary.id);
          done();
        });
    });
  });

  after(done => {
    // Log out the primary agent
    harness.logout(config.url, primaryAgent, () => {
      harness.shutdown(done);
    });
  });
});
