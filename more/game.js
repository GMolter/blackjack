// game.js - Blackjack Game Logic Handler
class BlackjackGame {
    constructor() {
        this.suits = ['♠', '♥', '♦', '♣'];
        this.values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.gameState = null;
        this.currentBet = 0;
        this.myChips = 1000;
        this.hasPlacedBet = false;
    }

    // Card and Deck Management
    createDeck() {
        const deck = [];
        for (let suit of this.suits) {
            for (let value of this.values) {
                deck.push({
                    suit: suit,
                    value: value,
                    numValue: this.getCardValue(value)
                });
            }
        }
        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getCardValue(value) {
        if (value === 'A') return 11;
        if (['J', 'Q', 'K'].includes(value)) return 10;
        return parseInt(value);
    }

    calculateHandValue(hand) {
        if (!hand || hand.length === 0) return 0;
        
        let value = 0;
        let aces = 0;
        
        for (let card of hand) {
            if (card.value === 'A') {
                aces++;
                value += 11;
            } else {
                value += card.numValue;
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    // Hand Analysis
    isBlackjack(hand) {
        return hand.length === 2 && this.calculateHandValue(hand) === 21;
    }

    isBusted(hand) {
        return this.calculateHandValue(hand) > 21;
    }

    canSplit(hand) {
        return hand.length === 2 && 
               this.getCardValue(hand[0].value) === this.getCardValue(hand[1].value);
    }

    canDouble(hand, chips, bet) {
        return hand.length === 2 && chips >= bet;
    }

    // Game State Management
    initializeGameState(players) {
        return {
            phase: 'waiting',
            currentTurn: '',
            currentTurnIndex: 0,
            deck: this.createDeck(),
            dealer: {
                hand: [],
                score: 0,
                hiddenCard: null
            },
            roundNumber: 1,
            timestamp: Date.now()
        };
    }

    // Dealing Logic
    dealInitialCards(gameState, players) {
        const deck = [...gameState.deck];
        let deckIndex = 0;
        const updates = {};

        // Deal 2 cards to each active player
        const activePlayers = Object.keys(players).filter(id => players[id].bet > 0);
        
        for (let playerId of activePlayers) {
            const hand = [deck[deckIndex++], deck[deckIndex++]];
            const score = this.calculateHandValue(hand);
            const status = this.isBlackjack(hand) ? 'blackjack' : 'playing';
            
            updates[playerId] = {
                hand: hand,
                score: score,
                status: status,
                hasPlayed: false
            };
        }

        // Deal dealer cards (one visible, one hidden)
        const dealerHand = [deck[deckIndex++]];
        const dealerHiddenCard = deck[deckIndex++];
        const dealerScore = this.calculateHandValue(dealerHand);

        const newGameState = {
            ...gameState,
            phase: 'playing',
            deck: deck.slice(deckIndex),
            dealer: {
                hand: dealerHand,
                score: dealerScore,
                hiddenCard: dealerHiddenCard
            },
            currentTurn: activePlayers[0] || '',
            currentTurnIndex: 0
        };

        return { gameState: newGameState, playerUpdates: updates };
    }

    // Player Actions
    processHit(gameState, playerId, playerData) {
        const deck = [...gameState.deck];
        if (deck.length === 0) return null;

        const newCard = deck[0];
        const newHand = [...playerData.hand, newCard];
        const newScore = this.calculateHandValue(newHand);
        
        let newStatus = playerData.status;
        if (newScore > 21) {
            newStatus = 'busted';
        } else if (newScore === 21) {
            newStatus = 'standing';
        }

        return {
            gameState: {
                ...gameState,
                deck: deck.slice(1)
            },
            playerUpdate: {
                hand: newHand,
                score: newScore,
                status: newStatus,
                hasPlayed: newStatus === 'busted' || newStatus === 'standing'
            }
        };
    }

    processStand(gameState, playerId, playerData) {
        return {
            gameState: gameState,
            playerUpdate: {
                ...playerData,
                status: 'standing',
                hasPlayed: true
            }
        };
    }

    processDouble(gameState, playerId, playerData) {
        const deck = [...gameState.deck];
        if (deck.length === 0 || playerData.hand.length !== 2) return null;

        const newCard = deck[0];
        const newHand = [...playerData.hand, newCard];
        const newScore = this.calculateHandValue(newHand);
        const newStatus = newScore > 21 ? 'busted' : 'standing';

        return {
            gameState: {
                ...gameState,
                deck: deck.slice(1)
            },
            playerUpdate: {
                hand: newHand,
                score: newScore,
                status: newStatus,
                bet: playerData.bet * 2,
                chips: playerData.chips - playerData.bet,
                hasPlayed: true
            }
        };
    }

    // Turn Management
    getNextPlayer(gameState, players) {
        const activePlayers = Object.keys(players).filter(id => 
            players[id].bet > 0 && 
            !players[id].hasPlayed &&
            players[id].status !== 'blackjack'
        );

        if (activePlayers.length === 0) {
            return null; // Move to dealer turn
        }

        const currentIndex = activePlayers.indexOf(gameState.currentTurn);
        const nextIndex = currentIndex + 1;

        if (nextIndex >= activePlayers.length) {
            return null; // Move to dealer turn
        }

        return {
            currentTurn: activePlayers[nextIndex],
            currentTurnIndex: nextIndex
        };
    }

    // Dealer Logic
    playDealerTurn(gameState) {
        const dealer = { ...gameState.dealer };
        const deck = [...gameState.deck];
        let deckIndex = 0;

        // Reveal hidden card
        if (dealer.hiddenCard) {
            dealer.hand = [...dealer.hand, dealer.hiddenCard];
            dealer.hiddenCard = null;
            dealer.score = this.calculateHandValue(dealer.hand);
        }

        // Dealer must hit on soft 17 or less
        while (dealer.score < 17) {
            if (deckIndex >= deck.length) break;
            
            const newCard = deck[deckIndex++];
            dealer.hand = [...dealer.hand, newCard];
            dealer.score = this.calculateHandValue(dealer.hand);
        }

        return {
            ...gameState,
            phase: 'results',
            deck: deck.slice(deckIndex),
            dealer: dealer
        };
    }

    // Results Calculation
    calculateResults(gameState, players) {
        const dealerScore = gameState.dealer.score;
        const dealerBusted = dealerScore > 21;
        const dealerBlackjack = this.isBlackjack(gameState.dealer.hand);
        
        const results = {};

        Object.entries(players).forEach(([playerId, player]) => {
            if (player.bet === 0) {
                results[playerId] = {
                    result: 'no_bet',
                    winnings: 0,
                    newChips: player.chips
                };
                return;
            }

            const playerScore = player.score;
            const playerBusted = playerScore > 21;
            const playerBlackjack = this.isBlackjack(player.hand);

            let result, winnings;

            if (playerBusted) {
                result = 'lose';
                winnings = 0;
            } else if (playerBlackjack && !dealerBlackjack) {
                result = 'blackjack';
                winnings = Math.floor(player.bet * 2.5); // 3:2 payout
            } else if (dealerBusted) {
                result = 'win';
                winnings = player.bet * 2;
            } else if (playerScore > dealerScore) {
                result = 'win';
                winnings = player.bet * 2;
            } else if (playerScore === dealerScore) {
                result = 'push';
                winnings = player.bet; // Return bet
            } else {
                result = 'lose';
                winnings = 0;
            }

            results[playerId] = {
                result: result,
                winnings: winnings,
                newChips: player.chips + winnings
            };
        });

        return results;
    }

    // Betting Logic
    validateBet(amount, currentChips, minBet = 5, maxBet = 500) {
        if (amount < minBet) return { valid: false, message: `Minimum bet is $${minBet}` };
        if (amount > maxBet) return { valid: false, message: `Maximum bet is $${maxBet}` };
        if (amount > currentChips) return { valid: false, message: 'Insufficient chips' };
        return { valid: true };
    }

    // Game Phase Validation
    canPerformAction(gameState, playerId, action) {
        if (gameState.phase !== 'playing') return false;
        if (gameState.currentTurn !== playerId) return false;
        
        switch (action) {
            case 'hit':
            case 'stand':
                return true;
            case 'double':
                // Can only double on first two cards
                return gameState.currentTurnIndex === 0;
            default:
                return false;
        }
    }

    // Utility Methods
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generatePlayerId() {
        return Math.random().toString(36).substring(2, 15);
    }

    // Game Statistics
    calculateHandProbabilities(hand, deck) {
        if (!hand || hand.length === 0) return {};
        
        const currentValue = this.calculateHandValue(hand);
        if (currentValue >= 21) return { bustProbability: currentValue > 21 ? 1 : 0 };

        let bustCards = 0;
        const remainingCards = deck.length;
        
        if (remainingCards === 0) return { bustProbability: 0 };

        for (let card of deck) {
            const testHand = [...hand, card];
            if (this.calculateHandValue(testHand) > 21) {
                bustCards++;
            }
        }

        return {
            bustProbability: bustCards / remainingCards,
            safeProbability: (remainingCards - bustCards) / remainingCards
        };
    }

    // Reset Methods
    resetPlayerForNewRound(player) {
        return {
            ...player,
            hand: [],
            score: 0,
            status: 'waiting',
            hasPlayed: false,
            hasPlaced: false,
            bet: 0
        };
    }

    resetGameForNewRound(gameState) {
        return {
            phase: 'betting',
            currentTurn: '',
            currentTurnIndex: 0,
            deck: this.createDeck(),
            dealer: {
                hand: [],
                score: 0,
                hiddenCard: null
            },
            roundNumber: (gameState.roundNumber || 0) + 1,
            timestamp: Date.now()
        };
    }

    // Validation Helpers
    isValidGameState(gameState) {
        return gameState && 
               ['waiting', 'betting', 'dealing', 'playing', 'dealer', 'results'].includes(gameState.phase) &&
               Array.isArray(gameState.deck) &&
               gameState.dealer;
    }

    isValidPlayer(player) {
        return player && 
               typeof player.name === 'string' &&
               typeof player.chips === 'number' &&
               typeof player.bet === 'number' &&
               Array.isArray(player.hand);
    }

    // Advanced Game Features
    suggestOptimalPlay(playerHand, dealerUpCard, deck) {
        const playerValue = this.calculateHandValue(playerHand);
        const dealerValue = this.getCardValue(dealerUpCard.value);
        
        // Basic strategy suggestions
        if (playerValue >= 17) return 'stand';
        if (playerValue <= 11) return 'hit';
        
        // Soft hands (with ace)
        const hasAce = playerHand.some(card => card.value === 'A') && playerValue <= 21;
        if (hasAce) {
            if (playerValue >= 19) return 'stand';
            if (playerValue === 18 && dealerValue >= 9) return 'hit';
            if (playerValue <= 17) return 'hit';
        }
        
        // Hard hands
        if (playerValue >= 17) return 'stand';
        if (playerValue <= 11) return 'hit';
        if (playerValue >= 12 && playerValue <= 16) {
            return dealerValue >= 7 ? 'hit' : 'stand';
        }
        
        return 'hit';
    }
}

// Export for use in other modules
window.BlackjackGame = BlackjackGame;
