import create from "zustand"
import { gameStates, players } from "./global"

let setState
let getState

const useStore = create((set, get) => {
    setState = set
    getState = get

    const state = {
        boardState: getEmptyBoard(),
        effects: true,
        announcement: "",
        boardMetrics: {
            x: 1,
            y: 1,
            width: 1,
            height: 1,
            centerStartX: 1,
            centerEndX: 1,
            centerGap: 1,
            spotSize: 1,
        },
        pickedUpPiece: null,
        gameState: gameStates.DROP,
        activePlayer: players.P1,
        selectedBoardPos: {
            row: -1,
            col: -1,
        },
        p1AI: false,
        p2AI: false,
        aiMakingMove: false,
        aiSelection: { row: -1, col: -1 },
        errorMessage: null,
    }

    return state
})

function getEmptyBoard() {
    const board = { main: {}, lSide: {}, rSide: {} }
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 6; j++) {
            board.main[i + "," + j] = 0
        }
    }

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            board.lSide[i + "," + j] = 1 + i * 2 + j
            board.rSide[i + "," + j] = 24 - (i * 2 + j)
        }
    }

    return board
}

export { useStore, setState, getState }
