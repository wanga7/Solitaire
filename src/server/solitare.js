/* Copyright G. Hemingway, 2018 - All rights reserved */
"use strict";

let shuffleCards = (includeJokers = false) => {
  /* Return an array of 52 cards (if jokers is false, 54 otherwise). Carefully follow the instructions in the README */
  let cards = [];
  ["spades", "clubs", "hearts", "diamonds"].forEach(suit => {
    ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"].forEach(
      value => {
        cards.push({ suit: suit, value: value });
      }
    );
  });
  // Add in jokers here
  if (includeJokers) {
    /*...*/
  }
  // Now shuffle
  let deck = [];
  while (cards.length > 0) {
    // Find a random number between 0 and cards.length - 1
    const index = Math.floor(Math.random() * cards.length);
    deck.push(cards[index]);
    cards.splice(index, 1);
  }
  return deck;
};

let initialState = () => {
  /* Use the above function.  Generate and return an initial state for a game */
  let state = {
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
    discard: []
  };

  // Get the shuffled deck and distribute it to the players
  const deck = shuffleCards(false);
  // Setup the piles
  for (let i = 1; i <= 7; ++i) {
    let card = deck.splice(0, 1)[0];
    card.up = true;
    state[`pile${i}`].push(card);
    for (let j = i + 1; j <= 7; ++j) {
      card = deck.splice(0, 1)[0];
      card.up = false;
      state[`pile${j}`].push(card);
    }
  }
  // Finally, get the draw right
  state.draw = deck.map(card => {
    card.up = false;
    return card;
  });
  return state;
};

const filterGameForProfile = game => ({
  active: game.active,
  score: game.score,
  won: game.won,
  id: game._id,
  game: "klondyke",
  start: game.start,
  state: game.state,
  moves: game.moves,
  winner: game.winner
});

const filterMoveForResults = move => ({
  user: move.user.username,
  src: move.src,
  dst: move.dst,
  cards: move.cards,
  date: move.date
});

const validateMove = (move, state) => {
  //validate by move types
  let m_cards=move.cards;
  let m_src=move.src;
  let m_dst=move.dst;
  let t_src=type(m_src);
  let t_dst=type(m_dst);

  console.log("validating...",t_src,"->",t_dst);

  if (t_src==="pile" && t_dst==="pile") {
    //from pile to pile
    if (m_cards.length===0) {return false;}
    if (!orderAndColor(m_cards)) {console.log("invalid order/ color"); return false;}
    let dst_pile=getPile(m_dst,state);
    console.log("dst_pile:",dst_pile);
    if (dst_pile.length===0) {
      return m_cards[0].value==="king";
    } else {
      let dst_last=dst_pile[dst_pile.length-1];
      console.log("dst_last:",dst_last);
      let src_first=m_cards[0];
      console.log("src_first:",src_first);
      return dst_last.up
        && getColor(dst_last.suit)!==getColor(src_first.suit)
        && getNum(dst_last.value)-1===getNum(src_first.value);
    }
  } else if (t_src==="pile" && t_dst==="stack"
          || t_src==="discard" && t_dst==="stack") {
      //from pile to stack, or from discard to stack
      if (m_cards.length!==1) {return false;}
      let dst_stack=getPile(m_dst,state);
      let dst_top=dst_stack.length===0 ? {value: 0} : dst_stack[dst_stack.length-1];
      console.log("dst_top:",dst_top);
      if (dst_top.value===0) {
        return m_cards[0].value==="ace"
      } else {
        return getNum(dst_top.value)+1===getNum(m_cards[0].value)
          && dst_top.suit===m_cards[0].suit;
      }
  } else if (t_src==="stack" && t_dst==="pile") {
    //from stack to pile
    if (m_cards.length!==1) {return false;}
    let dst_stack=getPile(m_dst,state);
    let dst_last=dst_stack.length===0 ? {value:-1} : dst_stack[dst_stack.length-1];
    if (dst_last.value===-1) {
      return m_cards[0].value==="king";
    } else {
      return dst_last.up
        && getColor(dst_last.suit)!==getColor(m_cards[0].suit)
        && getNum(dst_last.value)-1===getNum(m_cards[0].value);
    }
  } else if (t_src==="discard" && t_dst==="pile") {
    //from discard to pile
    if (m_cards.length!==1) {return false;}
    let dst_pile=getPile(m_dst,state);
    if (dst_pile.length===0) {
      return m_cards[0].value==="king";
    } else {
      let dst_last=dst_pile[dst_pile.length-1];
      let src_first=m_cards[0];
      return dst_last.up
        && getColor(dst_last.suit)!==getColor(src_first.suit)
        && getNum(dst_last.value)-1===getNum(src_first.value);
    }
  } else if (t_src==="draw" && t_dst==="discard") {
    //from draw to discard
    //return true if there are unused card left (either in draw or discard)
    return getPile(m_src,state).length!==0 || getPile(m_dst,state).length!==0;
  } else {
    //all other types of moves are invalid
    return false;
  }
};

