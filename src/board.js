import React, { useRef, useEffect, useMemo } from "react"
import debounce from "lodash.debounce"
import Announcer from "./Announcer"
import Piece from "./Piece"
import PlayerText from "./PlayerText"
import isEmpty from "lodash.isempty"
import {
    mousePos,
    gameStates,
    sections,
    players,
    directions,
    messages,
} from "./global"
import Cannon from "./Cannon"
import Crosshair from "./Crosshair"
import { useStore, setState } from "./store"
import isNil from "lodash.isnil"

const showDebugState = false
const fastForwardAI = true

const AI_MOVE_DELAY = gameState =>
    gameState === gameStates.DROP && fastForwardAI ? 40 : 1200
const AI_ANIM_TIME = gameState =>
    gameState === gameStates.DROP && fastForwardAI ? 40 : 1000

const pause = duration => {
    return new Promise(resolve => {
        setTimeout(resolve, duration)
    })
}

function Board({}) {
    const {
        gameState,
        boardState,
        activePlayer,
        p1AI,
        p2AI,
        aiMakingMove,
        aiSelection,
        selectedBoardPos,
        pickedUpPiece,
        effects,
        boardMetrics,
        errorMessage,
        announcement,
    } = useStore()

    const boardRef = useRef(null)

    const announcementXPos = !isNil(boardRef.current)
        ? boardRef.current.offsetWidth / 2
        : 0
    const destroyMode = gameState === gameStates.DESTROY

    // general initialization
    useEffect(() => {
        // modify console.error to show message in-component
        const oldErrorFunc = console.error
        console.error = (...args) => {
            oldErrorFunc(args)
            const message = args.reduce((accum, next) => {
                return accum + next
            })
            setState({ errorMessage: message })
        }
        window.addEventListener("mousemove", e => {
            mousePos.x = e.clientX
            mousePos.y = e.clientY
        })

        // dispay opening messages
        setState({
            announcement: messages.gameStart,
        })
        setTimeout(() => {
            setState({
                announcement: messages.dropPhase,
            })
        }, 1750)
    }, [])

    // set up resize behavior
    useEffect(() => {
        if (isNil(boardRef.current)) {
            return
        }

        const onResize = () => {
            const { width, height, centerStartX, centerEndX, centerGap } =
                getBoardDimensions()

            const bcRect = boardRef.current.getBoundingClientRect()
            console.log("BCRECT", bcRect)

            setState({
                boardMetrics: {
                    x: bcRect.x,
                    y: bcRect.y,
                    width,
                    height,
                    centerStartX,
                    centerEndX,
                    centerGap,
                    spotSize: height / 6,
                },
            })
        }

        const debouncedResize = debounce(onResize, 60)
        window.onresize = debouncedResize
        window.addEventListener("deviceorientation", debouncedResize, true)

        onResize()
    }, [boardRef.current])

    async function movePieceTo(newRow, newCol, pieceId) {
        const oldLocation = findLocationWithPiece(pieceId)

        // Note: the complex way we're dealing with the two calls to setSpotState
        // is necessary since we can't count on React to batch the setState calls
        // involved, but they need to be batched in order for piece-moving
        // animation to work correctly

        const updatedBoardState = await setSpotState(
            oldLocation.row,
            oldLocation.col,
            0,
            oldLocation.section,
            true,
            boardState
        )

        setSpotState(
            newRow,
            newCol,
            pieceId,
            sections.MAIN,
            false,
            updatedBoardState
        )
    }

    function isAI(player) {
        return (
            (player === players.P1 && p1AI) || (player === players.P2 && p2AI)
        )
    }

    async function aiTurnWithDuration() {
        console.log("starting ai turn with duration: ", activePlayer)

        setState({
            aiMakingMove: true,
        })
        await pause(AI_MOVE_DELAY(gameState))

        const move = generateAIMove()

        setState({ aiSelection: { row: move.row, col: move.col } })

        const oldLocation = findLocationWithPiece(move.pieceId)
        const makes3InARow = moveMakes3InARow(
            move.row,
            move.col,
            activePlayer,
            oldLocation.row,
            oldLocation.col
        )

        if (gameState === gameStates.DESTROY) {
            destroyPiece(move.pieceId)
        } else {
            await movePieceTo(move.row, move.col, move.pieceId)
        }

        await pause(AI_ANIM_TIME(gameState))
        await finishTurn(makes3InARow)
    }

    function generateAIMove() {
        const player = activePlayer

        if (gameState === gameStates.DROP) {
            const pieceId = findUnplayedPiece(player)
            const legalMoves = getLegalMoves(player)

            const [row, col] =
                legalMoves[Math.floor(Math.random() * (legalMoves.length - 1))]

            return { pieceId, row, col }
        } else if (gameState === gameStates.MOVE) {
            const playerPieces = getPlayerPieces(player)

            const scoredMoves = playerPieces.reduce((allMoves, pieceId) => {
                const location = findLocationWithPiece(pieceId)
                const lastRow = location.row
                const lastCol = location.col

                const movesForPiece = getLegalMoves(player, lastRow, lastCol)

                return allMoves.concat(
                    movesForPiece.map(move => ({
                        pieceId,
                        lastCoords: [lastRow, lastCol],
                        row: move[0],
                        col: move[1],
                        score: scoreCandidateMove(
                            move[0],
                            move[1],
                            player,
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
            const legalMoves = getLegalMoves(player)
            const randIndex = Math.floor(
                Math.random() * (legalMoves.length - 1)
            )
            const [row, col] = legalMoves[randIndex]
            const pieceId = getSpotState(row, col)

            return { pieceId, row, col }
        }
    }

    function findUnplayedPiece(player) {
        const sideState =
            player === players.P1 ? boardState.lSide : boardState.rSide

        return Object.values(sideState).find(spotState => spotState !== 0)
    }

    function getPlayerPieces(player) {
        const spots = Object.values(boardState.lSide)
            .concat(Object.values(boardState.rSide))
            .concat(Object.values(boardState.main))

        return spots.filter(
            spotState => spotState !== 0 && getPieceOwner(spotState) === player
        )
    }

    function getFreeSpaces() {
        return Object.keys(boardState.main).filter(boardLoc => {
            boardState.main[boardLoc] === 0
        })
    }

    function handleAIToggle(useAI, player) {
        const aiPlayerKey = player === players.P2 ? "p2AI" : "p1AI"

        setState({
            [aiPlayerKey]: useAI,
        })

        if (useAI && activePlayer === player && !aiMakingMove) {
            aiTurnWithDuration()
        }
    }

    function finishTurn(made3InARow = false) {
        const lastState = gameState

        let gameState
        if (made3InARow) {
            gameState = gameStates.DESTROY
        } else {
            gameState = allSidePiecesPlayed()
                ? gameStates.MOVE
                : gameStates.DROP
        }

        let announcement
        if (gameState === gameStates.DESTROY) {
            announcement = messages.destroyPhase
        } else {
            announcement =
                gameState === gameStates.DROP
                    ? messages.dropPhase
                    : messages.movePhase
        }

        setState({
            gameState,
            announcement,
            aiMakingMove: false,
        })

        console.log("finishing turn for", activePlayer)

        let nextPlayer = activePlayer === players.P1 ? players.P2 : players.P1

        if (made3InARow) {
            // same player makes another move if they got 3 in a row
            nextPlayer = activePlayer
        } else {
            setState({
                activePlayer: nextPlayer,
            })
        }

        console.log("new active player", activePlayer)

        handleStateTransition(lastState, gameState)

        if (isAI(nextPlayer)) {
            aiTurnWithDuration()
        }
    }

    function handleStateTransition(oldState, newState) {
        if (newState === gameStates.DESTROY) {
            document.getElementsByTagName("body")[0].style.cursor = "none"
        } else {
            document.getElementsByTagName("body")[0].style.cursor = "default"
        }
    }

    function allSidePiecesPlayed() {
        const allPlayed = Object.values(boardState.lSide)
            .concat(Object.values(boardState.rSide))
            .reduce(
                (allZeros, pieceState) => pieceState === 0 && allZeros,
                true
            )

        return allPlayed
    }

    function piecePickedUp(id) {
        setState({
            pickedUpPiece: id,
        })
    }

    async function pieceDropped(pieceId) {
        setState({
            pickedUpPiece: null,
        })
        const { row, col } = selectedBoardPos
        let lastRow = -1
        let lastCol = -1

        if (gameState === gameStates.MOVE) {
            const oldLocation = findLocationWithPiece(pieceId)
            lastRow = oldLocation.row
            lastCol = oldLocation.col
        }

        if (isMoveLegal(row, col, activePlayer, lastRow, lastCol)) {
            await movePieceTo(row, col, pieceId)
            finishTurn(
                moveMakes3InARow(row, col, activePlayer, lastRow, lastCol)
            )
        }
    }

    function destroyPiece(pieceId) {
        const { row, col } = findLocationWithPiece(pieceId)
        setSpotState(row, col, 0)
    }

    function pieceDragged(boardMetrics, mouseX, mouseY) {
        const { row, col } = getSpotRowColForXY(
            boardMetrics,
            mouseX + boardMetrics.spotSize / 2,
            mouseY + boardMetrics.spotSize / 2
        )

        if (row !== selectedBoardPos.row || col !== selectedBoardPos.col) {
            setState({
                selectedBoardPos: {
                    row,
                    col,
                },
            })
        }
    }

    function findLocationWithPiece(pieceId) {
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

    function getLegalMoves(player, lastRow = -1, lastCol = -1) {
        return Object.keys(boardState.main)
            .map(key => coordsFromKey(key))
            .filter(coords => {
                const [row, col] = coords
                return isMoveLegal(row, col, player, lastRow, lastCol)
            })
    }

    function isMoveLegal(row, col, player, lastRow, lastCol) {
        const pieceId = getSpotState(row, col)
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

    function scoreCandidateMove(row, col, player, lastRow, lastCol) {
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

    function moveMakes3InARow(row, col, player, lastRow, lastCol) {
        const pieceAlreadyOnBoard = lastRow !== undefined
        const pieceId = pieceAlreadyOnBoard
            ? boardState.main[coordsToKey(lastRow, lastCol)]
            : -1

        // clear piece from its previous location
        if (pieceAlreadyOnBoard)
            boardState.main[coordsToKey(lastRow, lastCol)] = -1

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
            direction === directions.UP
                ? -1
                : direction === directions.DOWN
                ? 1
                : 0
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
            state: getSpotState(neighborRow, neighborCol),
        }
    }

    function areNeighbors(row1, col1, row2, col2) {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
    }

    function getSpotState(row, col, section = sections.MAIN) {
        return boardState[section][row + "," + col]
    }

    async function setSpotState(
        row,
        col,
        spotState,
        section = sections.MAIN,
        defer = false, // i.e. don't actually update the state right now
        boardState = boardState
    ) {
        const sectionState = boardState[section]
        const newBoardState = {
            ...boardState,
            [section]: {
                ...sectionState,
                [row + "," + col]: spotState,
            },
        }

        if (defer) {
            return newBoardState
        } else {
            setState({
                boardState: newBoardState,
            })
        }
    }

    function renderPieces() {
        const pieces = {}

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const id = getSpotState(i, j, sections.MAIN)
                pieces[id] = renderPieceAtSlot(i, j, sections.MAIN)
            }
        }

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                const leftId = getSpotState(i, j, sections.LEFT)
                const rightId = getSpotState(i, j, sections.RIGHT)

                pieces[leftId] = renderPieceAtSlot(i, j, sections.LEFT)
                pieces[rightId] = renderPieceAtSlot(i, j, sections.RIGHT)
            }
        }

        const copy = Object.keys(pieces).slice()

        // I am not clear on why it's necessary to sort the pieces in this way,
        // but I can say it resolves an animation bug (piece would jump immediately
        // to its destination instead of animating)
        //
        // I've noticed since originally writing this that the bug is resolved even if
        // we skip sorting here. However, I'm keeping it because I believe the issue is related
        // to order and when we skip sorting the current order happens to work but it's unknown why.
        copy.sort((a, b) => a - b)

        return copy.map(key => pieces[key])
    }

    function renderSpots() {
        const spots = []
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const { x, y } = getSpotPos(boardMetrics, i, j, sections.MAIN)
                const margin = boardMetrics.spotSize * 0.15
                const transformString = `translate(${x + margin / 2}px, ${
                    y + margin / 2
                }px)`

                let bgColor = "#222"
                let filterStr = ""
                let border = "none"

                if (pickedUpPiece) {
                    const location = findLocationWithPiece(pickedUpPiece)
                    const legal = isMoveLegal(
                        i,
                        j,
                        activePlayer,
                        location.row,
                        location.col
                    )

                    if (
                        i === selectedBoardPos.row &&
                        j === selectedBoardPos.col
                    ) {
                        filterStr = effects
                            ? `drop-shadow(0px 0px 0.75rem ${
                                  legal ? "#0f9" : "#f01"
                              })`
                            : ""
                        bgColor = "#4e504e"
                    } else if (getSpotState(i, j) === 0) {
                        if (legal) {
                            border = "1px solid #258542"
                        } else {
                            border = "2px solid #af2121"
                        }
                    }
                }

                spots.push(
                    <div
                        key={i + "," + j + "_spot"}
                        className="spot"
                        style={{
                            backgroundColor: bgColor,
                            transform: transformString,
                            width: boardMetrics.spotSize - margin,
                            height: boardMetrics.spotSize - margin,
                            filter: filterStr,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            transition: "border 200ms ease-out",
                            border,
                        }}
                    >
                        {showDebugState && (
                            <span
                                style={{
                                    color: "white",
                                    fontSize: "1rem",
                                    zIndex: 12,
                                }}
                            >
                                {getSpotState(i, j)}
                            </span>
                        )}
                    </div>
                )
            }
        }

        return spots
    }

    function renderPieceAtSlot(row, col, section) {
        let spotState = getSpotState(row, col, section)

        if (spotState === 0) return null
        else {
            const id = spotState
            const pos = getSpotPos(boardMetrics, row, col, section)

            const pieceMargin = boardMetrics.spotSize * 0.25
            const pieceSize = boardMetrics.spotSize - pieceMargin

            pos.x += pieceMargin / 2
            pos.y += pieceMargin / 2

            return (
                <Piece
                    key={id}
                    id={id}
                    gameState={gameState}
                    pos={pos}
                    size={pieceSize}
                    x
                    boardPos={{ x: boardMetrics.x, y: boardMetrics.y }}
                    pieceDroppedFunc={pieceDropped}
                    piecePickedUpFunc={piecePickedUp}
                    pieceDraggedFunc={(mouseX, mouseY) => {
                        pieceDragged(boardMetrics, mouseX, mouseY)
                    }}
                    pieceCanBeLifted={pieceCanBeLifted}
                    destroyPiece={pieceId => {
                        destroyPiece(pieceId)
                        finishTurn()
                    }}
                    destroyable={
                        gameState === gameStates.DESTROY &&
                        !pieceBelongsToActivePlayer(id)
                    }
                    hidden={
                        gameState === gameStates.DESTROY &&
                        pieceBelongsToActivePlayer(id)
                    }
                    drawAIHand={
                        aiSelection.row === row &&
                        aiSelection.col === col &&
                        (gameState === gameStates.DROP ||
                            gameState === gameStates.MOVE) &&
                        aiMakingMove &&
                        section === sections.MAIN // This is going to be an issue for showing the AI hand over side pieces before moving
                    }
                />
            )
        }
    }

    function pieceCanBeLifted(id) {
        if (gameState === gameStates.DROP) {
            return pieceBelongsToActivePlayer(id) && !pieceIsOnMainSection(id)
        } else if (gameState === gameStates.MOVE) {
            return pieceBelongsToActivePlayer(id)
        }
    }

    function pieceBelongsToActivePlayer(pieceId) {
        return getPieceOwner(pieceId) === activePlayer
    }

    function pieceIsOnMainSection(id) {
        return Object.values(boardState.main).includes(id)
    }

    return (
        <>
            {destroyMode && (
                <Crosshair
                    aiMakingMove={aiMakingMove}
                    aiSelection={aiSelection}
                />
            )}
            <Cannon hPos="left" vPos="top" deployed={destroyMode} />
            <Cannon hPos="right" vPos="top" deployed={destroyMode} />
            <Cannon hPos="right" vPos="bottom" deployed={destroyMode} />
            <Cannon hPos="left" vPos="bottom" deployed={destroyMode} />
            <div
                ref={boardRef}
                id="board"
                className="no-select"
                style={{
                    width: boardMetrics.width + "px",
                    height: boardMetrics.height + "px",
                }}
            >
                {!isEmpty(errorMessage) && (
                    <div className="error-message">{errorMessage}</div>
                )}
                <Announcer
                    text={announcement}
                    xPos={announcementXPos}
                    swipeOut={announcement === messages.gameStart}
                />{" "}
                <div className="player-text-container">
                    <PlayerText
                        text={"Player 1"}
                        isPlayer1
                        highlight={activePlayer === players.P1}
                        setUseAI={useAI => handleAIToggle(useAI, players.P1)}
                    />
                    <PlayerText
                        text={"Player 2"}
                        highlight={activePlayer === players.P2}
                        boardRightX={boardMetrics.x + boardMetrics.width}
                        setUseAI={useAI => handleAIToggle(useAI, players.P2)}
                    />
                </div>
                {renderPieces().concat(renderSpots())}
            </div>
        </>
    )
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

function getBoardDimensions() {
    const app = document.getElementById("app")

    // (vertical_pieces / horizontal_pieces) - 2.5% of width gap size between center and each side area
    const aspectRatio = 6 / (6 + 4) - 0.05

    let width = app.offsetWidth * 0.85
    let noGapWidth = app.offsetWidth * 0.8
    let height = width * aspectRatio

    if (height > app.offsetHeight * 0.6) {
        height = app.offsetHeight * 0.6
        width = height / aspectRatio
        noGapWidth = height / (aspectRatio + 0.05)
    }

    const gap = (width - noGapWidth) / 2

    const centerStartX = noGapWidth * (2 / 10) + gap
    const centerEndX = centerStartX + noGapWidth * (6 / 10)

    return {
        width,
        height,
        centerStartX,
        centerEndX,
        centerGap: gap,
    }
}

function getSpotPos(boardMetrics, row, col, section) {
    switch (section) {
        case sections.MAIN:
            return getMainSpotPos(boardMetrics, row, col)
        case sections.LEFT:
            return getSideSpotPos(boardMetrics, true, row, col)
        case sections.RIGHT:
            return getSideSpotPos(boardMetrics, false, row, col)
        default:
            throw "unknown section: " + section
    }
}

function getMainSpotPos(boardMetrics, row, col) {
    const x = boardMetrics.centerStartX
    const y = boardMetrics.spotSize / 2

    return {
        x: x + col * boardMetrics.spotSize,
        y: y + row * boardMetrics.spotSize,
    }
}

function getSideSpotPos(boardMetrics, leftSide, row, col) {
    const x = leftSide ? 0 : boardMetrics.centerEndX + boardMetrics.centerGap
    const y = 0

    return {
        x: x + col * boardMetrics.spotSize,
        y: y + row * boardMetrics.spotSize,
    }
}

function getSpotRowColForXY(boardMetrics, x, y) {
    x -= boardMetrics.centerStartX
    y -= boardMetrics.spotSize / 2

    const col = Math.floor(x / boardMetrics.spotSize)
    const row = Math.floor(y / boardMetrics.spotSize)

    return {
        row,
        col,
    }
}

export default Board
