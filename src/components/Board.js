import React, { useRef, useEffect } from "react"
import { useStore, setState, getState } from "../store"
import {
    mousePos,
    gameStates,
    sections,
    players,
    messages,
} from "../lib/global"
import isEmpty from "lodash.isempty"
import isNil from "lodash.isnil"
import debounce from "lodash.debounce"
import Announcer from "./Announcer"
import Piece from "./Piece"
import PlayerText from "./PlayerText"
import Cannon from "./Cannon"
import Crosshair from "./Crosshair"
import {
    readBoard,
    findLocationWithPiece,
    isMoveLegal,
    pieceCanBeLifted,
    moveMakes3InARow,
    allSidePiecesPlayed,
    pieceBelongsToActivePlayer,
} from "../lib/boardQueries"
import { generateAIMove } from "../lib/ai"

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
        activePlayer,
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
    const overlayRef = useRef(null)

    const announcementXPos = !isNil(boardRef.current)
        ? boardRef.current.offsetWidth / 2
        : 0
    const destroyMode = gameState === gameStates.DESTROY

    useEffect(generalInit, [])
    useEffect(() => setUpResizeBehavior(boardRef), [boardRef.current])
    useEffect(
        () => setState({ overlayElement: overlayRef.current }),
        [overlayRef.current]
    )

    return (
        <>
            <canvas className="overlay-canvas" ref={overlayRef} />
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
                {renderPieces(gameState, aiMakingMove, aiSelection).concat(
                    renderSpots(
                        boardMetrics,
                        activePlayer,
                        effects,
                        pickedUpPiece,
                        selectedBoardPos
                    )
                )}
            </div>
        </>
    )
}

function generalInit() {
    // modify console.error to show message in-component
    // const oldErrorFunc = console.error
    // console.error = (...args) => {
    //     oldErrorFunc(args)
    //     const message = args.reduce((accum, next) => {
    //         return accum + next
    //     })
    //     setState({ errorMessage: message })
    // }

    const trackMousePos = e => {
        mousePos.x = e.clientX
        mousePos.y = e.clientY
    }
    window.addEventListener("mousemove", trackMousePos)

    // dispay opening messages
    setState({
        announcement: messages.gameStart,
    })
    setTimeout(() => {
        setState({
            announcement: messages.dropPhase,
        })
    }, 1750)

    return () => window.removeEventListener("mousemove", trackMousePos)
}

function renderPieces(gameState, aiMakingMove, aiSelection) {
    const pieces = {}

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 6; j++) {
            const id = readBoard(i, j, sections.MAIN)
            pieces[id] = renderPieceAtSlot(
                i,
                j,
                sections.MAIN,
                gameState,
                aiMakingMove,
                aiSelection
            )
        }
    }

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            const leftId = readBoard(i, j, sections.LEFT)
            const rightId = readBoard(i, j, sections.RIGHT)

            pieces[leftId] = renderPieceAtSlot(
                i,
                j,
                sections.LEFT,
                gameState,
                aiMakingMove,
                aiSelection
            )
            pieces[rightId] = renderPieceAtSlot(
                i,
                j,
                sections.RIGHT,
                gameState,
                aiMakingMove,
                aiSelection
            )
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

function renderSpots(
    boardMetrics,
    activePlayer,
    effects,
    pickedUpPiece,
    selectedBoardPos
) {
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

                if (i === selectedBoardPos.row && j === selectedBoardPos.col) {
                    filterStr = effects
                        ? `drop-shadow(0px 0px 0.75rem ${
                              legal ? "#0f9" : "#f01"
                          })`
                        : ""
                    bgColor = "#4e504e"
                } else if (readBoard(i, j) === 0) {
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
                            {readBoard(i, j)}
                        </span>
                    )}
                </div>
            )
        }
    }

    return spots
}