const executeMove = (move,state,drawCount) => {
  let m_cards=move.cards;
  let m_src=move.src;
  let m_dst=move.dst;
  let t_src=type(m_src);
  let t_dst=type(m_dst);
  let src_pile=getPile(m_src,state);
  let dst_pile=getPile(m_dst,state);

  if (t_src==="draw" && t_dst==="discard") {
    //draw 1 or 3 cards depend on config, if empty -> refresh
    if (src_pile.length===0) {
      //empty -> refresh
      dst_pile.forEach((card) => {
        let new_card=card;
        new_card.up=false;
        src_pile.push(new_card);
      });
      dst_pile=[];
    } else {
      for (let i=0;i<Math.min(src_pile.length,drawCount);i++) {
        let new_card=src_pile[src_pile.length-1];
        new_card.up=true;
        dst_pile.push(new_card);
        src_pile.pop();
      }
    }
  } else {
    //push to dst, pop from src
    for (let i=0;i<m_cards.length;i++) {
      src_pile.pop();
      let new_card=m_cards[i];
      new_card.up=true;
      dst_pile.push(new_card);
    }
    //src_pile's new top card should be face up
    if (src_pile.length!==0) {src_pile[src_pile.length-1].up=true;}
  }

  //update state with new src_pile and dst_pile
  replaceState(state,src_pile,m_src);
  replaceState(state,dst_pile,m_dst);

  //calculate change in scores
  if (t_dst==="stack") {return 1;}
  else if (t_src==="stack") {return -1;}
  else {return 0;}
};

const type = (pile) => {
  if (pile.search("pile")!==-1) {return "pile";}
  if (pile.search("stack")!==-1) {return "stack";}
  if (pile.search("draw")!==-1) {return "draw";}
  if (pile.search("discard")!==-1) {return "discard";}
  return "";
};

const orderAndColor = (cards) => {
  let prev=-1;
  let color="";
  cards.forEach((card)=> {
    //compare with previous card
    if (prev!==-1 && prev-1!==getNum(card.value)) {return false;}
    if (color!=="" && color===getColor(card.suit)) {return false;}

    prev=getNum(card.value);
    color=getColor(card.suit);
  });
  return true;
};

const getColor = (suit) => {
  if (suit==="clubs" || suit==="spades") {return "black";}
  else {return "red";}
};

const getPile = (p_id,state) => {
  switch (p_id) {
    case "pile1": return state.pile1;
    case "pile2": return state.pile2;
    case "pile3": return state.pile3;
    case "pile4": return state.pile4;
    case "pile5": return state.pile5;
    case "pile6": return state.pile6;
    case "pile7": return state.pile7;
    case "stack1": return state.stack1;
    case "stack2": return state.stack2;
    case "stack3": return state.stack3;
    case "stack4": return state.stack4;
    case "draw": return state.draw;
    case "discard": return state.discard;
    default: return [];
  }
};

const getNum = (value) => {
  switch (value) {
    case "ace": return 1;
    case "2":   return 2;
    case "3":   return 3;
    case "4":   return 4;
    case "5":   return 5;
    case "6":   return 6;
    case "7":   return 7;
    case "8":   return 8;
    case "9":   return 9;
    case "10":   return 10;
    case "jack":   return 11;
    case "queen":   return 12;
    case "king":   return 13;
  }
};

const formNo = (value) => {
  switch (value) {
    case 1: return "ace";
    case 2: return "2";
    case 3: return "3";
    case 4: return "4";
    case 5: return "5";
    case 6: return "6";
    case 7: return "7";
    case 8: return "8";
    case 9: return "9";
    case 10: return "10";
    case 11: return "jack";
    case 12: return "queen";
    case 13: return "king";
  }
};

