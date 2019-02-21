/* Copyright G. Hemingway @2018 - All rights reserved */
"use strict";

let Joi = require("joi");
const _ = require("underscore");
const {
  initialState,
  filterGameForProfile,
  filterMoveForResults,
  validateMove,
  executeMove,
  findAutoMove,
  isGameEnd
} = require("../../solitare");

module.exports = app => {
  /**
   * Create a new game
   *
   * @param {req.body.game} Type of game to be played
   * @param {req.body.color} Color of cards
   * @param {req.body.draw} Number of cards to draw
   * @return {201 with { id: ID of new game }}
   */
  app.post("/v1/game", (req, res) => {
    if (!req.session.user) {
      res.status(401).send({ error: "unauthorized" });
    } else {
      // Schema for user info validation
      let schema = Joi.object().keys({
        game: Joi.string()
          .lowercase()
          .required(),
        color: Joi.string()
          .lowercase()
          .required(),
        draw: Joi.any()
      });
      // Validate user input
      Joi.validate(
        req.body,
        schema,
        { stripUnknown: true },
        async (err, data) => {
          if (err) {
            const message = err.details[0].message;
            console.log(`Game.create validation failure: ${message}`);
            res.status(400).send({ error: message });
          } else {
            // Set up the new game
            let newGame = {
              owner: req.session.user._id,
              active: true,
              cards_remaining: 52,
              color: data.color,
              game: data.game,
              score: 0,
              start: Date.now(),
              winner: "",
              state: []
            };
            switch (data.draw) {
              case "Draw 1":
                newGame.drawCount = 1;
                break;
              case "Draw 3":
                newGame.drawCount = 3;
                break;
              default:
                newGame.drawCount = 1;
            }
            //console.log(newGame);
            // Generate a new initial game state
            newGame.state = initialState();
            let game = new app.models.Game(newGame);
            try {
              await game.save();
              const query = { $push: { games: game._id } };
              // Save game to user's document too
              await app.models.User.findByIdAndUpdate(
                req.session.user._id,
                query
              );
              res.status(201).send({ id: game._id });
            } catch (err) {
              console.log(`Game.create save failure: ${err}`);
              res.status(400).send({ error: "failure creating game" });
              // TODO: Much more error management needs to happen here
            }
          }
        }
      );
    }
  });

  /**
   * Fetch game information
   *
   * @param (req.params.id} Id of game to fetch
   * @return {200} Game information
   */
  app.get("/v1/game/:id", async (req, res) => {
    try {
      let game = await app.models.Game.findById(req.params.id);
      if (!game) {
        res.status(404).send({ error: `unknown game: ${req.params.id}` });
      } else {
        const state = game.state.toJSON();
        let results = filterGameForProfile(game);
        results.start = Date.parse(results.start);
        results.cards_remaining =
          52 -
          (state.stack1.length +
            state.stack2.length +
            state.stack3.length +
            state.stack4.length);
        // Do we need to grab the moves
        if (req.query.moves === "") {
          const moves = await app.models.Move
            .find({ game: req.params.id })
            .populate('user');
          state.moves = moves.map(move => filterMoveForResults(move));
        }
        res.status(200).send(_.extend(results, state));
      }
    } catch (err) {
      console.log(`Game.get failure: ${err}`);
      res.status(404).send({ error: `unknown game: ${req.params.id}` });
    }
  });

  /**
   * Request a game move
   *
   * @param (req.params.id} Id of game to play move on
   * @param (req.body) Move to be executed
   * @return {200 || 400 } New game state || error with move
   */
  app.put("/v1/game/:id", async (req, res) => {
    try {
      console.log("req.params.id:",req.params.id);
      console.log("req:",req.body);
      let game = await app.models.Game.findById(req.params.id);
      if (!game) {
        res.status(404).send({ error: `unknown game: ${req.params.id}` });
      } else if (!req.session.user
              || req.session.user._id.toString()!==game.owner.toString()) {
        res.status(404).send({ error: `unauthorized`});
      }
      else {
        let state=game.state.toJSON();
        if (!validateMove(req.body.move,state)) {
          res.status(404).send({ error: `invalid move`});
        } else {
          let score=executeMove(req.body.move,state,game.drawCount);

          //save move
          let new_move = new app.models.Move({
            user: req.session.user._id,
            game: req.params.id,
            cards: req.body.move.cards,
            src: req.body.move.src,
            dst: req.body.move.dst,
          });
          try {
            //console.log("new_move:",new_move);
            await new_move.save();
            console.log("Updated Move in mongodb");
          } catch (err) {
            console.log("Failed to update Move in mongodb");
          }

          //save game state
          let query = { _id: req.params.id };
          try {
            await app.models.Game.findOneAndUpdate(
              query,
              { state: state, moves: game.moves+1, score: game.score+score },
            );
            console.log("Updated Game in mongodb");
          } catch (err) {
            console.log(`Failed to update Game in mongodb`);
          }

          res.status(200).send(state);
        }
      }
    } catch (err) {
      console.log(`Game.get failure: ${err}`);
      res.status(404).send({ error: `unknown error in game: ${req.params.id}` });
    }
  });

  /**
   * AutoComplete a game move (from pile to stack)
   *
   * @param (req.params.id) Id of game to play move on
   * @return {200 || 400} Valid Move || no valid Move
   */
  app.get("/v1/game/autoComplete/:id", async (req,res) => {
    try {
      console.log("req.params.id:",req.params.id);
      let game = await app.models.Game.findById(req.params.id);
      if (!game) {
        res.status(404).send({ error: `unknown game: ${req.params.id}` });
      } else if (!req.session.user
        || req.session.user._id.toString()!==game.owner.toString()) {
        res.status(404).send({ error: `unauthorized`});
      }
      else {
        let state=game.state.toJSON();
        let autoMove=findAutoMove(state);
        // console.log("autoMove: ",autoMove);
        if (autoMove.src==="") {
          res.status(404).send({error: `no valid move`});
        } else {
          res.status(200).send(autoMove);
        }
      }
    } catch (err) {
      console.log(`Game.get failure: ${err}`);
      res.status(404).send({ error: `unknown error in game: ${req.params.id}` });
    }
  });

  /**
   * Recognize end of game (no valid move from pile to stack, from discard/ draw to stack)
   *
   * @param (req.params.id) Id of game
   * @return {200 || 400} end of game || not end of game
   */
  app.get("/v1/game/endOfGame/:id", async (req,res) => {
    try {
      console.log("req.params.id:",req.params.id);
      let game = await app.models.Game.findById(req.params.id);
      if (!game) {
        res.status(404).send({ error: `unknown game: ${req.params.id}` });
      } else if (!req.session.user
        || req.session.user._id.toString()!==game.owner.toString()) {
        res.status(404).send({ error: `unauthorized`});
      }
      else {
        let state=game.state.toJSON();
        if (isGameEnd(state)) {
          res.status(200).send({error: `Not End`});
        } else {
          res.status(201).send({error: `Game End`});
        }
      }
    } catch (err) {
      res.status(404).send({ error: `unknown error in game: ${req.params.id}` });
    }
  });

  /**
   * End a game
   *
   * @param (req.params.id) Id of game
   * @return {200 || 404} success || failure
   */
  app.put("/v1/game/endGame/:id", async (req,res) => {
    try {
      console.log("req.params.id:",req.params.id);
      let game = await app.models.Game.findById(req.params.id);
      if (!game) {
        res.status(404).send({ error: `unknown game: ${req.params.id}` });
      } else if (!req.session.user
        || req.session.user._id.toString()!==game.owner.toString()) {
        res.status(404).send({ error: `unauthorized`});
      }
      else {
        //update game state
        let query = { _id: req.params.id };
        try {
          await app.models.Game.findOneAndUpdate(
            query,
            { active: false },
          );
          console.log("End Game in mongodb");
          res.status(200).send();
        } catch (err) {
          console.log(`Failed to end Game in mongodb`);
          res.status(404).send();
        }
      }
    } catch (err) {
      res.status(404).send({ error: `unknown error in game: ${req.params.id}` });
    }
  });
};
