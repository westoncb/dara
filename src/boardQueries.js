import { getState } from "./store"
import { gameStates, sections, players, directions } from "./global"

export function findLocationWithPiece(pieceId) {
    const { boardState } = getState()

    return Object.values(sections)
        .map(sectionName => {
            const sectionState = boardState[sectionName]
            const resultKey = Object.keys(sectionState).find(
                key => sectionState[key] === pieceId
            )

            return resultKey !== undefined
                ? {
                      section: sectionName,
                      row: coordsFromKey(resultKey)[0],
                      col: coordsFromKey(resultKey)[1],
                  }
                : null
        })
        .find(result => result !== null)
}

export function isMoveLegal(row, col, player, lastRow, lastCol) {
    const { gameState } = getState()

    const pieceId = readBoard(row, col)
    const spotIsOccupied = pieceId !== 0

    if (gameState === gameStates.DROP) {
        const makes3InARow = moveMakes3InARow(row, col, player)

        return !spotIsOccupied && !makes3InARow
    } else if (gameState === gameStates.MOVE) {
        return !spotIsOccupied && areNeighbors(lastRow, lastCol, row, col)
    } else if (gameState === gameStates.DESTROY) {
        return !pieceBelongsToActivePlayer(pieceId) && spotIsOccupied
    }
}

export function readBoard(row, col, section = sections.MAIN) {
    const { boardState } = getState()
    return boardState[section][row + "," + col]
}

export function allSidePiecesPlayed() {
    const { boardState } = getState()

    const allPlayed = Object.values(boardState.lSide)
        .concat(Object.values(boardState.rSide))
        .reduce((allZeros, pieceState) => pieceState === 0 && allZeros, true)

    return allPlayed
}

export function getLegalMoves(player, lastRow = -1, lastCol = -1) {
    const { boardState } = getState()

    return Object.keys(boardState.main)
        .map(key => coordsFromKey(key))
        .filter(coords => {
            const [row, col] = coords
            return isMoveLegal(row, col, player, lastRow, lastCol)
        })
}

export function moveMakes3InARow(row, col, player, lastRow, lastCol) {
    const { boardState } = getState()

    const pieceAlreadyOnBoard = lastRow !== undefined
    const pieceId = pieceAlreadyOnBoard
        ? boardState.main[coordsToKey(lastRow, lastCol)]
        : -1

    // clear piece from its previous location
    if (pieceAlreadyOnBoard) boardState.main[coordsToKey(lastRow, lastCol)] = -1

    const chainLengths = [
        directions.UP,
        directions.DOWN,
        directions.LEFT,
        directions.RIGHT,
    ].map(direction => chainLengthInDirection(player, row, col, direction))

    // restore piece to its previous location
    if (pieceAlreadyOnBoard)
        boardState.main[coordsToKey(lastRow, lastCol)] = pieceId

    if (
        chainLengths[0] + chainLengths[1] > 1 ||
        chainLengths[2] + chainLengths[3] > 1
    ) {
        return true
    } else {
        return false
    }
}

export function findUnplayedPiece(player) {
    const { boardState } = getState()

    const sideState =
        player === players.P1 ? boardState.lSide : boardState.rSide

    return Object.values(sideState).find(spotState => spotState !== 0)
}

export function pieceCanBeLifted(id) {
    const { gameState } = getState()

    if (gameState === gameStates.DROP) {
        return pieceBelongsToActivePlayer(id) && !pieceIsOnMainSection(id)
    } else if (gameState === gameStates.MOVE) {
        return pieceBelongsToActivePlayer(id)
    }
}

export function getPlayerPieces(player) {
    const { boardState } = getState()

    const spots = Object.values(boardState.lSide)
        .concat(Object.values(boardState.rSide))
        .concat(Object.values(boardState.main))

    return spots.filter(
        spotState => spotState !== 0 && getPieceOwner(spotState) === player
    )
}

export function pieceBelongsToActivePlayer(pieceId) {
    const { activePlayer } = getState()

    return getPieceOwner(pieceId) === activePlayer
}

function chainLengthInDirection(player, originRow, originCol, direction) {
    let count = 0
    let neighbor
    let stillGoing = true
    let nextRow = originRow
    let nextCol = originCol

    do {
        neighbor = getNeighbor(nextRow, nextCol, direction)
        stillGoing = getPieceOwner(neighbor.state) === player

        if (stillGoing) {
            count++
            nextRow = neighbor.row
            nextCol = neighbor.col
        }
    } while (stillGoing)

    return count
}

function getNeighbor(row, col, direction) {
    const rowAdder =
        direction === directions.UP ? -1 : direction === directions.DOWN ? 1 : 0
    const colAdder =
        direction === directions.LEFT
            ? -1
            : direction === directions.RIGHT
            ? 1
            : 0

    const neighborRow = row + rowAdder
    const neighborCol = col + colAdder
    return {
        row: neighborRow,
        col: neighborCol,
        state: readBoard(neighborRow, neighborCol),
    }
}

function areNeighbors(row1, col1, row2, col2) {
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
}

function getFreeSpaces() {
    const { boardState } = getState()

    return Object.keys(boardState.main).filter(boardLoc => {
        boardState.main[boardLoc] === 0
    })
}

function pieceIsOnMainSection(id) {
    const { boardState } = getState()

    return Object.values(boardState.main).includes(id)
}

function getPieceOwner(pieceId) {
    if (pieceId > 0 && pieceId < 13) return players.P1
    else if (pieceId > 12) return players.P2
}

function coordsFromKey(key) {
    return key.split(",").map(s => Number(s))
}

function coordsToKey(row, col) {
    return row + "," + col
}
