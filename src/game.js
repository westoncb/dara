import Board from "./board"

const states = { INIT: 0, P1_DROP: 1, P2_DROP: 2, P1_MOVE: 3, P2_MOVE: 4, GAME_OVER: 4, ANIM: 5 }
const players = { P1: 1, P2: 2 }

class Game {
    constructor() {
        this.board = new Board()
        this.board.render()

        this.reset()
    }

    reset() {
        this.state = states.DROP
        this.playerTurn = players.P1
        this.boardState = this.getEmptyBoard()
    }

    next() {
        switch (this.state) {
            case states.INIT:

                break;

            default:
                break;
        }
    }

    getEmptyBoard() {
        const board = {}
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                board[i + "," + j] = 0
            }
        }

        return board
    }
}

export default Game