const replaceState = (whole,pile,p_id) => {
  switch (p_id) {
    case "pile1": whole.pile1=pile; break;
    case "pile2": whole.pile2=pile; break;
    case "pile3": whole.pile3=pile; break;
    case "pile4": whole.pile4=pile; break;
    case "pile5": whole.pile5=pile; break;
    case "pile6": whole.pile6=pile; break;
    case "pile7": whole.pile7=pile; break;
    case "stack1": whole.stack1=pile; break;
    case "stack2": whole.stack2=pile; break;
    case "stack3": whole.stack3=pile; break;
    case "stack4": whole.stack4=pile; break;
    case "draw": whole.draw=pile; break;
    case "discard": whole.discard=pile; break;
    default: break;
  }
};

const getPileCand = (state) => {
  let cand=[
    {up:false},
    {up:false},
    {up:false},
    {up:false}
    ];
  let cand_type=new Set(["clubs","diamonds","hearts","spades"]);

  if (state.stack1.length!==0 && state.stack1.length!==13) {
    cand[0]=JSON.parse(JSON.stringify(state.stack1[state.stack1.length-1]));
    cand[0].value=formNo(getNum(cand[0].value)+1);
    cand_type.delete(cand[0].suit);
  }
  if (state.stack2.length!==0 && state.stack2.length!==13) {
    cand[1]=JSON.parse(JSON.stringify(state.stack2[state.stack2.length-1]));
    cand[1].value=formNo(getNum(cand[1].value)+1);
    cand_type.delete(cand[1].suit);
  }
  if (state.stack3.length!==0 && state.stack3.length!==13) {
    cand[2]=JSON.parse(JSON.stringify(state.stack3[state.stack3.length-1]));
    cand[2].value=formNo(getNum(cand[2].value)+1);
    cand_type.delete(cand[2].suit);
  }
  if (state.stack4.length!==0 && state.stack4.length!==13) {
    cand[3]=JSON.parse(JSON.stringify(state.stack4[state.stack4.length-1]));
    cand[3].value=formNo(getNum(cand[3].value)+1);
    cand_type.delete(cand[3].suit);
  }

  let cand_type_arr = Array.from(cand_type);
  let j=0;
  for (let i=0; i<cand.length; i++) {
    if (cand[i].up===false) {
      cand[i]={up:true, suit:cand_type_arr[j], value:"ace"};
      j++;
    }
  }
  return cand;
};

const findAutoMove = (state) => {
  let cand=getPileCand(state);

  let stack_idx=state.pile1.length===0 ? -1 : cardInCand(state.pile1[state.pile1.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile1", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile2.length===0 ? -1 : cardInCand(state.pile2[state.pile2.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile2", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile3.length===0 ? -1 : cardInCand(state.pile3[state.pile3.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile3", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile4.length===0 ? -1 : cardInCand(state.pile4[state.pile4.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile4", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile5.length===0 ? -1 : cardInCand(state.pile5[state.pile5.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile5", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile6.length===0 ? -1 : cardInCand(state.pile6[state.pile6.length-1],cand);
  if (stack_idx>-1) {
    return {cards:[cand[stack_idx]], src:"pile6", dst:`stack${stack_idx+1}`};
  }
  stack_idx=state.pile7.length===0 ? -1 : cardInCand(state.pile7[state.pile7.length-1],cand);
  if (stack_idx>-1) {
    return { cards: [cand[stack_idx]], src: "pile7", dst: `stack${stack_idx+1}` };
  }
  return { cards: [], src: "", dst: ""};
};

const isGameEnd = (state) => {
  //check if there is valid move from pile to stack
  let autoMove=findAutoMove(state);
  if (autoMove.src!=="") {return false;}

  //check if there is valid move from draw/ discard to stack
  //console.log("state: ",state);
  let cand=getPileCand(state);
  console.log("cand: ",cand);
  for (let i=0; i<state.discard.length; i++) {
    let card=state.discard[i];
    card.up=true;
    if (cardInCand(card,cand)>-1) {console.log("found card: ",card,cand); return false;}
  }
  for (let i=0; i<state.draw.length; i++) {
    let card=state.draw[i];
    card.up=true;
    if (cardInCand(card,cand)>-1) {console.log("found card: ",card,cand); return false;}
  }
  return true;
};

const cardInCand = (card, cand) => {
  for (let i=0; i<cand.length; i++) {
    if (sameCard(card,cand[i])) {return i;}
  }
  return -1;
};

const sameCard = (card1,card2) => {
  return (card1.up===card2.up) && (card1.suit===card2.suit) && (card1.value===card2.value);
};

module.exports = {
  initialState: initialState,
  filterGameForProfile: filterGameForProfile,
  filterMoveForResults: filterMoveForResults,
  validateMove: validateMove,
  executeMove: executeMove,
  findAutoMove: findAutoMove,
  isGameEnd: isGameEnd
};
