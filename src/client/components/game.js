/* Copyright G. Hemingway, 2018 - All rights reserved */
"use strict";

import React, { Component } from "react";
import PropTypes from "prop-types";
import { Pile } from "./pile";
import styled from "styled-components";
import $ from 'jquery';
import {
  FormButton, ModalNotifyEnd
} from "./shared";

/*************************************************************************/

const CardRow = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 2em;
`;

const CardRowGap = styled.div`
  flex-grow: 2;
`;

const GameBase = styled.div`
  grid-row: 2;
  grid-column: sb / main;
`;

export class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      target: undefined,
      startDrag: { x: 0, y: 0 },
      pile1: [],
      pile2: [],
      pile3: [],
      pile4: [],
      pile5: [],
      pile6: [],
      pile7: [],
      stack1: [],
      stack2: [],
      stack3: [],
      stack4: [],
      draw: [],
      discard: [],

      m_cards: [],
      m_src: "",
      m_dst: ""
    };
    this.onClick = this.onClick.bind(this);
    this.onClick2 = this.onClick2.bind(this);
    this.card_exist = this.card_exist.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.button_AutoComplete = this.button_AutoComplete.bind(this);
    this.onGameEnd = this.onGameEnd.bind(this);
    this.onGameContinue = this.onGameContinue.bind(this);
  }

  componentDidMount() {
    fetch(`/v1/game/${this.props.match.params.id}`)
      .then(res => res.json())
      .then(data => {
        this.setState({
          pile1: data.pile1,
          pile2: data.pile2,
          pile3: data.pile3,
          pile4: data.pile4,
          pile5: data.pile5,
          pile6: data.pile6,
          pile7: data.pile7,
          stack1: data.stack1,
          stack2: data.stack2,
          stack3: data.stack3,
          stack4: data.stack4,
          draw: data.draw,
          discard: data.discard
        });
      })
      .catch(err => console.log(err));
  }

  componentWillMount() {
    document.addEventListener('click', this.handleOutsideClick, false);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleOutsideClick, false);
  }

  handleOutsideClick(ev) {
    //console.log("click:",ev.target.id);
    if (ev.target.id==="") {
      //console.log("click outside");
      this.setState({m_cards:[], m_src: "", m_dst:""});
    }
  }

  onClick(ev) {
    let target = ev.target;
    let idx=target.id.search(':');
    let t_suit=target.id.substr(0,idx);
    let t_val=target.id.substr(idx+1);

    let p_id="";
    let p=[];
    if (this.card_exist(this.state.pile1,t_suit,t_val)) {p_id="pile1"; p=this.state.pile1;}
    else if (this.card_exist(this.state.pile2,t_suit,t_val)) {p_id="pile2"; p=this.state.pile2;}
    else if (this.card_exist(this.state.pile3,t_suit,t_val)) {p_id="pile3"; p=this.state.pile3;}
    else if (this.card_exist(this.state.pile4,t_suit,t_val)) {p_id="pile4"; p=this.state.pile4;}
    else if (this.card_exist(this.state.pile5,t_suit,t_val)) {p_id="pile5"; p=this.state.pile5;}
    else if (this.card_exist(this.state.pile6,t_suit,t_val)) {p_id="pile6"; p=this.state.pile6;}
    else if (this.card_exist(this.state.pile7,t_suit,t_val)) {p_id="pile7"; p=this.state.pile7;}
    else if (this.card_exist(this.state.stack1,t_suit,t_val)) {p_id="stack1"; p=this.state.stack1;}
    else if (this.card_exist(this.state.stack2,t_suit,t_val)) {p_id="stack2"; p=this.state.stack2;}
    else if (this.card_exist(this.state.stack3,t_suit,t_val)) {p_id="stack3"; p=this.state.stack3;}
    else if (this.card_exist(this.state.stack4,t_suit,t_val)) {p_id="stack4"; p=this.state.stack4;}
    else if (this.card_exist(this.state.draw,t_suit,t_val)) {p_id="draw"; p=this.state.draw;}
    else if (this.card_exist(this.state.discard,t_suit,t_val)) {p_id="discard"; p=this.state.discard;}

    if (p_id==="draw") {
      //draw cards
      this.setState({m_cards:[], m_src: p_id, m_dst:"discard"});
    } else if (target.src.search("face_down")===-1
      && !this.card_exist(this.state.m_cards,t_suit,t_val)) {
      //face up && haven't already selected
      if (this.state.m_src==="" || this.state.m_src===p_id) {
        //add to src all face-up cards following current card
        let add=false;
        this.state.m_cards=[];
        //console.log(p);
        p.forEach(card => {
          //console.log(card);
          if (add || card.suit===t_suit && card.value===t_val) {
            //console.log("added");
            add=true;
            this.state.m_cards.push({suit:card.suit, value:card.value});
          }
        });

        this.setState({m_src: p_id});
      } else {
        //add to dst
        this.setState({m_dst: p_id});
      }
    }
  }

  onClick2(ev) {
    let target=ev.target;
    if (target.id.search(':')===-1) {
      if (this.state.m_src==="" && target.id.search("draw")!==-1) {
        this.setState({m_src: target.id, m_dst: "discard"});
      } else if (this.state.m_src!=="") {
        this.setState({m_dst: target.id});
      }
    }
  }

  button_AutoComplete(ev) {
    // console.log(`button_AutoComplete`);
    $.ajax({
      url: `/v1/game/autoComplete/${this.props.match.params.id}`,
      method: "get",
      statusCode: {
        200: (data) => {
          //console.log("received autoMove from server:",data);
          this.setState({m_cards:data.cards, m_src:data.src, m_dst:data.dst});
        },
        404: function(err) {
          console.log("error:",err.responseJSON);
        }
      }
    });
  }

  componentDidUpdate() {
    //once m_dst is set, send out move req
    if (this.state.m_dst!=="") {
      let move={
        cards: this.state.m_cards,
        src: this.state.m_src,
        dst: this.state.m_dst
      };
      console.log(move);

      $.ajax({
        url: `/v1/game/${this.props.match.params.id}`,
        method: "put",
        data: {move: move},
        statusCode: {
          200: (data) => {
            //console.log("success - new state:",data);
            this.setState({
              pile1: data.pile1,
              pile2: data.pile2,
              pile3: data.pile3,
              pile4: data.pile4,
              pile5: data.pile5,
              pile6: data.pile6,
              pile7: data.pile7,
              stack1: data.stack1,
              stack2: data.stack2,
              stack3: data.stack3,
              stack4: data.stack4,
              draw: data.draw,
              discard: data.discard
            });

            //check if this is end of game
            $.ajax({
              url: `/v1/game/endOfGame/${this.props.match.params.id}`,
              method: "get",
              statusCode: {
                200: () => {
                  this.setState({
                    notify: `End of Game. (cannot move from pile/draw/discard to stack)`
                  });
                },
                201: () => {
                  this.setState({notify: null});
                  // console.log("error:",err.responseJSON);
                },
                404: function(err) {
                  console.log("error:",err.responseJSON);
                }
              }
            });
          },
          404: function(err) {
            console.log("error:",err.responseJSON);
          }
        }
      });
      this.setState({m_cards:[], m_src:"", m_dst:""});
    }
  }

  onGameEnd() {
    //console.log("Game End");
    $.ajax({
      url: `/v1/game/endGame/${this.props.match.params.id}`,
      method: "put",
      statusCode: {
        200: () => {
          console.log("End Game in server");
          this.props.history.push(`/results/${this.props.match.params.id}`);
        },
        404: function(err) {
          console.log("error in ending game in server: ",err.responseJSON);
        }
      }
    });
  }

  onGameContinue() {
    // console.log("Game Continue");
    this.setState({notify: null});
  }

  render() {
    return (
      <GameBase>
        {this.state.notify ? (
          <ModalNotifyEnd
            msg={this.state.notify}
            onAccept={this.onGameEnd}
            onDecline={this.onGameContinue}
          />
        ) : null}
        <FormButton onClick={this.button_AutoComplete}>AutoComplete</FormButton>
        <CardRow>
          <Pile p_id="stack1" cards={this.state.stack1} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="stack2" cards={this.state.stack2} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="stack3" cards={this.state.stack3} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="stack4" cards={this.state.stack4} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
          <CardRowGap />
          <Pile p_id="draw" cards={this.state.draw} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="discard" cards={this.state.discard} spacing={0} onClick={this.onClick} onClick2={this.onClick2}/>
        </CardRow>
        <CardRow>
          <Pile p_id="pile1" cards={this.state.pile1} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile2" cards={this.state.pile2} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile3" cards={this.state.pile3} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile4" cards={this.state.pile4} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile5" cards={this.state.pile5} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile6" cards={this.state.pile6} onClick={this.onClick} onClick2={this.onClick2}/>
          <Pile p_id="pile7" cards={this.state.pile7} onClick={this.onClick} onClick2={this.onClick2}/>
        </CardRow>

      </GameBase>
    );
  }

  card_exist(arr,suit,val) {
    let found=arr.find(function(elem) {
      return elem.suit===suit && elem.value===val;
    });
    return found!==undefined;
  }
}

Game.propTypes = {
  match: PropTypes.object.isRequired
};
