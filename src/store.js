import create from "zustand"
import { gameStates, players } from "./lib/global"

let setState
let getState

const useStore = create((set, get) => {
    setState = set
    getState = get

    const state = {
        boardState: getEmptyBoard(),
        effects: true,
        announcement: "",
        overlayElement: null,
        timedStates: { laserShot: { startTime: -1, endTime: -1 } },
        enterTimedState: (name, duration) => {
            get().timedStates[name] = {
                startTime: performance.now(),
                endTime: performance.now() + duration,
            }
        },
        getTimedStateProgress: name => {
            const { startTime, endTime } = get().timedStates[name]
            const totalTime = endTime - startTime
            if (totalTime > 0) {
                const progress = 1 - (endTime - performance.now()) / totalTime
                if (progress >= 0 && progress <= 1) return progress
                else return -1
            } else {
                return -1
            }
        },
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
        p1AI: true,
        p2AI: true,
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
