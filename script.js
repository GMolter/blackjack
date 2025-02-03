let balance = 1000;
let bet = 10;
let deck = [];
let dealerHand = [];
let playerHand = [];
let gameOver = false;

// Initialize the game
document.getElementById('deal').addEventListener('click', deal);
document.getElementById('hit').addEventListener('click', hit);
document.getElementById('stand').addEventListener('click', stand);

function createDeck() {
  const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }
  shuffleDeck();
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function deal() {
  if (gameOver) resetGame();
  bet = parseInt(document.getElementById('bet').value);
  if (bet > balance) {
    alert("You don't have enough money!");
    return;
  }
  createDeck();
  dealerHand = [drawCard(), drawCard()];
  playerHand = [drawCard(), drawCard()];
  updateDisplay();
  document.getElementById('hit').disabled = false;
  document.getElementById('stand').disabled = false;
  document.getElementById('deal').disabled = true;
  checkBlackjack();
}

function hit() {
  if (gameOver) return;
  playerHand.push(drawCard());
  updateDisplay();
  if (calculateHand(playerHand) > 21) endGame('You busted!');
}

function stand() {
  if (gameOver) return;
  while (calculateHand(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }
  updateDisplay();
  endGame(determineWinner());
}

function drawCard() {
  return deck.pop();
}

function calculateHand(hand) {
  let total = 0;
  let aces = 0;
  for (let card of hand) {
    if (card.value === 'A') {
      total += 11;
      aces++;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function updateDisplay() {
  document.getElementById('dealer-cards').innerHTML = dealerHand.map(card => `${card.value} of ${card.suit}`).join(', ');
  document.getElementById('player-cards').innerHTML = playerHand.map(card => `${card.value} of ${card.suit}`).join(', ');
  document.getElementById('dealer-total').textContent = calculateHand(dealerHand);
  document.getElementById('player-total').textContent = calculateHand(playerHand);
  document.getElementById('balance').textContent = balance;
}

function checkBlackjack() {
  if (calculateHand(playerHand) === 21) {
    endGame('Blackjack! You win!');
  }
}

function determineWinner() {
  const playerTotal = calculateHand(playerHand);
  const dealerTotal = calculateHand(dealerHand);
  if (dealerTotal > 21) return 'Dealer busted! You win!';
  if (playerTotal > dealerTotal) return 'You win!';
  if (playerTotal < dealerTotal) return 'You lose!';
  return 'It\'s a tie!';
}

function endGame(message) {
  gameOver = true;
  document.getElementById('message').textContent = message;
  document.getElementById('hit').disabled = true;
  document.getElementById('stand').disabled = true;
  document.getElementById('deal').disabled = false;
  if (message.includes('win')) balance += bet;
  if (message.includes('lose')) balance -= bet;
  updateDisplay();
}

function resetGame() {
  gameOver = false;
  dealerHand = [];
  playerHand = [];
  document.getElementById('message').textContent = '';
  updateDisplay();
}
