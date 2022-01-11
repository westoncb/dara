import { gameStates } from "./global"
import {
    getLegalMoves,
    getPlayerPieces,
    findUnplayedPiece,
    findLocationWithPiece,
    moveMakes3InARow,
    readBoard,
} from "./boardQueries"
import { getState } from "../store"
import isEmpty from "lodash.isempty"

export function generateAIMove(activePlayer, gameState) {
    if (gameState === gameStates.DROP) {
        const pieceId = findUnplayedPiece(activePlayer)
        const legalMoves = getLegalMoves(activePlayer)

        const [row, col] =
            legalMoves[Math.floor(Math.random() * (legalMoves.length - 1))]

        return { pieceId, row, col }
    } else if (gameState === gameStates.MOVE) {
        const playerPieces = getPlayerPieces(activePlayer)

        const scoredMoves = playerPieces.reduce((allMoves, pieceId) => {
            const location = findLocationWithPiece(pieceId)
            const lastRow = location.row
            const lastCol = location.col

            const movesForPiece = getLegalMoves(activePlayer, lastRow, lastCol)

            return allMoves.concat(
                movesForPiece.map(move => ({
                    pieceId,
                    lastCoords: [lastRow, lastCol],
                    row: move[0],
                    col: move[1],
                    score: scoreCandidateMove(
                        move[0],
                        move[1],
                        activePlayer,
                        lastRow,
                        lastCol
                    ),
                }))
            )
        }, [])

        if (isEmpty(scoredMoves)) {
            console.log("NO MOVES LEFT TO MAKE")
        }

        scoredMoves.sort((move1, move2) => {
            return move2.score - move1.score
        })

        const topMoves = scoredMoves.filter(move => {
            const scoreDiff = move.score - scoredMoves[0].score

            console.assert(
                scoreDiff <= 0,
                "Something went wrong: highest score was not first element."
            )

            return scoreDiff === 0
        })

        const randIndex = Math.floor(Math.random() * (topMoves.length - 1))

        return topMoves[randIndex]
    } else if (gameState === gameStates.DESTROY) {
        const legalMoves = getLegalMoves(activePlayer)
        const randIndex = Math.floor(Math.random() * (legalMoves.length - 1))
        const [row, col] = legalMoves[randIndex]
        const pieceId = readBoard(row, col)

        return { pieceId, row, col }
    }
}

function scoreCandidateMove(row, col, player, lastRow, lastCol) {
    const { gameState } = getState()

    if (gameState === gameStates.DROP) {
        return 1
    } else if (gameState === gameStates.MOVE) {
        return moveMakes3InARow(row, col, player, lastRow, lastCol) ? 1 : 0
    } else if (gameState === gameStates.DESTROY) {
        return 1
    } else {
        return -5
    }
}