function renderPieceAtSlot(
    row,
    col,
    section,
    gameState,
    aiMakingMove,
    aiSelection
) {
    const { boardMetrics } = getState()

    let spotState = readBoard(row, col, section)

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
                pieceDroppedFunc={pieceId => pieceDropped(pieceId)}
                piecePickedUpFunc={pieceId => piecePickedUp(pieceId)}
                pieceDraggedFunc={(mouseX, mouseY) => {
                    pieceDragged(mouseX, mouseY)
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

async function aiTurnWithDuration() {
    const { activePlayer, gameState } = getState()

    setState({
        aiMakingMove: true,
    })
    await pause(AI_MOVE_DELAY(gameState))

    const move = generateAIMove(activePlayer, gameState)

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
        movePieceTo(move.row, move.col, move.pieceId)
    }

    await pause(AI_ANIM_TIME(gameState))
    finishTurn(makes3InARow)
}

function finishTurn(made3InARow = false) {
    const { gameState, activePlayer } = getState()

    let nextGameState
    const enterDestroyState = made3InARow && gameState === gameStates.MOVE

    if (enterDestroyState) {
        nextGameState = gameStates.DESTROY
    } else {
        nextGameState = allSidePiecesPlayed()
            ? gameStates.MOVE
            : gameStates.DROP
    }

    let announcement
    if (nextGameState === gameStates.DESTROY) {
        announcement = messages.destroyPhase
    } else {
        announcement =
            nextGameState === gameStates.DROP
                ? messages.dropPhase
                : messages.movePhase
    }

    let nextPlayer = activePlayer === players.P1 ? players.P2 : players.P1

    if (enterDestroyState) {
        // same player makes another move if they got 3 in a row
        nextPlayer = activePlayer
    } else {
        setState({
            activePlayer: nextPlayer,
        })
    }

    setState({
        gameState: nextGameState,
        announcement,
        aiMakingMove: false,
    })

    handleStateTransition(gameState, nextGameState)

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

function handleAIToggle(useAI, player) {
    const { activePlayer, aiMakingMove } = getState()
    const aiPlayerKey = player === players.P2 ? "p2AI" : "p1AI"

    setState({
        [aiPlayerKey]: useAI,
    })

    if (useAI && activePlayer === player && !aiMakingMove) {
        aiTurnWithDuration()
    }
}

function movePieceTo(newRow, newCol, pieceId) {
    const oldLocation = findLocationWithPiece(pieceId)

    // Note: the complex way we're dealing with the two calls to setSpotState
    // is necessary since we need the two state updates involved to be batched
    // in order for piece-moving animation to work correctly

    const updatedState = setSpotState(
        oldLocation.row,
        oldLocation.col,
        0,
        oldLocation.section,
        true
    )

    setSpotState(newRow, newCol, pieceId, sections.MAIN, false, updatedState)
}

function isAI(player) {
    const { p1AI, p2AI } = getState()

    return (player === players.P1 && p1AI) || (player === players.P2 && p2AI)
}

function piecePickedUp(id) {
    setState({
        pickedUpPiece: id,
    })
}

function pieceDropped(pieceId) {
    const { activePlayer, gameState, selectedBoardPos } = getState()

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
        movePieceTo(row, col, pieceId)
        finishTurn(moveMakes3InARow(row, col, activePlayer, lastRow, lastCol))
    }
}

function destroyPiece(pieceId) {
    const { row, col } = findLocationWithPiece(pieceId)
    setSpotState(row, col, 0)
}

function pieceDragged(mouseX, mouseY) {
    const { boardMetrics, selectedBoardPos } = getState()

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

function setSpotState(
    row,
    col,
    spotState,
    section = sections.MAIN,
    defer = false, // i.e. don't actually update the state right now
    theBoardState
) {
    if (isNil(theBoardState)) {
        const { boardState } = getState()
        theBoardState = boardState
    }

    const sectionState = theBoardState[section]
    const newBoardState = {
        ...theBoardState,
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

function setUpResizeBehavior(boardRef) {
    if (isNil(boardRef.current)) {
        return
    }

    const onResize = () => {
        const { width, height, centerStartX, centerEndX, centerGap } =
            getBoardDimensions()

        const bcRect = boardRef.current.getBoundingClientRect()

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
    window.addEventListener("resize", debouncedResize)
    window.addEventListener("deviceorientation", debouncedResize, true)

    onResize()

    return () => {
        window.removeEventListener("deviceorientation", debouncedResize, true)
        window.removeEventListener("resize", debouncedResize)
    }
}

export default Board
